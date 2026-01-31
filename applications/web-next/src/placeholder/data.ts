import type { AppViewType } from "@/components/app-view";

type NavItem = {
  label: string;
  href: string;
  view?: AppViewType;
};

export const navItems: NavItem[] = [
  { label: "Projects", href: "/projects", view: "projects" },
  { label: "Settings", href: "/settings", view: "settings" },
];

type Session = {
  id: string;
  status: "running" | "idle" | "complete";
  title: string;
  lastMessage: string;
};

type Container = {
  id: string;
  image: string;
  ports: number[];
  env: Record<string, string>;
};

type Project = {
  id: string;
  name: string;
  systemPrompt?: string;
  containers: Container[];
  sessions: Session[];
};

type ReviewableFile = {
  path: string;
  originalContent: string;
  currentContent: string;
  status: "pending" | "dismissed";
  changeType: "modified" | "created" | "deleted";
};

export const mockReviewFiles: Record<string, ReviewableFile[]> = {
  a1b2c3: [
    {
      path: "src/auth/provider.tsx",
      originalContent: `import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
}`,
      currentContent: `import { createContext, useContext, useState } from "react";

type AuthState = {
  user: User | null;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}`,
      status: "pending",
      changeType: "modified",
    },
    {
      path: "src/auth/hooks.ts",
      originalContent: "",
      currentContent: `import { useContext } from "react";
import { AuthContext } from "./provider";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}`,
      status: "pending",
      changeType: "created",
    },
  ],
  d4e5f6: [],
  x7y8z9: [
    {
      path: "src/components/theme-toggle.tsx",
      originalContent: "",
      currentContent: `export function ThemeToggle() {
  return <button>Toggle</button>;
}`,
      status: "dismissed",
      changeType: "created",
    },
  ],
};

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
};

export const mockFileTree: FileNode[] = [
  { name: "src", path: "src", type: "directory" },
  { name: "package.json", path: "package.json", type: "file" },
  { name: "tsconfig.json", path: "tsconfig.json", type: "file" },
];

export const mockFileTreeContents: Record<string, FileNode[]> = {
  src: [
    { name: "auth", path: "src/auth", type: "directory" },
    { name: "components", path: "src/components", type: "directory" },
    { name: "index.ts", path: "src/index.ts", type: "file" },
  ],
  "src/auth": [
    { name: "provider.tsx", path: "src/auth/provider.tsx", type: "file" },
    { name: "hooks.ts", path: "src/auth/hooks.ts", type: "file" },
  ],
  "src/components": [
    { name: "button.tsx", path: "src/components/button.tsx", type: "file" },
    { name: "theme-toggle.tsx", path: "src/components/theme-toggle.tsx", type: "file" },
  ],
};

export const mockFileContents: Record<string, string> = {
  "package.json": `{
  "name": "my-app",
  "version": "1.0.0"
}`,
  "src/index.ts": `export * from "./auth";
export * from "./components";`,
  "src/auth/provider.tsx": `import { createContext } from "react";
export const AuthContext = createContext(null);`,
  "src/auth/hooks.ts": `import { useContext } from "react";
import { AuthContext } from "./provider";
export function useAuth() {
  return useContext(AuthContext);
}`,
  "src/components/button.tsx": `export function Button({ children }) {
  return <button>{children}</button>;
}`,
  "src/components/theme-toggle.tsx": `export function ThemeToggle() {
  return <button>Toggle</button>;
}`,
};

