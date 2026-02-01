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

type ContainerDraft = {
  id: string;
  image: string;
  ports: string;
  envVars: EnvVar[];
};

const parsePorts = (portsString: string): number[] => {
  return portsString
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => parseInt(segment, 10))
    .filter((port) => !isNaN(port) && port > 0 && port <= 65535);
};

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

function ContainerEditor({
  container,
  onChange,
  onRemove,
}: {
  container: ContainerDraft;
  onChange: (updated: ContainerDraft) => void;
  onRemove: () => void;
}) {
  const styles = containerEditor();

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

  return (
    <div className={styles.root()}>
      <div className={styles.header()}>
        <span className={styles.title()}>Container</span>
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
    </div>
  );
}

export function ProjectCreate() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [containers, setContainers] = useState<ContainerDraft[]>([]);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddContainer = () => {
    setContainers([...containers, { id: crypto.randomUUID(), image: "", ports: "", envVars: [] }]);
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
        systemPrompt: systemPrompt.trim() || undefined,
      });

      for (const containerDraft of containers) {
        await api.containers.create(project.id, {
          image: containerDraft.image.trim(),
          ports: parsePorts(containerDraft.ports),
        });
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
            {containers.map((container) => (
              <ContainerEditor
                key={container.id}
                container={container}
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
