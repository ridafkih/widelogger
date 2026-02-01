"use client";

import { useState } from "react";
import { FormInput } from "@/components/form-input";

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

export function GitHubTab() {
  const [pat, setPat] = useState("");
  const [username, setUsername] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [attributeAgent, setAttributeAgent] = useState(true);

  const handleSave = () => {};

  return (
    <SettingsPanel>
      <SettingsFormField>
        <FormInput.Label>Personal Access Token</FormInput.Label>
        <FormInput.Password
          value={pat}
          onChange={(event) => setPat(event.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Username</FormInput.Label>
        <FormInput.Text
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="your-github-username"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Commit Author Name</FormInput.Label>
        <FormInput.Text
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Your Name"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Commit Author Email</FormInput.Label>
        <FormInput.Text
          type="email"
          value={authorEmail}
          onChange={(event) => setAuthorEmail(event.target.value)}
          placeholder="my-agent@example.com"
        />
      </SettingsFormField>

      <FormInput.Checkbox
        checked={attributeAgent}
        onChange={setAttributeAgent}
        label="Attribute agent to commits"
      />

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
