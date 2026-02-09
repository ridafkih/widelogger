import { formatNetworkAlias, formatUniqueHostname } from "../shared/naming";

interface PortMappingResult {
  portMap: Record<number, number>;
  networkAliases: string[];
}

export function buildNetworkAliasesAndPortMap(
  sessionId: string,
  containerId: string,
  ports: { port: number }[]
): PortMappingResult {
  const portMap: Record<number, number> = {};
  const networkAliases: string[] = [];
  const uniqueHostname = formatUniqueHostname(sessionId, containerId);
  for (const { port } of ports) {
    portMap[port] = port;
    networkAliases.push(uniqueHostname);
    networkAliases.push(formatNetworkAlias(sessionId, port));
  }
  return { portMap, networkAliases };
}
