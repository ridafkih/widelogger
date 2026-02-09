"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { tv } from "tailwind-variants";
import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { ContainerCard } from "@/components/settings/container-card";
import { api } from "@/lib/api";
import { useProjects } from "@/lib/hooks";

const containersSection = tv({
  base: "flex flex-col gap-2",
});

const listSectionEmpty = tv({
  base: "text-text-muted text-xs",
});

function SettingsFormField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: projects } = useProjects();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const project = projects?.find((proj) => proj.id === projectId);

  useEffect(() => {
    if (project) {
      setDescription(project.description ?? "");
      setSystemPrompt(project.systemPrompt ?? "");
    }
  }, [project]);

  const hasChanges =
    project &&
    (description !== (project.description ?? "") ||
      systemPrompt !== (project.systemPrompt ?? ""));

  if (!project) {
    return (
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex max-w-sm flex-col gap-1">
          <span className="text-text-muted text-xs">Project not found</span>
        </div>
      </div>
    );
  }

  const containers = project.containers ?? [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.projects.update(projectId, {
        description: description || undefined,
        systemPrompt: systemPrompt || undefined,
      });
      await mutate("projects");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await api.projects.delete(projectId);
      await mutate("projects");
      router.push("/settings/projects");
    } catch {
      setIsArchiving(false);
    }
  };

  const handleWorkspaceChange = () => mutate("projects");

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex max-w-sm flex-col gap-2">
        <SettingsFormField>
          <FormInput.Label>Project Name</FormInput.Label>
          <FormInput.Text readOnly value={project.name} />
        </SettingsFormField>

        <SettingsFormField>
          <FormInput.Label>Description</FormInput.Label>
          <FormInput.Text
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Project description"
            value={description}
          />
        </SettingsFormField>

        <SettingsFormField>
          <FormInput.Label>System Prompt</FormInput.Label>
          <FormInput.Textarea
            onChange={(event) => setSystemPrompt(event.target.value)}
            placeholder="System prompt for orchestration"
            rows={3}
            value={systemPrompt}
          />
        </SettingsFormField>

        <div className={containersSection()}>
          <span className="text-text-secondary text-xs">Containers</span>
          {containers.length === 0 && (
            <span className={listSectionEmpty()}>No containers configured</span>
          )}
          {containers.length > 0 && (
            <div className="flex flex-col gap-2">
              {containers.map((container) => (
                <ContainerCard.Provider
                  allContainers={containers}
                  container={container}
                  key={container.id}
                  onWorkspaceChange={handleWorkspaceChange}
                  projectId={projectId}
                >
                  <ContainerCard.Frame>
                    <ContainerCard.Header>
                      <ContainerCard.Title />
                    </ContainerCard.Header>
                    <ContainerCard.Image />
                    <ContainerCard.Ports />
                    <ContainerCard.Dependencies />
                    <ContainerCard.Actions>
                      <ContainerCard.WorkspaceToggle />
                    </ContainerCard.Actions>
                  </ContainerCard.Frame>
                </ContainerCard.Provider>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button disabled={isSaving || !hasChanges} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            disabled={isArchiving}
            onClick={handleArchive}
            variant="danger"
          >
            {isArchiving ? "Archiving..." : "Archive"}
          </Button>
        </div>
      </div>
    </div>
  );
}