export const mockProjects: Project[] = [
  {
    id: "1",
    name: "opencode-web",
    systemPrompt: "A Next.js web application for the OpenCode platform.",
    containers: [
      {
        id: "c1",
        image: "node:20-alpine",
        ports: [3000],
        env: { NODE_ENV: "development" },
      },
      {
        id: "c2",
        image: "postgres:16",
        ports: [5432],
        env: { POSTGRES_DB: "opencode", POSTGRES_USER: "admin" },
      },
    ],
    sessions: [
      {
        id: "a1b2c3",
        status: "running",
        title: "Add auth flow",
        lastMessage: "Implementing OAuth provider...",
      },
      {
        id: "d4e5f6",
        status: "complete",
        title: "Fix navbar bug",
        lastMessage:
          "Fixed click handler not closing dropdown on outside click by adding useClickOutside hook",
      },
      {
        id: "x7y8z9",
        status: "complete",
        title: "Add dark mode",
        lastMessage:
          "Added CSS variables for theme colors and a toggle component that persists preference to localStorage",
      },
      {
        id: "m1n2o3",
        status: "idle",
        title: "Optimize bundle size",
        lastMessage: "Analyzing dependencies",
      },
    ],
  },
  {
    id: "2",
    name: "api-service",
    systemPrompt: "RESTful API service with rate limiting and caching.",
    containers: [
      {
        id: "c3",
        image: "golang:1.22-alpine",
        ports: [8080],
        env: { GIN_MODE: "debug" },
      },
      {
        id: "c4",
        image: "redis:7-alpine",
        ports: [6379],
        env: {},
      },
    ],
    sessions: [
      {
        id: "g7h8i9",
        status: "idle",
        title: "Refactor endpoints",
        lastMessage: "Waiting for review",
      },
      {
        id: "p4q5r6",
        status: "running",
        title: "Add rate limiting",
        lastMessage: "Testing middleware...",
      },
      {
        id: "s7t8u9",
        status: "complete",
        title: "Fix memory leak",
        lastMessage:
          "Identified unbounded cache growth in connection pool, added TTL and max size limits",
      },
    ],
  },
  {
    id: "3",
    name: "mobile-app",
    containers: [],
    sessions: [
      {
        id: "v1w2x3",
        status: "running",
        title: "Push notifications",
        lastMessage: "Setting up Firebase...",
      },
      {
        id: "y4z5a6",
        status: "complete",
        title: "Biometric auth",
        lastMessage: "Integrated LocalAuthentication framework with fallback to passcode entry",
      },
      {
        id: "b7c8d9",
        status: "complete",
        title: "Offline mode",
        lastMessage: "Implemented offline-first architecture with SQLite and background sync queue",
      },
      {
        id: "e0f1g2",
        status: "idle",
        title: "App store submission",
        lastMessage: "Screenshots ready",
      },
      {
        id: "h3i4j5",
        status: "complete",
        title: "Deep linking",
        lastMessage: "Universal links configured",
      },
    ],
  },
  {
    id: "4",
    name: "data-pipeline",
    containers: [
      {
        id: "c5",
        image: "python:3.12-slim",
        ports: [],
        env: { PYTHONUNBUFFERED: "1" },
      },
    ],
    sessions: [
      {
        id: "k6l7m8",
        status: "complete",
        title: "ETL optimization",
        lastMessage:
          "Parallelized transformation steps and added batch processing, reduced runtime from 45min to 12min",
      },
      {
        id: "n9o0p1",
        status: "running",
        title: "Add Kafka consumer",
        lastMessage: "Processing events...",
      },
      { id: "q2r3s4", status: "idle", title: "Schema migration", lastMessage: "Backup complete" },
    ],
  },
  {
    id: "5",
    name: "design-system",
    containers: [],
    sessions: [
      {
        id: "t5u6v7",
        status: "complete",
        title: "Button variants",
        lastMessage: "All states documented",
      },
      {
        id: "w8x9y0",
        status: "complete",
        title: "Form components",
        lastMessage: "Validation working",
      },
      { id: "z1a2b3", status: "running", title: "Data tables", lastMessage: "Adding sorting..." },
      {
        id: "c4d5e6",
        status: "idle",
        title: "Charts library",
        lastMessage: "Evaluating D3 vs Recharts",
      },
      { id: "f7g8h9", status: "complete", title: "Icon set", lastMessage: "200 icons added" },
      {
        id: "i0j1k2",
        status: "complete",
        title: "Typography scale",
        lastMessage: "Fluid sizing done",
      },
    ],
  },
  {
    id: "6",
    name: "infra-terraform",
    containers: [],
    sessions: [
      {
        id: "l3m4n5",
        status: "complete",
        title: "K8s cluster setup",
        lastMessage: "3 nodes running",
      },
      {
        id: "o6p7q8",
        status: "idle",
        title: "Add monitoring",
        lastMessage: "Prometheus configured",
      },
    ],
  },
  {
    id: "7",
    name: "docs-site",
    containers: [],
    sessions: [
      {
        id: "r9s0t1",
        status: "running",
        title: "API reference",
        lastMessage: "Generating from OpenAPI...",
      },
      {
        id: "u2v3w4",
        status: "complete",
        title: "Quick start guide",
        lastMessage: "Created step-by-step tutorial with code samples for common use cases",
      },
      {
        id: "x5y6z7",
        status: "complete",
        title: "Migration guide v2",
        lastMessage: "Examples added",
      },
      { id: "a8b9c0", status: "idle", title: "Video tutorials", lastMessage: "Script drafted" },
    ],
  },
  {
    id: "8",
    name: "analytics-dashboard",
    containers: [],
    sessions: [
      {
        id: "d1e2f3",
        status: "complete",
        title: "Real-time metrics",
        lastMessage: "WebSocket streaming",
      },
      {
        id: "g4h5i6",
        status: "running",
        title: "Custom reports",
        lastMessage: "Building PDF export...",
      },
      {
        id: "j7k8l9",
        status: "complete",
        title: "User segmentation",
        lastMessage: "Cohort analysis live",
      },
    ],
  },
];
