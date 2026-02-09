export interface ContainerNode {
  id: string;
  dependsOn: string[];
}

export interface StartLevel {
  level: number;
  containerIds: string[];
}

export class CircularDependencyError extends Error {
  public readonly cycle: string[];

  constructor(cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(" -> ")}`);
    this.name = "CircularDependencyError";
    this.cycle = cycle;
  }
}

interface DependencyGraph {
  nodeMap: Map<string, ContainerNode>;
  inDegree: Map<string, number>;
  dependents: Map<string, string[]>;
}

function buildDependencyGraph(containers: ContainerNode[]): DependencyGraph {
  const nodeMap = new Map<string, ContainerNode>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const container of containers) {
    nodeMap.set(container.id, container);
    inDegree.set(container.id, 0);
    dependents.set(container.id, []);
  }

  for (const container of containers) {
    for (const depId of container.dependsOn) {
      if (!nodeMap.has(depId)) {
        continue;
      }

      const currentDegree = inDegree.get(container.id) || 0;
      inDegree.set(container.id, currentDegree + 1);

      const depDependents = dependents.get(depId);
      if (depDependents) {
        depDependents.push(container.id);
      }
    }
  }

  return { nodeMap, inDegree, dependents };
}

function getInitialLevel(
  containers: ContainerNode[],
  inDegree: Map<string, number>
): string[] {
  return containers
    .filter((container) => inDegree.get(container.id) === 0)
    .map((container) => container.id);
}

function computeNextLevel(
  currentLevelIds: string[],
  dependents: Map<string, string[]>,
  inDegree: Map<string, number>
): string[] {
  const nextLevel: string[] = [];

  for (const id of currentLevelIds) {
    const idDependents = dependents.get(id) || [];
    for (const dependent of idDependents) {
      const currentDependentDegree = inDegree.get(dependent) || 0;
      const newDegree = currentDependentDegree - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        nextLevel.push(dependent);
      }
    }
  }

  return nextLevel;
}

function buildLevelsRecursively(
  currentLevelIds: string[],
  levelNumber: number,
  dependents: Map<string, string[]>,
  inDegree: Map<string, number>,
  processed: Set<string>
): StartLevel[] {
  if (currentLevelIds.length === 0) {
    return [];
  }

  for (const id of currentLevelIds) {
    processed.add(id);
  }

  const currentLevel: StartLevel = {
    level: levelNumber,
    containerIds: currentLevelIds,
  };
  const nextLevelIds = computeNextLevel(currentLevelIds, dependents, inDegree);
  const remainingLevels = buildLevelsRecursively(
    nextLevelIds,
    levelNumber + 1,
    dependents,
    inDegree,
    processed
  );

  return [currentLevel, ...remainingLevels];
}

/**
 * Resolves container startup order using Kahn's algorithm for topological sort.
 * Groups containers into levels where all containers in a level can start in parallel.
 *
 * @param containers - Array of containers with their dependencies
 * @returns Array of StartLevel objects ordered by startup sequence
 * @throws CircularDependencyError if a cycle is detected
 */
export function resolveStartOrder(containers: ContainerNode[]): StartLevel[] {
  if (containers.length === 0) {
    return [];
  }

  const { inDegree, dependents } = buildDependencyGraph(containers);
  const processed = new Set<string>();

  const initialLevel = getInitialLevel(containers, inDegree);
  const levels = buildLevelsRecursively(
    initialLevel,
    0,
    dependents,
    inDegree,
    processed
  );

  if (processed.size !== containers.length) {
    const cycle = findCycle(containers, processed);
    throw new CircularDependencyError(cycle);
  }

  return levels;
}

function buildDependencyMapForUnprocessed(
  containers: ContainerNode[],
  processed: Set<string>
): Map<string, string[]> {
  const unprocessed = containers.filter(
    (container) => !processed.has(container.id)
  );
  const dependencyMap = new Map<string, string[]>();

  for (const container of unprocessed) {
    dependencyMap.set(
      container.id,
      container.dependsOn.filter((dep) => !processed.has(dep))
    );
  }

  return dependencyMap;
}

function findCycleWithDFS(
  startId: string,
  dependencyMap: Map<string, string[]>,
  visited: Set<string>,
  path: string[]
): string[] | null {
  if (path.includes(startId)) {
    const cycleStart = path.indexOf(startId);
    return [...path.slice(cycleStart), startId];
  }

  if (visited.has(startId)) {
    return null;
  }

  visited.add(startId);
  const newPath = [...path, startId];

  const deps = dependencyMap.get(startId) || [];
  for (const dep of deps) {
    const result = findCycleWithDFS(dep, dependencyMap, visited, newPath);
    if (result) {
      return result;
    }
  }

  return null;
}

function findCycle(
  containers: ContainerNode[],
  processed: Set<string>
): string[] {
  const dependencyMap = buildDependencyMapForUnprocessed(containers, processed);
  const unprocessed = containers.filter(
    (container) => !processed.has(container.id)
  );
  const visited = new Set<string>();

  for (const container of unprocessed) {
    const result = findCycleWithDFS(container.id, dependencyMap, visited, []);
    if (result) {
      return result;
    }
  }

  return unprocessed.map((container) => container.id);
}
