"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Nav } from "@/components/nav";
import { ProjectList } from "@/components/project-list";
import { ProjectItem } from "@/components/project-item";
import { SessionItem } from "@/components/session-item";
import { PromptInput } from "@/components/prompt-input";

const navItems = [
  { label: "Projects", href: "/projects" },
  { label: "My Recent", href: "/recent" },
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/settings" },
];

const mockProjects = [
  {
    id: "1",
    name: "opencode-web",
    sessions: [
      {
        id: "a1b2c3",
        status: "running" as const,
        title: "Add auth flow",
        lastMessage: "Implementing OAuth provider...",
      },
      { id: "d4e5f6", status: "complete" as const, title: "Fix navbar bug", lastMessage: "Done" },
    ],
  },
  {
    id: "2",
    name: "api-service",
    sessions: [
      {
        id: "g7h8i9",
        status: "idle" as const,
        title: "Refactor endpoints",
        lastMessage: "Waiting for review",
      },
    ],
  },
];

export default function Page() {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="flex h-screen">
      <Sidebar
        nav={<Nav items={navItems} activeHref="/projects" />}
        footer={
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={() => {
              console.log("Submit:", prompt);
              setPrompt("");
            }}
          />
        }
      >
        <ProjectList>
          {mockProjects.map((project) => (
            <ProjectItem
              key={project.id}
              name={project.name}
              sessionCount={project.sessions.length}
              onAddSession={() => console.log("Add session to", project.name)}
            >
              {project.sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  status={session.status}
                  hash={session.id}
                  title={session.title}
                  lastMessage={session.lastMessage}
                />
              ))}
            </ProjectItem>
          ))}
        </ProjectList>
      </Sidebar>
      <main className="w-1/2 bg-neutral-50" />
    </div>
  );
}
