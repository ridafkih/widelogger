"use client";

import { ChevronDown, Eye, EyeOff } from "lucide-react";
import {
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useState,
} from "react";
import { tv } from "tailwind-variants";
import { cn } from "@/lib/cn";

const label = tv({
  base: "text-text-secondary text-xs",
});

function FormInputLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className={label()}>
      {children}
      {required && <span className="ml-0.5 text-text-muted">*</span>}
    </label>
  );
}

const input = tv({
  base: "w-full border border-border bg-bg px-2 py-1 text-text text-xs placeholder:text-text-muted focus:border-text-muted focus:outline-none",
});

type FormInputTextProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  type?: "text" | "email" | "url";
};

function FormInputText({
  type = "text",
  className,
  ...props
}: FormInputTextProps) {
  return <input className={input({ className })} type={type} {...props} />;
}

function FormInputPassword({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className={input({ className: cn("pr-7", className) })}
        type={visible ? "text" : "password"}
        {...props}
      />
      <button
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-text-muted hover:text-text"
        onClick={() => setVisible(!visible)}
        type="button"
      >
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface FormInputSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function FormInputSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
}: FormInputSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          input(),
          "cursor-pointer appearance-none border-0 pr-6",
          className
        )}
        onChange={({ target }) => onChange?.(target.value)}
        value={value}
      >
        {placeholder && (
          <option disabled value="">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            className="bg-bg text-text"
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-text-muted"
        size={12}
      />
    </div>
  );
}

interface FormInputCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

function FormInputCheckbox({
  checked = false,
  onChange,
  label,
}: FormInputCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
      <input
        checked={checked}
        className="h-3 w-3 cursor-pointer accent-text"
        onChange={(e) => onChange?.(e.target.checked)}
        type="checkbox"
      />
      {label && <span className="text-text text-xs">{label}</span>}
    </label>
  );
}

function FormInputTextarea({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return (
    <textarea
      className={cn(input(), "resize-none", className)}
      rows={rows}
      {...props}
    />
  );
}

function FormInputHelper({ children }: { children: ReactNode }) {
  return <p className="text-text-muted text-xs">{children}</p>;
}

function FormInputError({ children }: { children: ReactNode }) {
  return <p className="text-red-500 text-xs">{children}</p>;
}

function FormInputSuccess({ children }: { children: ReactNode }) {
  return <p className="text-green-500 text-xs">{children}</p>;
}

const submitButton = tv({
  base: "border border-border px-2 py-1 text-text text-xs hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-50",
});

interface FormInputSubmitProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  className?: string;
}

function FormInputSubmit({
  children,
  onClick,
  disabled,
  loading,
  loadingText,
  className,
}: FormInputSubmitProps) {
  return (
    <button
      className={submitButton({ className })}
      disabled={disabled || loading}
      onClick={onClick}
      type="button"
    >
      {loading ? (loadingText ?? "Loading...") : children}
    </button>
  );
}

const inputGroup = tv({
  slots: {
    root: "flex items-center border border-border bg-bg focus-within:border-text-muted",
    input:
      "min-w-0 flex-1 bg-transparent px-2 py-1 text-text text-xs placeholder:text-text-muted focus:outline-none",
    separator: "select-none text-text-muted text-xs",
    action: "shrink-0 px-1.5 text-text-muted hover:text-text",
  },
});

function InputGroupRoot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const styles = inputGroup();
  return <div className={cn(styles.root(), className)}>{children}</div>;
}

function InputGroupInput({
  className,
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const styles = inputGroup();
  return (
    <input className={cn(styles.input(), className)} type={type} {...props} />
  );
}

function InputGroupSeparator({ children }: { children: ReactNode }) {
  const styles = inputGroup();
  return <span className={styles.separator()}>{children}</span>;
}

function InputGroupAction({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  const styles = inputGroup();
  return (
    <button
      className={cn(styles.action(), className)}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

const InputGroup = {
  Root: InputGroupRoot,
  Input: InputGroupInput,
  Separator: InputGroupSeparator,
  Action: InputGroupAction,
};

const FormInput = {
  Label: FormInputLabel,
  Text: FormInputText,
  Textarea: FormInputTextarea,
  Password: FormInputPassword,
  Select: FormInputSelect,
  Checkbox: FormInputCheckbox,
  Helper: FormInputHelper,
  Error: FormInputError,
  Success: FormInputSuccess,
  Submit: FormInputSubmit,
};

export { FormInput, InputGroup };
