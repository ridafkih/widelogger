import type { ComponentProps, Ref } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const iconButton = tv({
  base: "-m-1.5 shrink-0 cursor-pointer p-1.5",
  variants: {
    variant: {
      ghost: "text-text-muted hover:text-text",
    },
  },
  defaultVariants: {
    variant: "ghost",
  },
});

type IconButtonProps = ComponentProps<"button"> &
  VariantProps<typeof iconButton> & {
    ref?: Ref<HTMLButtonElement>;
  };

export function IconButton({
  className,
  variant,
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={iconButton({ variant, className })}
      ref={ref}
      {...props}
    />
  );
}
