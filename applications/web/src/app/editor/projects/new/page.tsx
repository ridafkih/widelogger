"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heading } from "@lab/ui/components/heading";
import { Copy } from "@lab/ui/components/copy";
import { Button } from "@lab/ui/components/button";
import { Input } from "@lab/ui/components/input";
import { Textarea } from "@lab/ui/components/textarea";
import { FormField } from "@lab/ui/components/form-field";
import { Divider } from "@lab/ui/components/divider";
import { InputGroup, InputGroupIcon, InputGroupInput } from "@lab/ui/components/input-group";
import { Checkbox } from "@lab/ui/components/checkbox";
import { IconButton } from "@lab/ui/components/icon-button";
import { ActionGroup } from "@lab/ui/components/action-group";
import { EmptyState } from "@lab/ui/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lab/ui/components/table";
import { Wizard, WizardStep, useWizard } from "@lab/ui/components/wizard";
import { Plus, Container, Eye, EyeOff, Pencil, Trash2, Check, X, ChevronRight } from "lucide-react";
import { useCreateProject, useApiClient } from "@/lib/api";

interface ContainerData {
  id: string;
  image: string;
  ports: string[];
  envVars: { key: string; value: string }[];
  permissions: {
    readFiles: boolean;
    readWriteFiles: boolean;
    runBashCommands: boolean;
  };
}

function createEmptyContainer(): ContainerData {
  return {
    id: crypto.randomUUID(),
    image: "",
    ports: [],
    envVars: [],
    permissions: {
      readFiles: true,
      readWriteFiles: false,
      runBashCommands: false,
    },
  };
}

