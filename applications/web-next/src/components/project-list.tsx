import type { ReactNode } from "react";

type ProjectListProps = {
  children: ReactNode;
};

export function ProjectList({ children }: ProjectListProps) {
  return <div className="flex-1 overflow-y-auto">{children}</div>;
}
