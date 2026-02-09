"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { tv } from "tailwind-variants";
import { cn } from "@/lib/cn";

interface TabsContextValue {
  active: string;
  setActive: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = use(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within Tabs.Root");
  }
  return context;
}

type TabsRootProps =
  | {
      children: ReactNode;
      defaultTab: string;
      active?: never;
      onActiveChange?: never;
    }
  | {
      children: ReactNode;
      active: string;
      onActiveChange: (tab: string) => void;
      defaultTab?: never;
    };

function TabsRoot(props: TabsRootProps) {
  const { children } = props;
  const isControlled = "active" in props && props.active !== undefined;

  const [internalActive, setInternalActive] = useState(
    isControlled ? props.active : props.defaultTab
  );

  const active = isControlled ? props.active : internalActive;

  const setActive = (tab: string) => {
    if (isControlled) {
      props.onActiveChange?.(tab);
    } else {
      setInternalActive(tab);
    }
  };

  return <TabsContext value={{ active, setActive }}>{children}</TabsContext>;
}

function TabsList({ children, grow }: { children: ReactNode; grow?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-px border-border border-b px-0",
        grow && "*:flex-1"
      )}
    >
      {children}
    </div>
  );
}

const tab = tv({
  base: "max-w-full cursor-pointer border-b px-2 py-1 text-xs",
  variants: {
    active: {
      true: "border-text text-text",
      false: "border-transparent text-text-muted hover:text-text-secondary",
    },
  },
});

function TabsTab({ value, children }: { value: string; children: ReactNode }) {
  const { active, setActive } = useTabs();
  const isActive = active === value;

  return (
    <div className="min-w-0 px-1">
      <button
        className={tab({ active: isActive })}
        onClick={() => setActive(value)}
        type="button"
      >
        {children}
      </button>
    </div>
  );
}

function TabsContent({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const { active } = useTabs();
  if (active !== value) {
    return null;
  }
  return <>{children}</>;
}

const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Content: TabsContent,
};

export { Tabs };