function ContainerCard({
  container,
  onClick,
  onDelete,
}: {
  container: ContainerData;
  onClick: () => void;
  onDelete: () => void;
}) {
  const summary = [
    container.ports.length > 0 &&
      `${container.ports.length} port${container.ports.length > 1 ? "s" : ""}`,
    container.envVars.length > 0 &&
      `${container.envVars.length} env var${container.envVars.length > 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <div
      className="flex items-center gap-3 p-3 border border-border cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <Container className="size-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <Copy size="sm" className="truncate block">
          {container.image || "Untitled container"}
        </Copy>
        {summary.length > 0 && (
          <Copy size="xs" muted className="truncate block">
            {summary.join(" · ")}
          </Copy>
        )}
      </div>
      <ActionGroup>
        <IconButton
          icon={<Trash2 />}
          label="Delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        />
        <ChevronRight className="size-4 text-muted-foreground" />
      </ActionGroup>
    </div>
  );
}

function ContainerListField({
  containers,
  onAdd,
  onSelect,
  onDelete,
}: {
  containers: ContainerData[];
  onAdd: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <FormField label="Containers" hint="Add containers to your project">
      <div className="flex flex-col gap-2">
        {containers.length === 0 ? (
          <EmptyState
            icon={<Container className="size-8" />}
            title="No containers yet"
            description="Add a container to get started"
          />
        ) : (
          containers.map((container) => (
            <ContainerCard
              key={container.id}
              container={container}
              onClick={() => onSelect(container.id)}
              onDelete={() => onDelete(container.id)}
            />
          ))
        )}
        <Button variant="outline" icon={<Plus className="size-3" />} onClick={onAdd}>
          Add Container
        </Button>
      </div>
    </FormField>
  );
}

function ContainerConfigForm({
  container,
  onUpdate,
  onBack,
}: {
  container: ContainerData;
  onUpdate: (container: ContainerData) => void;
  onBack: () => void;
}) {
  const [portDraft, setPortDraft] = useState("");
  const [editingPortIndex, setEditingPortIndex] = useState<number | null>(null);
  const [editingPortValue, setEditingPortValue] = useState("");

  const [envKeyDraft, setEnvKeyDraft] = useState("");
  const [envValueDraft, setEnvValueDraft] = useState("");
  const [editingEnvIndex, setEditingEnvIndex] = useState<number | null>(null);
  const [editingEnvKey, setEditingEnvKey] = useState("");
  const [editingEnvValue, setEditingEnvValue] = useState("");
  const [revealedEnvIndices, setRevealedEnvIndices] = useState<Set<number>>(new Set());

  const portInputRef = useRef<HTMLInputElement>(null);
  const envKeyInputRef = useRef<HTMLInputElement>(null);

  const update = (updates: Partial<ContainerData>) => {
    onUpdate({ ...container, ...updates });
  };

  const addPort = () => {
    if (!portDraft.trim()) return;
    update({ ports: [...container.ports, portDraft.trim()] });
    setPortDraft("");
    portInputRef.current?.focus();
  };

  const startEditingPort = (index: number) => {
    setEditingPortIndex(index);
    setEditingPortValue(container.ports[index] ?? "");
  };

  const saveEditingPort = () => {
    if (editingPortIndex === null || !editingPortValue.trim()) return;
    update({
      ports: container.ports.map((port, index) =>
        index === editingPortIndex ? editingPortValue.trim() : port,
      ),
    });
    setEditingPortIndex(null);
    setEditingPortValue("");
  };

  const cancelEditingPort = () => {
    setEditingPortIndex(null);
    setEditingPortValue("");
  };

  const removePort = (index: number) => {
    update({ ports: container.ports.filter((_, i) => i !== index) });
  };

  const addEnvVar = () => {
    if (!envKeyDraft.trim()) return;
    update({
      envVars: [...container.envVars, { key: envKeyDraft.trim(), value: envValueDraft }],
    });
    setEnvKeyDraft("");
    setEnvValueDraft("");
    envKeyInputRef.current?.focus();
  };

  const startEditingEnv = (index: number) => {
    const envVar = container.envVars[index];
    if (!envVar) return;
    setEditingEnvIndex(index);
    setEditingEnvKey(envVar.key);
    setEditingEnvValue(envVar.value);
  };

  const saveEditingEnv = () => {
    if (editingEnvIndex === null || !editingEnvKey.trim()) return;
    update({
      envVars: container.envVars.map((envVar, index) =>
        index === editingEnvIndex ? { key: editingEnvKey.trim(), value: editingEnvValue } : envVar,
      ),
    });
    setEditingEnvIndex(null);
    setEditingEnvKey("");
    setEditingEnvValue("");
  };

  const cancelEditingEnv = () => {
    setEditingEnvIndex(null);
    setEditingEnvKey("");
    setEditingEnvValue("");
  };

  const removeEnvVar = (index: number) => {
    update({ envVars: container.envVars.filter((_, i) => i !== index) });
    setRevealedEnvIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleEnvReveal = (index: number) => {
    setRevealedEnvIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <FormField label="Container Image" hint="e.g., ghcr.io/ridafkih/agent-playground:main">
        <InputGroup>
          <InputGroupIcon>
            <Container />
          </InputGroupIcon>
          <InputGroupInput
            value={container.image}
            onChange={(event) => update({ image: event.currentTarget.value })}
            placeholder="ghcr.io/org/image:tag"
          />
        </InputGroup>
      </FormField>

      <FormField label="Exposed Ports" hint="Ports to expose from the container">
        <form
          className="flex flex-col gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            addPort();
          }}
        >
          <Input
            ref={portInputRef}
            value={portDraft}
            onChange={(event) => setPortDraft(event.currentTarget.value)}
            placeholder="8080"
          />
          <Button type="submit" variant="outline" icon={<Plus className="size-3" />}>
            Add Port
          </Button>
        </form>
        {container.ports.length > 0 && (
          <Table className="mt-2 border border-border" columns="1fr auto">
            <TableHeader>
              <TableRow>
                <TableHead>Port</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {container.ports.map((port, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {editingPortIndex === index ? (
                      <Input
                        value={editingPortValue}
                        onChange={(event) => setEditingPortValue(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEditingPort();
                          if (event.key === "Escape") cancelEditingPort();
                        }}
                        autoFocus
                      />
                    ) : (
                      port
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingPortIndex === index ? (
                      <ActionGroup className="justify-end">
                        <IconButton icon={<Check />} label="Save" onClick={saveEditingPort} />
                        <IconButton icon={<X />} label="Cancel" onClick={cancelEditingPort} />
                      </ActionGroup>
                    ) : (
                      <ActionGroup className="justify-end">
                        <IconButton
                          icon={<Pencil />}
                          label="Edit"
                          onClick={() => startEditingPort(index)}
                        />
                        <IconButton
                          icon={<Trash2 />}
                          label="Delete"
                          onClick={() => removePort(index)}
                        />
                      </ActionGroup>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FormField>

      <FormField label="Agent Permissions">
        <div className="flex flex-col gap-1">
          <Checkbox
            size="md"
            checked={container.permissions.readFiles}
            onChange={(checked) =>
              update({ permissions: { ...container.permissions, readFiles: checked } })
            }
          >
            Read files
          </Checkbox>
          <Checkbox
            size="md"
            checked={container.permissions.readWriteFiles}
            onChange={(checked) =>
              update({ permissions: { ...container.permissions, readWriteFiles: checked } })
            }
          >
            Read and write files
          </Checkbox>
          <Checkbox
            size="md"
            checked={container.permissions.runBashCommands}
            onChange={(checked) =>
              update({ permissions: { ...container.permissions, runBashCommands: checked } })
            }
          >
            Run bash commands
          </Checkbox>
        </div>
      </FormField>

      <FormField label="Environment Variables">
        <form
          className="flex flex-col gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            addEnvVar();
          }}
        >
          <div className="flex items-center gap-1">
            <Input
              ref={envKeyInputRef}
              value={envKeyDraft}
              onChange={(event) => setEnvKeyDraft(event.currentTarget.value)}
              placeholder="KEY"
              mono
            />
            <Input
              value={envValueDraft}
              onChange={(event) => setEnvValueDraft(event.currentTarget.value)}
              placeholder="VALUE"
            />
          </div>
          <Button type="submit" variant="outline" icon={<Plus className="size-3" />}>
            Add Variable
          </Button>
        </form>
        {container.envVars.length > 0 && (
          <Table className="mt-2 border border-border" columns="1fr 1fr auto">
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {container.envVars.map((envVar, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">
                    {editingEnvIndex === index ? (
                      <Input
                        value={editingEnvKey}
                        onChange={(event) => setEditingEnvKey(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEditingEnv();
                          if (event.key === "Escape") cancelEditingEnv();
                        }}
                        mono
                        autoFocus
                      />
                    ) : (
                      envVar.key
                    )}
                  </TableCell>
                  <TableCell>
                    {editingEnvIndex === index ? (
                      <Input
                        value={editingEnvValue}
                        onChange={(event) => setEditingEnvValue(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEditingEnv();
                          if (event.key === "Escape") cancelEditingEnv();
                        }}
                      />
                    ) : revealedEnvIndices.has(index) ? (
                      envVar.value
                    ) : (
                      "••••••••"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingEnvIndex === index ? (
                      <ActionGroup className="justify-end">
                        <IconButton icon={<Check />} label="Save" onClick={saveEditingEnv} />
                        <IconButton icon={<X />} label="Cancel" onClick={cancelEditingEnv} />
                      </ActionGroup>
                    ) : (
                      <ActionGroup className="justify-end">
                        <IconButton
                          icon={revealedEnvIndices.has(index) ? <EyeOff /> : <Eye />}
                          label={revealedEnvIndices.has(index) ? "Hide" : "Reveal"}
                          onClick={() => toggleEnvReveal(index)}
                        />
                        <IconButton
                          icon={<Pencil />}
                          label="Edit"
                          onClick={() => startEditingEnv(index)}
                        />
                        <IconButton
                          icon={<Trash2 />}
                          label="Delete"
                          onClick={() => removeEnvVar(index)}
                        />
                      </ActionGroup>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FormField>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" size="md" className="w-full" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="md" className="w-full" onClick={onBack}>
          Done
        </Button>
      </div>
    </div>
  );
}

function ProjectForm({
  name,
  onNameChange,
  systemPrompt,
  onSystemPromptChange,
  containers,
  onAddContainer,
  onSelectContainer,
  onDeleteContainer,
  onSubmit,
  isCreating,
  error,
}: {
  name: string;
  onNameChange: (value: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  containers: ContainerData[];
  onAddContainer: () => void;
  onSelectContainer: (id: string) => void;
  onDeleteContainer: (id: string) => void;
  onSubmit: () => void;
  isCreating: boolean;
  error: Error | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FormField label="Project Name">
        <Input
          value={name}
          onChange={(e) => onNameChange(e.currentTarget.value)}
          placeholder="My Project"
        />
      </FormField>

      <FormField
        label="System Prompt"
        hint="This will be injected in the system prompt, and is your opportunity to provide the agent some context."
      >
        <Textarea
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.currentTarget.value)}
          placeholder="You are a helpful coding assistant..."
          rows={4}
        />
      </FormField>

      <ContainerListField
        containers={containers}
        onAdd={onAddContainer}
        onSelect={onSelectContainer}
        onDelete={onDeleteContainer}
      />

      <Divider />
      {error && <p className="text-red-500 text-sm">{error.message}</p>}
      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled={containers.length === 0}
        loading={isCreating}
        onClick={onSubmit}
      >
        Create Project
      </Button>
    </div>
  );
}

function ContainerConfigStep({
  container,
  onUpdate,
}: {
  container: ContainerData;
  onUpdate: (container: ContainerData) => void;
}) {
  const { setStep } = useWizard();
  return (
    <ContainerConfigForm container={container} onUpdate={onUpdate} onBack={() => setStep("list")} />
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const client = useApiClient();
  const { createProject, isLoading, error } = useCreateProject();

  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  const selectedContainer = selectedContainerId
    ? (containers.find((c) => c.id === selectedContainerId) ?? null)
    : null;

  const addContainer = (setStep: (step: string) => void) => {
    const newContainer = createEmptyContainer();
    setContainers([...containers, newContainer]);
    setSelectedContainerId(newContainer.id);
    setStep("config");
  };

  const selectContainer = (id: string, setStep: (step: string) => void) => {
    setSelectedContainerId(id);
    setStep("config");
  };

  const deleteContainer = (id: string) => {
    setContainers(containers.filter((c) => c.id !== id));
    if (selectedContainerId === id) {
      setSelectedContainerId(null);
    }
  };

  const updateContainer = (updated: ContainerData) => {
    setContainers(containers.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCreateProject = async () => {
    const project = await createProject({ name, systemPrompt });

    await Promise.all(
      containers.map((container) =>
        client.containers.create(project.id, {
          image: container.image,
          ports: container.ports.map((port) => parseInt(port, 10)).filter((port) => !isNaN(port)),
        }),
      ),
    );

    router.push(`/${project.id}`);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Heading as="h2" size="xl">
            New Project
          </Heading>
          <Copy muted>Configure a new project with container settings.</Copy>
        </div>

        <Wizard defaultStep="list">
          {({ setStep }) => (
            <>
              <WizardStep name="list">
                <ProjectForm
                  name={name}
                  onNameChange={setName}
                  systemPrompt={systemPrompt}
                  onSystemPromptChange={setSystemPrompt}
                  containers={containers}
                  onAddContainer={() => addContainer(setStep)}
                  onSelectContainer={(id) => selectContainer(id, setStep)}
                  onDeleteContainer={deleteContainer}
                  onSubmit={handleCreateProject}
                  isCreating={isLoading}
                  error={error}
                />
              </WizardStep>

              <WizardStep name="config">
                {selectedContainer && (
                  <ContainerConfigStep container={selectedContainer} onUpdate={updateContainer} />
                )}
              </WizardStep>
            </>
          )}
        </Wizard>
      </div>
    </div>
  );
}
