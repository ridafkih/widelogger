import { ProjectsList } from "@/components/settings/projects-list";

function SettingsPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex flex-col gap-1 max-w-sm">{children}</div>
    </div>
  );
}

export default function ProjectsSettingsPage() {
  return (
    <SettingsPanel>
      <ProjectsList />
    </SettingsPanel>
  );
}
