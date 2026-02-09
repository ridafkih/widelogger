import { Check } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { Copy } from "./copy";

type CheckboxSize = "sm" | "md";

const sizeStyles: Record<
  CheckboxSize,
  { box: string; icon: string; text: "xs" | "sm" }
> = {
  sm: { box: "size-3", icon: "size-2", text: "xs" },
  md: { box: "size-4", icon: "size-3", text: "sm" },
};

export type CheckboxProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: ReactNode;
  size?: CheckboxSize;
};

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    { checked = false, onChange, children, className, size = "sm", ...props },
    ref
  ) => {
    const styles = sizeStyles[size];
    return (
      <label
        className={cn(
          "flex w-fit cursor-pointer items-center gap-1.5",
          className
        )}
      >
        <button
          aria-checked={checked}
          className={cn(
            "flex shrink-0 items-center justify-center border",
            "focus-visible:outline focus-visible:outline-ring focus-visible:outline-offset-px",
            styles.box,
            checked
              ? "border-foreground bg-foreground text-background"
              : "border-muted-foreground"
          )}
          onClick={() => onChange?.(!checked)}
          ref={ref}
          role="checkbox"
          type="button"
          {...props}
        >
          {checked && <Check className={styles.icon} />}
        </button>
        {children && <Copy size={styles.text}>{children}</Copy>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
