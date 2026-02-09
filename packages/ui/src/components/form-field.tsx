import type { ReactNode } from "react";
import { Copy } from "./copy";

export interface FormFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <Copy className="font-medium" size="sm">
          {label}
        </Copy>
        {hint && (
          <Copy muted size="xs">
            {hint}
          </Copy>
        )}
      </div>
      {children}
    </div>
  );
}
