"use client";

import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import { Button, type ButtonProps } from "./button";

interface AlertDialogContextValue {
  onClose: () => void;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialog() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error("AlertDialog components must be used within AlertDialog");
  }
  return context;
}

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: AlertDialogProps) {
  const onClose = () => onOpenChange(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <AlertDialogContext.Provider value={{ onClose }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        {children}
      </div>
    </AlertDialogContext.Provider>,
    document.body
  );
}

export interface AlertDialogContentProps {
  children: ReactNode;
  className?: string;
}

export function AlertDialogContent({
  children,
  className,
}: AlertDialogContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  return (
    <div
      className={cn(
        "relative z-50 w-full max-w-sm border border-border bg-background p-4 shadow-lg",
        "focus:outline-none",
        className
      )}
      ref={contentRef}
      role="alertdialog"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

export interface AlertDialogTitleProps {
  children: ReactNode;
  className?: string;
}

export function AlertDialogTitle({
  children,
  className,
}: AlertDialogTitleProps) {
  return (
    <h2 className={cn("font-medium text-foreground text-sm", className)}>
      {children}
    </h2>
  );
}

export interface AlertDialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function AlertDialogDescription({
  children,
  className,
}: AlertDialogDescriptionProps) {
  return (
    <p className={cn("mt-2 text-muted-foreground text-xs", className)}>
      {children}
    </p>
  );
}

export interface AlertDialogActionsProps {
  children: ReactNode;
  className?: string;
}

export function AlertDialogActions({
  children,
  className,
}: AlertDialogActionsProps) {
  return (
    <div className={cn("mt-4 flex justify-end gap-2", className)}>
      {children}
    </div>
  );
}

export type AlertDialogCancelProps = Omit<ButtonProps, "variant"> & {
  children: ReactNode;
};

export function AlertDialogCancel({
  children,
  onClick,
  ...props
}: AlertDialogCancelProps) {
  const { onClose } = useAlertDialog();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onClose();
  };

  return (
    <Button onClick={handleClick} variant="secondary" {...props}>
      {children}
    </Button>
  );
}

export type AlertDialogActionProps = Omit<ButtonProps, "variant"> & {
  children: ReactNode;
  variant?: "primary" | "destructive";
};

export function AlertDialogAction({
  children,
  variant = "primary",
  className,
  onClick,
  ...props
}: AlertDialogActionProps) {
  const { onClose } = useAlertDialog();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onClose();
  };

  const isDestructive = variant === "destructive";

  return (
    <Button
      className={cn(
        isDestructive && "bg-destructive hover:bg-destructive/90",
        className
      )}
      onClick={handleClick}
      variant="primary"
      {...props}
    >
      {children}
    </Button>
  );
}
