import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex-1 border border-border bg-muted px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-ring focus-visible:outline-offset-px",
          mono && "font-mono",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
