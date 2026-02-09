type FileChangeType = "modified" | "created" | "deleted";

export function getChangeType(before: string, after: string): FileChangeType {
  if (!before && after) {
    return "created";
  }
  if (before && !after) {
    return "deleted";
  }
  return "modified";
}
