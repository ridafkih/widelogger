import { db } from "@lab/database/client";
import { githubSettings, type GitHubSettings } from "@lab/database/schema/github-settings";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "../shared/crypto";
import { InternalError } from "../shared/errors";
import { widelog } from "../logging";

function toSettingsOutput(settings: GitHubSettings): GitHubSettingsOutput {
  return {
    id: settings.id,
    username: settings.username,
    authorName: settings.authorName,
    authorEmail: settings.authorEmail,
    attributeAgent: settings.attributeAgent,
    hasPatConfigured: !!settings.patEncrypted,
    isOAuthConnected: !!settings.accessTokenEncrypted,
    oauthConnectedAt: settings.oauthConnectedAt,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export interface GitHubSettingsInput {
  pat?: string;
  username?: string;
  authorName?: string;
  authorEmail?: string;
  attributeAgent?: boolean;
}

export interface GitHubSettingsOutput {
  id: string;
  username: string | null;
  authorName: string | null;
  authorEmail: string | null;
  attributeAgent: boolean;
  hasPatConfigured: boolean;
  isOAuthConnected: boolean;
  oauthConnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubCredentials {
  token: string | null;
  username: string | null;
  authorName: string | null;
  authorEmail: string | null;
  attributeAgent: boolean;
}

export interface GitHubOAuthInput {
  accessToken: string;
  scopes: string;
  username: string;
}

export async function getGitHubSettings(): Promise<GitHubSettingsOutput | null> {
  const [settings] = await db.select().from(githubSettings).limit(1);
  if (!settings) return null;

  return toSettingsOutput(settings);
}

export async function getGitHubCredentials(): Promise<GitHubCredentials | null> {
  const [settings] = await db.select().from(githubSettings).limit(1);
  if (!settings) return null;

  let token: string | null = null;

  if (settings.accessTokenEncrypted && settings.accessTokenNonce) {
    try {
      token = decrypt(settings.accessTokenEncrypted, settings.accessTokenNonce);
    } catch (error) {
      widelog.set("github.oauth_token_decrypt_failed", true);
      widelog.errorFields(error, {
        prefix: "github.oauth_token_decrypt_error",
        includeStack: false,
      });
    }
  }

  if (!token && settings.patEncrypted && settings.patNonce) {
    try {
      token = decrypt(settings.patEncrypted, settings.patNonce);
    } catch (error) {
      widelog.set("github.pat_decrypt_failed", true);
      widelog.errorFields(error, { prefix: "github.pat_decrypt_error", includeStack: false });
    }
  }

  return {
    token,
    username: settings.username,
    authorName: settings.authorName,
    authorEmail: settings.authorEmail,
    attributeAgent: settings.attributeAgent,
  };
}

export async function saveGitHubSettings(
  input: GitHubSettingsInput,
): Promise<GitHubSettingsOutput> {
  const [existing] = await db.select({ id: githubSettings.id }).from(githubSettings).limit(1);

  let patEncrypted: string | undefined;
  let patNonce: string | undefined;

  if (input.pat) {
    const encrypted = encrypt(input.pat);
    patEncrypted = encrypted.encrypted;
    patNonce = encrypted.nonce;
  }

  const values = {
    username: input.username,
    authorName: input.authorName,
    authorEmail: input.authorEmail,
    attributeAgent: input.attributeAgent,
    ...(patEncrypted && patNonce ? { patEncrypted, patNonce } : {}),
    updatedAt: new Date(),
  };

  let settings;
  if (existing) {
    [settings] = await db
      .update(githubSettings)
      .set(values)
      .where(eq(githubSettings.id, existing.id))
      .returning();
  } else {
    [settings] = await db.insert(githubSettings).values(values).returning();
  }

  if (!settings) {
    throw new InternalError("Failed to save GitHub settings", "GITHUB_SETTINGS_SAVE_FAILED");
  }

  return toSettingsOutput(settings);
}

export async function deleteGitHubSettings(): Promise<void> {
  await db.delete(githubSettings);
}

export async function saveGitHubOAuthToken(input: GitHubOAuthInput): Promise<GitHubSettingsOutput> {
  const [existing] = await db.select({ id: githubSettings.id }).from(githubSettings).limit(1);

  const encrypted = encrypt(input.accessToken);

  const values = {
    accessTokenEncrypted: encrypted.encrypted,
    accessTokenNonce: encrypted.nonce,
    oauthScopes: input.scopes,
    oauthConnectedAt: new Date(),
    username: input.username,
    updatedAt: new Date(),
  };

  let settings;
  if (existing) {
    [settings] = await db
      .update(githubSettings)
      .set(values)
      .where(eq(githubSettings.id, existing.id))
      .returning();
  } else {
    [settings] = await db.insert(githubSettings).values(values).returning();
  }

  if (!settings) {
    throw new InternalError("Failed to save GitHub OAuth token", "GITHUB_OAUTH_SAVE_FAILED");
  }

  return toSettingsOutput(settings);
}

export async function clearGitHubOAuthToken(): Promise<void> {
  const [existing] = await db.select({ id: githubSettings.id }).from(githubSettings).limit(1);
  if (!existing) return;

  await db
    .update(githubSettings)
    .set({
      accessTokenEncrypted: null,
      accessTokenNonce: null,
      oauthScopes: null,
      oauthConnectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(githubSettings.id, existing.id));
}
