"use client";

import { createContext, type ReactNode, use, useState } from "react";
import useSWR from "swr";
import { FormInput } from "@/components/form-input";
import {
  disconnectGitHub,
  getGitHubAuthUrl,
  getGitHubSettings,
  saveGitHubSettings,
} from "@/lib/api";

interface Edits {
  pat?: string;
  username?: string;
  authorName?: string;
  authorEmail?: string;
  attributeAgent?: boolean;
}

interface GitHubSettingsState {
  pat: string;
  username: string;
  authorName: string;
  authorEmail: string;
  attributeAgent: boolean;
  hasPatConfigured: boolean;
  isOAuthConnected: boolean;
  oauthConnectedAt: string | null;
  saving: boolean;
  disconnecting: boolean;
  error: string | null;
  success: boolean;
}

interface GitHubSettingsActions {
  updateField: <K extends keyof Edits>(field: K) => (value: Edits[K]) => void;
  save: () => Promise<void>;
  disconnect: () => Promise<void>;
  connectWithGitHub: () => void;
}

interface GitHubSettingsContextValue {
  state: GitHubSettingsState;
  actions: GitHubSettingsActions;
}

const GitHubSettingsContext = createContext<GitHubSettingsContextValue | null>(
  null
);

function useGitHubSettingsContext() {
  const context = use(GitHubSettingsContext);
  if (!context) {
    throw new Error(
      "GitHubSettings components must be used within GitHubSettings.Provider"
    );
  }
  return context;
}

function GitHubSettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, mutate } = useSWR(
    "github-settings",
    getGitHubSettings
  );

  const [edits, setEdits] = useState<Edits>({});
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const state: GitHubSettingsState = {
    pat: edits.pat ?? "",
    username: edits.username ?? settings?.username ?? "",
    authorName: edits.authorName ?? settings?.authorName ?? "",
    authorEmail: edits.authorEmail ?? settings?.authorEmail ?? "",
    attributeAgent: edits.attributeAgent ?? settings?.attributeAgent ?? true,
    hasPatConfigured: settings?.hasPatConfigured ?? false,
    isOAuthConnected: settings?.isOAuthConnected ?? false,
    oauthConnectedAt: settings?.oauthConnectedAt ?? null,
    saving,
    disconnecting,
    error,
    success,
  };

  const actions: GitHubSettingsActions = {
    updateField: (field) => (value) => {
      setEdits((current) => ({ ...current, [field]: value }));
    },
    save: async () => {
      setSaving(true);
      setError(null);
      setSuccess(false);

      try {
        await saveGitHubSettings({
          pat: state.pat || undefined,
          username: state.username || undefined,
          authorName: state.authorName || undefined,
          authorEmail: state.authorEmail || undefined,
          attributeAgent: state.attributeAgent,
        });
        setEdits({});
        mutate();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save settings"
        );
      } finally {
        setSaving(false);
      }
    },
    disconnect: async () => {
      setDisconnecting(true);
      setError(null);

      try {
        await disconnectGitHub();
        mutate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to disconnect");
      } finally {
        setDisconnecting(false);
      }
    },
    connectWithGitHub: () => {
      window.location.href = getGitHubAuthUrl();
    },
  };

  return (
    <GitHubSettingsContext value={{ state, actions }}>
      {children}
    </GitHubSettingsContext>
  );
}

function GitHubSettingsPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex max-w-sm flex-col gap-1">{children}</div>
    </div>
  );
}

