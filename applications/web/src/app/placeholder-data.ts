export type Session = {
  id: string;
  title: string;
  status: "pending" | "working" | "completed";
  lastMessage?: {
    from: "ai" | "user";
    content: string;
  };
};

export type Project = {
  id: string;
  name: string;
  sessions: Session[];
};

export const PLACEHOLDER_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "calendar-sync",
    sessions: [
      {
        id: "e5f6g7h8",
        title: "Ensure all day events show correctly in destination calendar",
        status: "working",
        lastMessage: {
          from: "ai",
          content:
            "I found the issue - the isAllDay flag isn't being propagated through the transformer. Let me fix that now.",
        },
      },
      {
        id: "m3n4o5p6",
        title: "Fix duplicate events on move",
        status: "working",
        lastMessage: { from: "ai", content: "Found the race condition in the sync loop" },
      },
      {
        id: "q7r8s9t0",
        title: "Debug 502 error on Google destination insert",
        status: "pending",
        lastMessage: {
          from: "user",
          content:
            "Can you check the API logs for this? I think it might be a rate limiting issue on Google's end.",
        },
      },
      {
        id: "v6w7x8y9",
        title: "Add batch sync for large calendars",
        status: "completed",
        lastMessage: { from: "ai", content: "Deployed to production" },
      },
      {
        id: "z0a1b2c3",
        title: "Fix timezone handling for recurring events",
        status: "working",
        lastMessage: { from: "ai", content: "Testing with DST edge cases" },
      },
      { id: "d4e5f6g7", title: "Support iCloud calendar as source", status: "pending" },
      {
        id: "h8i9j0k1",
        title: "Add conflict resolution for overlapping events",
        status: "pending",
        lastMessage: { from: "user", content: "Waiting on design spec" },
      },
      {
        id: "l2m3n4o5",
        title: "Implement webhook for real-time sync",
        status: "completed",
        lastMessage: { from: "ai", content: "All tests passing" },
      },
    ],
  },
  {
    id: "proj-2",
    name: "agent-playground",
    sessions: [
      {
        id: "a1b2c3d4",
        title: "Add support for tasks",
        status: "completed",
        lastMessage: { from: "ai", content: "Merged to main" },
      },
      {
        id: "i9j0k1l2",
        title: "Add Support for Contacts (CardDAV)",
        status: "pending",
        lastMessage: {
          from: "ai",
          content:
            "I've been researching the CardDAV spec. It's quite extensive - do you want full read/write support or just read-only for now?",
        },
      },
      { id: "r2s3t4u5", title: "Implement OAuth refresh token rotation", status: "pending" },
      {
        id: "p6q7r8s9",
        title: "Create agent memory persistence layer",
        status: "working",
        lastMessage: {
          from: "user",
          content: "Let's go with Redis for now, we can always migrate later",
        },
      },
      {
        id: "t0u1v2w3",
        title: "Add streaming response support",
        status: "completed",
        lastMessage: { from: "ai", content: "Works with SSE now" },
      },
      {
        id: "x4y5z6a7",
        title: "Implement tool use validation",
        status: "working",
        lastMessage: { from: "ai", content: "Adding JSON schema validation" },
      },
      {
        id: "b8c9d0e1",
        title: "Add rate limiting per user",
        status: "pending",
        lastMessage: { from: "user", content: "Need to decide on limits" },
      },
    ],
  },
  {
    id: "proj-3",
    name: "marketing-site",
    sessions: [
      {
        id: "f2g3h4i5",
        title: "Update hero section copy",
        status: "completed",
        lastMessage: { from: "ai", content: "Copy approved by marketing" },
      },
      {
        id: "j6k7l8m9",
        title: "Add testimonials carousel",
        status: "working",
        lastMessage: {
          from: "ai",
          content: "Implementing autoplay with a 5 second interval. Should I add pause on hover?",
        },
      },
      { id: "n0o1p2q3", title: "Implement dark mode toggle", status: "pending" },
      {
        id: "r4s5t6u7",
        title: "Fix mobile nav hamburger menu",
        status: "completed",
        lastMessage: { from: "ai", content: "Fixed z-index issue" },
      },
      {
        id: "v8w9x0y1",
        title: "Add pricing comparison table",
        status: "pending",
        lastMessage: { from: "user", content: "Waiting on final pricing from the team" },
      },
      {
        id: "z2a3b4c5",
        title: "Integrate with analytics",
        status: "completed",
        lastMessage: { from: "ai", content: "GA4 events firing correctly" },
      },
      {
        id: "d6e7f8g9",
        title: "SEO meta tags for all pages",
        status: "working",
        lastMessage: { from: "ai", content: "Adding OpenGraph tags" },
      },
      { id: "h0i1j2k3", title: "Add blog section with MDX support", status: "pending" },
      {
        id: "l4m5n6o7",
        title: "Create changelog page",
        status: "pending",
        lastMessage: { from: "user", content: "Looking at existing changelog formats" },
      },
    ],
  },
  {
    id: "proj-4",
    name: "api-gateway",
    sessions: [
      {
        id: "p8q9r0s1",
        title: "Add request validation middleware",
        status: "completed",
        lastMessage: { from: "ai", content: "Using Zod for validation" },
      },
      {
        id: "t2u3v4w5",
        title: "Implement circuit breaker pattern",
        status: "working",
        lastMessage: {
          from: "ai",
          content:
            "Testing failure thresholds - currently set to 5 failures in 30 seconds before opening the circuit",
        },
      },
      { id: "x6y7z8a9", title: "Add OpenAPI spec generation", status: "pending" },
      {
        id: "b0c1d2e3",
        title: "Fix CORS preflight caching",
        status: "completed",
        lastMessage: { from: "ai", content: "Added Access-Control-Max-Age" },
      },
      {
        id: "f4g5h6i7",
        title: "Add request/response logging",
        status: "completed",
        lastMessage: { from: "ai", content: "Redacting sensitive fields" },
      },
      {
        id: "j8k9l0m1",
        title: "Implement API versioning strategy",
        status: "pending",
        lastMessage: {
          from: "user",
          content: "I prefer URL versioning like /v1/users over header versioning",
        },
      },
    ],
  },
  {
    id: "proj-5",
    name: "mobile-app",
    sessions: [
      {
        id: "n2o3p4q5",
        title: "Fix iOS push notification permissions",
        status: "working",
        lastMessage: { from: "ai", content: "Testing on iOS 17" },
      },
      { id: "r6s7t8u9", title: "Add biometric authentication", status: "pending" },
      {
        id: "v0w1x2y3",
        title: "Implement offline mode with sync",
        status: "working",
        lastMessage: {
          from: "ai",
          content:
            "Queue persists to SQLite now. When the app comes back online, it'll sync in order.",
        },
      },
      {
        id: "z4a5b6c7",
        title: "Fix Android back button handling",
        status: "completed",
        lastMessage: { from: "ai", content: "Using BackHandler correctly" },
      },
      {
        id: "d8e9f0g1",
        title: "Add deep linking support",
        status: "pending",
        lastMessage: { from: "user", content: "Setting up URL schemes" },
      },
      {
        id: "h2i3j4k5",
        title: "Optimize image loading and caching",
        status: "completed",
        lastMessage: { from: "ai", content: "Using FastImage" },
      },
      {
        id: "l6m7n8o9",
        title: "Add pull-to-refresh animation",
        status: "completed",
        lastMessage: { from: "ai", content: "Lottie animation added" },
      },
      { id: "p0q1r2s3", title: "Implement in-app purchases", status: "pending" },
      {
        id: "t4u5v6w7",
        title: "Fix memory leak in chat view",
        status: "working",
        lastMessage: {
          from: "ai",
          content: "Profiling with Instruments - looks like FlatList is holding onto old messages",
        },
      },
      { id: "x8y9z0a1", title: "Add haptic feedback for actions", status: "pending" },
    ],
  },
  {
    id: "proj-6",
    name: "data-pipeline",
    sessions: [
      {
        id: "b2c3d4e5",
        title: "Fix Kafka consumer lag",
        status: "working",
        lastMessage: { from: "ai", content: "Increasing partition count" },
      },
      { id: "f6g7h8i9", title: "Add dead letter queue handling", status: "pending" },
      {
        id: "j0k1l2m3",
        title: "Implement exactly-once semantics",
        status: "pending",
        lastMessage: { from: "ai", content: "Reading Kafka transactions docs" },
      },
      {
        id: "n4o5p6q7",
        title: "Add data quality checks",
        status: "completed",
        lastMessage: { from: "ai", content: "Great Expectations integrated" },
      },
      {
        id: "r8s9t0u1",
        title: "Optimize Spark job partitioning",
        status: "working",
        lastMessage: {
          from: "user",
          content: "Repartition by date, we always query by date ranges",
        },
      },
    ],
  },
  {
    id: "proj-7",
    name: "auth-service",
    sessions: [
      { id: "v2w3x4y5", title: "Add SAML SSO support", status: "pending" },
      {
        id: "z6a7b8c9",
        title: "Fix session invalidation on password change",
        status: "completed",
        lastMessage: { from: "ai", content: "Invalidating all tokens now" },
      },
      {
        id: "d0e1f2g3",
        title: "Implement MFA with TOTP",
        status: "working",
        lastMessage: { from: "ai", content: "QR code generation working" },
      },
      {
        id: "h4i5j6k7",
        title: "Add passwordless magic link auth",
        status: "pending",
        lastMessage: { from: "user", content: "Make sure the links expire after 15 minutes" },
      },
      {
        id: "l8m9n0o1",
        title: "Fix JWT refresh race condition",
        status: "completed",
        lastMessage: { from: "ai", content: "Using mutex for refresh" },
      },
      {
        id: "p2q3r4s5",
        title: "Add audit logging for auth events",
        status: "working",
        lastMessage: { from: "ai", content: "Logging to separate table" },
      },
      { id: "t6u7v8w9", title: "Implement account lockout policy", status: "pending" },
    ],
  },
];
