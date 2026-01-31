"use client";

import { useState } from "react";
import { Heading } from "@lab/ui/components/heading";
import { Copy } from "@lab/ui/components/copy";
import { Button } from "@lab/ui/components/button";
import { Input } from "@lab/ui/components/input";
import { FormField } from "@lab/ui/components/form-field";
import { Divider } from "@lab/ui/components/divider";

export default function GitSettingsPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const handleSave = () => {
    const settings = { username, email };
    console.log("Saving git settings:", settings);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Heading as="h2" size="xl">
            Git Settings
          </Heading>
          <Copy muted>Configure the git identity used by agents across all sessions.</Copy>
        </div>

        <div className="flex flex-col gap-6">
          <FormField label="Username" hint="The name that will appear in git commits">
            <Input
              value={username}
              onChange={(event) => setUsername(event.currentTarget.value)}
              placeholder="John Doe"
            />
          </FormField>

          <FormField label="Email" hint="The email that will appear in git commits">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="john@acme.com"
            />
          </FormField>

          <Divider />

          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleSave}
            disabled={!username.trim() || !email.trim()}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
