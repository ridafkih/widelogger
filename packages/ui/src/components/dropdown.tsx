"use client";

import {
  type ButtonHTMLAttributes,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useClickOutside } from "../hooks/use-click-outside";
import { cn } from "../utils/cn";
import { Slot } from "../utils/slot";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within Dropdown");
  }
  return context;
}

export interface DropdownProps {
  children: ReactNode;
  className?: string;
}

export function Dropdown({ children, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  return (
    <DropdownContext.Provider
      value={{ open, setOpen, activeIndex, setActiveIndex }}
    >
      <div className={cn("relative inline-block", className)} ref={ref}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export type DropdownTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function DropdownTrigger({
  className,
  children,
  asChild = false,
  ...props
}: DropdownTriggerProps) {
  const { open, setOpen, setActiveIndex } = useDropdown();

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(0);
    }
  };

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      aria-expanded={open}
      aria-haspopup="menu"
      className={cn(!asChild && "inline-flex items-center gap-1", className)}
      onClick={() => setOpen(!open)}
      onKeyDown={handleKeyDown}
      type="button"
      {...props}
    >
      {children}
    </Comp>
  );
}

export interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  const { open, setOpen, activeIndex, setActiveIndex } = useDropdown();
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      itemsRef.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const itemCount = itemsRef.current.length;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((activeIndex + 1) % itemCount);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((activeIndex - 1 + itemCount) % itemCount);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-full left-0 z-50 min-w-32 border border-border bg-background shadow-xs",
        className
      )}
      onKeyDown={handleKeyDown}
      ref={menuRef}
      role="menu"
    >
      {children}
    </div>
  );
}

export type DropdownItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
};

export function DropdownItem({
  className,
  icon,
  children,
  ...props
}: DropdownItemProps) {
  const { setOpen } = useDropdown();

  return (
    <button
      className={cn(
        "flex w-full items-center gap-1.5 py-1.5 pr-4 pl-2 text-left text-xs",
        "hover:bg-muted focus:bg-muted focus-visible:outline focus-visible:outline-ring focus-visible:outline-offset-px",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={(event) => {
        props.onClick?.(event);
        setOpen(false);
      }}
      role="menuitem"
      type="button"
      {...props}
    >
      {icon && <span className="size-3 [&>svg]:size-3">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border", className)} role="separator" />;
}
