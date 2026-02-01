"use client";

import { useState } from "react";
import { FormInput } from "@/components/form-input";

const aiProviderOptions = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
];

function SettingsPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex flex-col gap-1 max-w-sm">{children}</div>
    </div>
  );
}

function SettingsFormField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

export function ProvidersTab() {
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");

  const handleSave = () => {};

  return (
    <SettingsPanel>
      <SettingsFormField>
        <FormInput.Label>Provider</FormInput.Label>
        <FormInput.Select options={aiProviderOptions} value={provider} onChange={setProvider} />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>API Key</FormInput.Label>
        <FormInput.Password
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="sk-xxxxxxxxxxxx"
        />
      </SettingsFormField>

      <button
        type="button"
        onClick={handleSave}
        className="self-start px-2 py-1 text-xs bg-bg-muted border border-border text-text hover:bg-bg-hover"
      >
        Save
      </button>
    </SettingsPanel>
  );
}
