import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full resize-none border border-border bg-muted px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-ring focus-visible:outline-offset-px",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
