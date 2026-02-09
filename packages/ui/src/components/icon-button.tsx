import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "../utils/cn";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, className, ...props }, ref) => {
    return (
      <button
        aria-label={label}
        className={cn(
          "p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
          "focus-visible:outline focus-visible:outline-ring focus-visible:outline-offset-px",
          className
        )}
        ref={ref}
        type="button"
        {...props}
      >
        <span className="size-3 [&>svg]:size-3">{icon}</span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
