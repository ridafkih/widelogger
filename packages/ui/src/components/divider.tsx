import { cn } from "../utils/cn";

interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return (
    <hr className={cn("my-0 border-0 border-border border-t", className)} />
  );
}
