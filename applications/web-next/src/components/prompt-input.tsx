type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
};

export function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter a prompt...",
}: PromptInputProps) {
  return (
    <div className="border-t border-border p-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none bg-bg-muted border border-border p-2 text-[0.75rem] placeholder:text-text-muted focus:outline-none focus:border-text-muted"
      />
    </div>
  );
}
