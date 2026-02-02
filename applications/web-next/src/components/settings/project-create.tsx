"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { ArrowLeft, Plus, X } from "lucide-react";
import { tv } from "tailwind-variants";
import { FormInput, InputGroup } from "@/components/form-input";
import { api } from "@/lib/api";

const backButton = tv({
  base: "flex items-center gap-1.5 text-xs text-text-muted hover:text-text",
});

const primaryButton = tv({
  base: "self-start px-2 py-1 text-xs bg-bg-muted border border-border text-text hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed",
});

const addLinkButton = tv({
  base: "flex items-center gap-1 text-xs text-text-muted hover:text-text self-start",
});

const containersSection = tv({
  base: "flex flex-col gap-2",
});

const listSectionHeader = tv({
  slots: {
    root: "flex items-center justify-between",
    label: "text-xs text-text-secondary",
    addButton: "flex items-center gap-1 text-xs text-text-muted hover:text-text",
  },
});

const listSectionContent = tv({
  base: "flex flex-col gap-2",
});

const listSectionEmpty = tv({
  base: "text-xs text-text-muted",
});

const containerEditor = tv({
  slots: {
    root: "flex flex-col gap-2 p-2 border border-border bg-bg-muted",
    header: "flex items-center justify-between",
    title: "text-xs text-text-secondary",
    removeButton: "text-text-muted hover:text-text",
    envSection: "flex flex-col gap-1.5",
  },
});

type EnvVar = {
  id: string;
  key: string;
  value: string;
};

type DependencyDraft = {
  id: string;
  dependsOnDraftId: string;
  condition: string;
};

type ContainerDraft = {
  id: string;
  image: string;
  ports: string;
  envVars: EnvVar[];
  dependencies: DependencyDraft[];
};

const parsePorts = (portsString: string): number[] => {
  return portsString
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => parseInt(segment, 10))
    .filter((port) => !isNaN(port) && port > 0 && port <= 65535);
};

function sortContainersByDependencies(containers: ContainerDraft[]): ContainerDraft[] {
  const sorted: ContainerDraft[] = [];
  const remaining = new Set(containers.map((container) => container.id));
  const containerMap = new Map(containers.map((container) => [container.id, container]));

  while (remaining.size > 0) {
    let addedAny = false;

    for (const id of remaining) {
      const container = containerMap.get(id);
      if (!container) continue;

      const unresolvedDeps = container.dependencies.filter(
        (dependency) =>
          dependency.dependsOnDraftId && remaining.has(dependency.dependsOnDraftId),
      );

      if (unresolvedDeps.length === 0) {
        sorted.push(container);
        remaining.delete(id);
        addedAny = true;
      }
    }

    if (!addedAny && remaining.size > 0) {
      for (const id of remaining) {
        const container = containerMap.get(id);
        if (container) sorted.push(container);
      }
      break;
    }
  }

  return sorted;
}

