import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "flex cursor-pointer items-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    variant: {
      primary: "border border-border bg-bg-muted text-text hover:bg-bg-hover",
      ghost: "text-text-muted hover:bg-bg-muted hover:text-text",
      danger: "border border-red-500/30 text-red-500 hover:bg-red-500/10",
      active: "border border-blue-500/50 bg-blue-500/10 text-blue-500",
    },
    size: {
      sm: "px-1.5 py-0.5",
      md: "px-2 py-1",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof button>;

function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={button({ variant, size, className })}
      type={type}
      {...props}
    />
  );
}

export { Button, button };
