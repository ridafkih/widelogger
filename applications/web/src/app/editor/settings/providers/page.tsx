"use client";

import { useState } from "react";
import { Heading } from "@lab/ui/components/heading";
import { Copy } from "@lab/ui/components/copy";
import { Button } from "@lab/ui/components/button";
import { Input } from "@lab/ui/components/input";
import { FormField } from "@lab/ui/components/form-field";
import { IconButton } from "@lab/ui/components/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lab/ui/components/table";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@lab/ui/components/dropdown";
import { ActionGroup } from "@lab/ui/components/action-group";
import { Plus, Eye, EyeOff, Trash2, ChevronDown } from "lucide-react";

type AIProvider = "anthropic" | "openai" | "github-copilot";

const AI_PROVIDERS: { id: AIProvider; name: string }[] = [
  { id: "anthropic", name: "Anthropic" },
  { id: "openai", name: "OpenAI" },
  { id: "github-copilot", name: "GitHub Copilot" },
];

interface ProviderConfig {
  id: string;
  provider: AIProvider;
  apiKey: string;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const addProvider = () => {
    if (!selectedProvider || !apiKeyDraft.trim()) return;
    setProviders([
      ...providers,
      { id: crypto.randomUUID(), provider: selectedProvider, apiKey: apiKeyDraft.trim() },
    ]);
    setSelectedProvider(null);
    setApiKeyDraft("");
  };

  const removeProvider = (id: string) => {
    const index = providers.findIndex((provider) => provider.id === id);
    setProviders(providers.filter((provider) => provider.id !== id));
    setRevealedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleReveal = (index: number) => {
    setRevealedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getProviderName = (id: AIProvider) =>
    AI_PROVIDERS.find((provider) => provider.id === id)?.name ?? id;

  const configuredProviderIds = new Set(providers.map((provider) => provider.provider));
  const availableProviders = AI_PROVIDERS.filter(
    (provider) => !configuredProviderIds.has(provider.id),
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Heading as="h2" size="xl">
            AI Providers
          </Heading>
          <Copy muted>Configure API keys for AI providers that sessions can use.</Copy>
        </div>

        <FormField label="Add Provider" hint="Select a provider and enter your API key">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Dropdown className="flex-1">
                <DropdownTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm bg-muted border border-border hover:bg-muted/70">
                  <span className={selectedProvider ? "" : "text-muted-foreground"}>
                    {selectedProvider ? getProviderName(selectedProvider) : "Select provider"}
                  </span>
                  <ChevronDown className="size-3" />
                </DropdownTrigger>
                <DropdownMenu className="w-(--radix-dropdown-menu-trigger-width)">
                  {availableProviders.map((provider) => (
                    <DropdownItem
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      {provider.name}
                    </DropdownItem>
                  ))}
                  {availableProviders.length === 0 && (
                    <DropdownItem disabled>All providers configured</DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
              <Input
                className="flex-2"
                value={apiKeyDraft}
                onChange={(event) => setApiKeyDraft(event.currentTarget.value)}
                placeholder="sk-..."
                type="password"
              />
            </div>
            <Button
              variant="outline"
              icon={<Plus className="size-3" />}
              onClick={addProvider}
              disabled={!selectedProvider || !apiKeyDraft.trim()}
            >
              Add Provider
            </Button>
          </div>
        </FormField>

        {providers.length > 0 && (
          <Table className="mt-6 border border-border" columns="1fr 2fr auto">
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((config, index) => (
                <TableRow key={config.id}>
                  <TableCell>{getProviderName(config.provider)}</TableCell>
                  <TableCell className="font-mono">
                    {revealedIndices.has(index) ? config.apiKey : "••••••••••••••••"}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionGroup className="justify-end">
                      <IconButton
                        icon={revealedIndices.has(index) ? <EyeOff /> : <Eye />}
                        label={revealedIndices.has(index) ? "Hide" : "Reveal"}
                        onClick={() => toggleReveal(index)}
                      />
                      <IconButton
                        icon={<Trash2 />}
                        label="Delete"
                        onClick={() => removeProvider(config.id)}
                      />
                    </ActionGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