function SettingsFormField({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function ListSectionHeader({
  label,
  onAdd,
  addLabel,
  iconSize = 12,
}: {
  label: string;
  onAdd: () => void;
  addLabel: string;
  iconSize?: number;
}) {
  const styles = listSectionHeader();

  return (
    <div className={styles.root()}>
      <span className={styles.label()}>{label}</span>
      <button type="button" onClick={onAdd} className={styles.addButton()}>
        <Plus size={iconSize} />
        {addLabel}
      </button>
    </div>
  );
}

function ListSectionContent({
  items,
  emptyText,
  children,
}: {
  items: unknown[];
  emptyText: string;
  children: ReactNode;
}) {
  if (items.length === 0) {
    return <span className={listSectionEmpty()}>{emptyText}</span>;
  }
  return <div className={listSectionContent()}>{children}</div>;
}

function EnvVarRow({
  envVar,
  onChange,
  onRemove,
}: {
  envVar: EnvVar;
  onChange: (updated: EnvVar) => void;
  onRemove: () => void;
}) {
  return (
    <InputGroup.Root>
      <InputGroup.Input
        value={envVar.key}
        onChange={(event) => onChange({ ...envVar, key: event.target.value })}
        placeholder="MY_ENV_VAR"
      />
      <InputGroup.Separator>=</InputGroup.Separator>
      <InputGroup.Input
        type="password"
        value={envVar.value}
        onChange={(event) => onChange({ ...envVar, value: event.target.value })}
      />
      <InputGroup.Action onClick={onRemove}>
        <X size={10} />
      </InputGroup.Action>
    </InputGroup.Root>
  );
}

function DependencyRow({
  dependency,
  availableContainers,
  onChange,
  onRemove,
}: {
  dependency: DependencyDraft;
  availableContainers: { id: string; label: string }[];
  onChange: (updated: DependencyDraft) => void;
  onRemove: () => void;
}) {
  const options = availableContainers.map((container) => ({
    value: container.id,
    label: container.label,
  }));

  return (
    <InputGroup.Root>
      <div className="flex-1">
        <FormInput.Select
          value={dependency.dependsOnDraftId}
          onChange={(value) => onChange({ ...dependency, dependsOnDraftId: value })}
          options={options}
          placeholder="Select container..."
        />
      </div>
      <InputGroup.Action onClick={onRemove}>
        <X size={10} />
      </InputGroup.Action>
    </InputGroup.Root>
  );
}

function getContainerLabel(container: ContainerDraft, index: number): string {
  if (container.image.trim()) {
    const imageName = container.image.split("/").pop() || container.image;
    return imageName.split(":")[0] || `Container ${index + 1}`;
  }
  return `Container ${index + 1}`;
}

function ContainerEditor({
  container,
  containerIndex,
  allContainers,
  onChange,
  onRemove,
}: {
  container: ContainerDraft;
  containerIndex: number;
  allContainers: ContainerDraft[];
  onChange: (updated: ContainerDraft) => void;
  onRemove: () => void;
}) {
  const styles = containerEditor();

  const availableContainers = allContainers
    .map((otherContainer, index) => ({
      id: otherContainer.id,
      label: getContainerLabel(otherContainer, index),
    }))
    .filter((otherContainer) => otherContainer.id !== container.id);

  const handleAddEnvVar = () => {
    onChange({
      ...container,
      envVars: [...container.envVars, { id: crypto.randomUUID(), key: "", value: "" }],
    });
  };

  const handleEnvVarChange = (id: string, updated: EnvVar) => {
    onChange({
      ...container,
      envVars: container.envVars.map((envVar) => (envVar.id === id ? updated : envVar)),
    });
  };

  const handleEnvVarRemove = (id: string) => {
    onChange({
      ...container,
      envVars: container.envVars.filter((envVar) => envVar.id !== id),
    });
  };

  const handleAddDependency = () => {
    onChange({
      ...container,
      dependencies: [
        ...container.dependencies,
        { id: crypto.randomUUID(), dependsOnDraftId: "", condition: "service_started" },
      ],
    });
  };

  const handleDependencyChange = (id: string, updated: DependencyDraft) => {
    onChange({
      ...container,
      dependencies: container.dependencies.map((dependency) =>
        dependency.id === id ? updated : dependency,
      ),
    });
  };

  const handleDependencyRemove = (id: string) => {
    onChange({
      ...container,
      dependencies: container.dependencies.filter((dependency) => dependency.id !== id),
    });
  };

  return (
    <div className={styles.root()}>
      <div className={styles.header()}>
        <span className={styles.title()}>{getContainerLabel(container, containerIndex)}</span>
        <button type="button" onClick={onRemove} className={styles.removeButton()}>
          <X size={12} />
        </button>
      </div>

      <SettingsFormField>
        <FormInput.Label>Image</FormInput.Label>
        <FormInput.Text
          value={container.image}
          onChange={(event) => onChange({ ...container, image: event.target.value })}
          placeholder="ghcr.io/org/image:tag"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Ports</FormInput.Label>
        <FormInput.Text
          value={container.ports}
          onChange={(event) => onChange({ ...container, ports: event.target.value })}
          placeholder="3000, 8080"
        />
        <FormInput.Helper>Comma-separated port numbers</FormInput.Helper>
      </SettingsFormField>

      <div className={styles.envSection()}>
        <ListSectionHeader
          label="Environment Variables"
          onAdd={handleAddEnvVar}
          addLabel="Add"
          iconSize={10}
        />
        <ListSectionContent items={container.envVars} emptyText="(None)">
          {container.envVars.map((envVar) => (
            <EnvVarRow
              key={envVar.id}
              envVar={envVar}
              onChange={(updated) => handleEnvVarChange(envVar.id, updated)}
              onRemove={() => handleEnvVarRemove(envVar.id)}
            />
          ))}
        </ListSectionContent>
      </div>

      {availableContainers.length > 0 && (
        <div className={styles.envSection()}>
          <ListSectionHeader
            label="Depends On"
            onAdd={handleAddDependency}
            addLabel="Add"
            iconSize={10}
          />
          <ListSectionContent items={container.dependencies} emptyText="(None)">
            {container.dependencies.map((dependency) => (
              <DependencyRow
                key={dependency.id}
                dependency={dependency}
                availableContainers={availableContainers}
                onChange={(updated) => handleDependencyChange(dependency.id, updated)}
                onRemove={() => handleDependencyRemove(dependency.id)}
              />
            ))}
          </ListSectionContent>
        </div>
      )}
    </div>
  );
}

export function ProjectCreate() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [containers, setContainers] = useState<ContainerDraft[]>([]);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddContainer = () => {
    setContainers([
      ...containers,
      { id: crypto.randomUUID(), image: "", ports: "", envVars: [], dependencies: [] },
    ]);
  };

  const handleContainerChange = (id: string, updated: ContainerDraft) => {
    setContainers(containers.map((container) => (container.id === id ? updated : container)));
  };

  const handleContainerRemove = (id: string) => {
    setContainers(containers.filter((container) => container.id !== id));
  };

  const isNameValid = name.trim().length > 0;
  const areContainersValid = containers.every((container) => container.image.trim().length > 0);
  const canSubmit = isNameValid && areContainersValid && !isCreating;

  const handleCreate = async () => {
    if (!canSubmit) return;

    setIsCreating(true);
    try {
      const project = await api.projects.create({
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
      });

      const sortedContainers = sortContainersByDependencies(containers);
      const draftIdToRealId = new Map<string, string>();

      for (const containerDraft of sortedContainers) {
        const validDependencies = containerDraft.dependencies
          .filter((dependency) => dependency.dependsOnDraftId)
          .map((dependency) => {
            const realId = draftIdToRealId.get(dependency.dependsOnDraftId);
            if (!realId) return null;
            return { containerId: realId, condition: dependency.condition };
          })
          .filter((dependency): dependency is { containerId: string; condition: string } =>
            dependency !== null,
          );

        const createdContainer = await api.containers.create(project.id, {
          image: containerDraft.image.trim(),
          ports: parsePorts(containerDraft.ports),
          dependsOn: validDependencies.length > 0 ? validDependencies : undefined,
        });

        draftIdToRealId.set(containerDraft.id, createdContainer.id);
      }

      await mutate("projects");
      router.push("/settings/projects");
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex flex-col gap-1 max-w-sm">
        <Link href="/settings/projects" className={backButton()}>
          <ArrowLeft size={12} />
          Back to projects
        </Link>

        <SettingsFormField>
          <FormInput.Label required>Project Name</FormInput.Label>
          <FormInput.Text
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="my-project"
          />
        </SettingsFormField>

        <SettingsFormField>
          <FormInput.Label>Description</FormInput.Label>
          <FormInput.Text
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A brief description of this project"
          />
          <FormInput.Helper>Used for task routing in orchestration</FormInput.Helper>
        </SettingsFormField>

        {showSystemPrompt ? (
          <SettingsFormField>
            <FormInput.Label>System Prompt</FormInput.Label>
            <FormInput.Textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="Context for the AI agent..."
              rows={4}
            />
            <FormInput.Helper>Context for the AI agent</FormInput.Helper>
          </SettingsFormField>
        ) : (
          <button
            type="button"
            onClick={() => setShowSystemPrompt(true)}
            className={addLinkButton()}
          >
            <Plus size={12} />
            Add system prompt
          </button>
        )}

        <div className={containersSection()}>
          <ListSectionHeader
            label="Containers"
            onAdd={handleAddContainer}
            addLabel="Add Container"
          />
          <ListSectionContent items={containers} emptyText="(No containers yet)">
            {containers.map((container, index) => (
              <ContainerEditor
                key={container.id}
                container={container}
                containerIndex={index}
                allContainers={containers}
                onChange={(updated) => handleContainerChange(container.id, updated)}
                onRemove={() => handleContainerRemove(container.id)}
              />
            ))}
          </ListSectionContent>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          className={primaryButton()}
        >
          {isCreating ? "Creating..." : "Create Project"}
        </button>
      </div>
    </div>
  );
}
