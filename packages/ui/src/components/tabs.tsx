"use client";

import {
  type ButtonHTMLAttributes,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { useControllable } from "../hooks/use-controllable";
import { cn } from "../utils/cn";

interface TabsContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within Tabs");
  }
  return context;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [value, setValue] = useControllable({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "grid h-8 grid-cols-[1fr_1fr] border-border border-b",
        className
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

export type TabsTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({
  value,
  className,
  children,
  disabled,
  ...props
}: TabsTriggerProps) {
  const { value: selectedValue, setValue } = useTabs();
  const isSelected = value === selectedValue;

  return (
    <button
      aria-selected={isSelected}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs",
        "focus-visible:outline focus-visible:outline-ring focus-visible:outline-offset-px",
        "disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-background text-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
        className
      )}
      disabled={disabled}
      onClick={() => setValue(value)}
      role="tab"
      tabIndex={isSelected ? 0 : -1}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
  lazy?: boolean;
}

export function TabsContent({
  value,
  children,
  className,
  lazy = false,
}: TabsContentProps) {
  const { value: selectedValue } = useTabs();
  const [hasRendered, setHasRendered] = useState(false);
  const isSelected = value === selectedValue;

  if (isSelected && !hasRendered) {
    setHasRendered(true);
  }

  if (lazy && !hasRendered) {
    return null;
  }
  if (!isSelected) {
    return null;
  }

  return (
    <div className={className} role="tabpanel">
      {children}
    </div>
  );
}