function GitHubSettingsField({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function GitHubOAuthConnect() {
  const { state, actions } = useGitHubSettingsContext();

  if (state.isOAuthConnected) {
    return (
      <GitHubSettingsField>
        <FormInput.Label>GitHub Account</FormInput.Label>
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="text-text-secondary text-xs">
            Connected as{" "}
            <span className="font-medium text-text-primary">
              {state.username}
            </span>
          </span>
          <button
            className="text-text-muted text-xs transition-colors hover:text-text-primary disabled:opacity-50"
            disabled={state.disconnecting}
            onClick={actions.disconnect}
            type="button"
          >
            {state.disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </GitHubSettingsField>
    );
  }

  return (
    <GitHubSettingsField>
      <FormInput.Label>GitHub Account</FormInput.Label>
      <button
        className="border border-border px-2 py-1 text-text text-xs hover:bg-bg-muted"
        onClick={actions.connectWithGitHub}
        type="button"
      >
        Connect with GitHub
      </button>
    </GitHubSettingsField>
  );
}

function GitHubSettingsDivider() {
  const { state } = useGitHubSettingsContext();

  if (state.isOAuthConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-text-muted text-xs">
        or use a Personal Access Token
      </span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

function GitHubSettingsPat() {
  const { state, actions } = useGitHubSettingsContext();

  if (state.isOAuthConnected) {
    return null;
  }

  return (
    <GitHubSettingsField>
      <FormInput.Label>Personal Access Token</FormInput.Label>
      <FormInput.Password
        onChange={(event) => actions.updateField("pat")(event.target.value)}
        placeholder={
          state.hasPatConfigured
            ? "Token configured (enter new to replace)"
            : "ghp_xxxxxxxxxxxx"
        }
        value={state.pat}
      />
    </GitHubSettingsField>
  );
}

function GitHubSettingsUsername() {
  const { state, actions } = useGitHubSettingsContext();

  if (state.isOAuthConnected) {
    return null;
  }

  return (
    <GitHubSettingsField>
      <FormInput.Label>Username</FormInput.Label>
      <FormInput.Text
        onChange={(event) =>
          actions.updateField("username")(event.target.value)
        }
        placeholder="your-github-username"
        value={state.username}
      />
    </GitHubSettingsField>
  );
}

function GitHubSettingsAuthorName() {
  const { state, actions } = useGitHubSettingsContext();
  return (
    <GitHubSettingsField>
      <FormInput.Label>Commit Author Name</FormInput.Label>
      <FormInput.Text
        onChange={(event) =>
          actions.updateField("authorName")(event.target.value)
        }
        placeholder="Your Name"
        value={state.authorName}
      />
    </GitHubSettingsField>
  );
}

function GitHubSettingsAuthorEmail() {
  const { state, actions } = useGitHubSettingsContext();
  return (
    <GitHubSettingsField>
      <FormInput.Label>Commit Author Email</FormInput.Label>
      <FormInput.Text
        onChange={(event) =>
          actions.updateField("authorEmail")(event.target.value)
        }
        placeholder="my-agent@example.com"
        type="email"
        value={state.authorEmail}
      />
    </GitHubSettingsField>
  );
}

function GitHubSettingsAttributeAgent() {
  const { state, actions } = useGitHubSettingsContext();
  return (
    <FormInput.Checkbox
      checked={state.attributeAgent}
      label="Attribute agent to commits"
      onChange={actions.updateField("attributeAgent")}
    />
  );
}

function GitHubSettingsMessages() {
  const { state } = useGitHubSettingsContext();
  return (
    <>
      {state.error && <FormInput.Error>{state.error}</FormInput.Error>}
      {state.success && <FormInput.Success>Settings saved</FormInput.Success>}
    </>
  );
}

function GitHubSettingsSaveButton() {
  const { state, actions } = useGitHubSettingsContext();

  if (state.isOAuthConnected) {
    return null;
  }

  return (
    <FormInput.Submit
      loading={state.saving}
      loadingText="Saving..."
      onClick={actions.save}
    >
      Save
    </FormInput.Submit>
  );
}

const GitHubSettings = {
  Provider: GitHubSettingsProvider,
  Panel: GitHubSettingsPanel,
  Field: GitHubSettingsField,
  OAuthConnect: GitHubOAuthConnect,
  Divider: GitHubSettingsDivider,
  Pat: GitHubSettingsPat,
  Username: GitHubSettingsUsername,
  AuthorName: GitHubSettingsAuthorName,
  AuthorEmail: GitHubSettingsAuthorEmail,
  AttributeAgent: GitHubSettingsAttributeAgent,
  Messages: GitHubSettingsMessages,
  SaveButton: GitHubSettingsSaveButton,
};

export function GitHubTab() {
  const { isLoading, error } = useSWR("github-settings", getGitHubSettings);

  if (isLoading) {
    return (
      <GitHubSettings.Panel>
        <span className="text-text-muted text-xs">Loading...</span>
      </GitHubSettings.Panel>
    );
  }

  if (error) {
    return (
      <GitHubSettings.Panel>
        <FormInput.Error>Failed to load settings</FormInput.Error>
      </GitHubSettings.Panel>
    );
  }

  return (
    <GitHubSettings.Provider>
      <GitHubSettings.Panel>
        <GitHubSettings.OAuthConnect />
        <GitHubSettings.Divider />
        <GitHubSettings.Pat />
        <GitHubSettings.Username />
        <GitHubSettings.AuthorName />
        <GitHubSettings.AuthorEmail />
        <GitHubSettings.AttributeAgent />
        <GitHubSettings.Messages />
        <GitHubSettings.SaveButton />
      </GitHubSettings.Panel>
    </GitHubSettings.Provider>
  );
}
