"use client";

import { Button } from "@/components/button";
import { CenteredLayout } from "@/components/centered-layout";
import { signIn } from "@/lib/auth-client";

function handleGitHubSignIn() {
  signIn.social({ provider: "github", callbackURL: window.location.origin });
}

export default function LoginPage() {
  return (
    <div className="flex h-screen flex-col">
      <CenteredLayout.Root>
        <CenteredLayout.Hero>
          <div className="flex w-full flex-col gap-2">
            <h1 className="font-medium text-text">Sign in to Lab</h1>
            <p className="text-text-muted">
              Authenticate with GitHub to continue.
            </p>
            <div className="pt-2">
              <Button onClick={handleGitHubSignIn}>Sign in with GitHub</Button>
            </div>
          </div>
        </CenteredLayout.Hero>
      </CenteredLayout.Root>
    </div>
  );
}
