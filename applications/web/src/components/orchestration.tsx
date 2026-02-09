"use client";

import { Loader2 } from "lucide-react";
import { createContext, type ReactNode, use, useState } from "react";

type OrchestrationStatus = "thinking" | "delegating" | "starting";

interface OrchestrationItem {
  id: string;
  status: OrchestrationStatus;
  projectName?: string;
}

interface OrchestrationActions {
  add: (item?: Partial<Omit<OrchestrationItem, "id">>) => string;
  update: (id: string, updates: Partial<Omit<OrchestrationItem, "id">>) => void;
  remove: (id: string) => void;
}

interface OrchestrationContextValue {
  items: OrchestrationItem[];
  actions: OrchestrationActions;
}

const OrchestrationContext = createContext<OrchestrationContextValue | null>(
  null
);

function useOrchestrationItems() {
  const context = use(OrchestrationContext);
  if (!context) {
    throw new Error(
      "useOrchestrationItems must be used within Orchestration.Provider"
    );
  }
  return context.items;
}

interface ProviderProps {
  children: ReactNode;
}

function OrchestrationProvider({ children }: ProviderProps) {
  const [items, setItems] = useState<OrchestrationItem[]>([]);

  const add = (item?: Partial<Omit<OrchestrationItem, "id">>) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, status: "thinking", ...item }]);
    return id;
  };

  const update = (
    id: string,
    updates: Partial<Omit<OrchestrationItem, "id">>
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const actions = { add, update, remove };
  const value = { items, actions };

  return <OrchestrationContext value={value}>{children}</OrchestrationContext>;
}

const statusMessages: Record<OrchestrationStatus, string> = {
  thinking: "Understanding your request...",
  delegating: "Identifying the right project...",
  starting: "Starting session...",
};

interface IndicatorProps {
  status: OrchestrationStatus;
  projectName?: string;
}

function OrchestrationIndicator({ status, projectName }: IndicatorProps) {
  const message =
    status === "starting" && projectName
      ? `Starting session in ${projectName}...`
      : statusMessages[status];

  return (
    <div className="pointer-events-auto flex items-center gap-2 border border-border bg-bg px-3 py-2 text-sm text-text-secondary">
      <Loader2 className="animate-spin" size={14} />
      <span>{message}</span>
    </div>
  );
}

function OrchestrationList() {
  const items = useOrchestrationItems();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 flex flex-col gap-2">
      {items.map((item) => (
        <OrchestrationIndicator
          key={item.id}
          projectName={item.projectName}
          status={item.status}
        />
      ))}
    </div>
  );
}

const Orchestration = {
  Provider: OrchestrationProvider,
  List: OrchestrationList,
  Indicator: OrchestrationIndicator,
};

export { Orchestration };
