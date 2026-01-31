import type { ChatMessage } from "@/components/chat";

export const mockMessages: Record<string, ChatMessage[]> = {
  // opencode-web: Add auth flow
  a1b2c3: [
    { id: "1", role: "user", content: "Add OAuth authentication to the app" },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll help you add OAuth authentication. Let me start by setting up the provider configuration and creating the necessary API routes.",
    },
    { id: "3", role: "user", content: "Use Google and GitHub as providers" },
    {
      id: "4",
      role: "assistant",
      content:
        "I've set up both providers. For Google, I'm using the `google` provider from next-auth with the required scopes for email and profile. For GitHub, I've configured it to request `read:user` and `user:email` scopes.\n\nI've created the auth configuration in `src/lib/auth.ts` and added the API route at `src/app/api/auth/[...nextauth]/route.ts`.\n\nYou'll need to add these environment variables:\n- GOOGLE_CLIENT_ID\n- GOOGLE_CLIENT_SECRET\n- GITHUB_CLIENT_ID\n- GITHUB_CLIENT_SECRET",
    },
    { id: "5", role: "user", content: "Can you add a sign in button component?" },
    {
      id: "6",
      role: "assistant",
      content:
        "Created `src/components/sign-in-button.tsx` with buttons for both providers. The component uses the `signIn` function from next-auth/react and displays provider-specific icons. I've also added loading states and error handling.",
    },
  ],

  // opencode-web: Fix navbar bug
  d4e5f6: [
    { id: "1", role: "user", content: "The navbar dropdown isn't closing on click outside" },
    {
      id: "2",
      role: "assistant",
      content:
        "I found the issue. The click outside handler was being registered but the event listener wasn't properly cleaned up on unmount, causing memory leaks and inconsistent behavior.\n\nI've created a `useClickOutside` hook that properly handles cleanup and added it to the dropdown component. The dropdown now closes when clicking anywhere outside of it.",
    },
  ],

  // opencode-web: Add dark mode
  x7y8z9: [
    { id: "1", role: "user", content: "Add dark mode support to the app" },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll implement dark mode using CSS custom properties for theming. This approach allows for smooth transitions and easy maintenance.",
    },
    { id: "3", role: "user", content: "Make sure it persists across sessions" },
    {
      id: "4",
      role: "assistant",
      content:
        "Done. I've added:\n\n1. CSS variables in `globals.css` for both light and dark themes\n2. A `ThemeProvider` component that reads from localStorage on mount\n3. A `ThemeToggle` component with a smooth icon transition\n4. System preference detection as the default\n\nThe theme preference is stored in localStorage under the key `theme` and syncs across tabs using the storage event.",
    },
  ],

  // api-service: Refactor endpoints
  g7h8i9: [
    {
      id: "1",
      role: "user",
      content: "Refactor the API endpoints to use the new router pattern",
    },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll migrate the endpoints from the old express-style handlers to the new app router pattern. This will involve:\n\n1. Moving files from `pages/api` to `app/api`\n2. Converting handlers to use the new Request/Response API\n3. Updating middleware to use the new pattern\n\nWould you like me to start with a specific endpoint as a reference?",
    },
  ],

  // api-service: Add rate limiting
  p4q5r6: [
    { id: "1", role: "user", content: "Add rate limiting to the API" },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll implement rate limiting using a sliding window algorithm. This provides better protection against burst traffic compared to fixed windows.",
    },
    { id: "3", role: "user", content: "Use Redis for the backing store" },
    {
      id: "4",
      role: "assistant",
      content:
        "I've set up Redis-backed rate limiting with the following configuration:\n\n- 100 requests per minute for authenticated users\n- 20 requests per minute for anonymous users\n- Custom limits per endpoint using route metadata\n\nThe middleware is in `src/middleware/rate-limit.ts` and uses atomic Redis operations to ensure accuracy under high concurrency.",
    },
    { id: "5", role: "user", content: "Add headers to show remaining quota" },
    {
      id: "6",
      role: "assistant",
      content:
        "Added standard rate limit headers to all responses:\n\n- `X-RateLimit-Limit`: Maximum requests allowed\n- `X-RateLimit-Remaining`: Requests remaining in window\n- `X-RateLimit-Reset`: Unix timestamp when the window resets\n\nClients can use these to implement backoff strategies.",
    },
  ],

  // api-service: Fix memory leak
  s7t8u9: [
    { id: "1", role: "user", content: "The API server memory usage keeps growing" },
    {
      id: "2",
      role: "assistant",
      content: "I'll investigate the memory usage. Let me add some profiling to identify the leak.",
    },
    {
      id: "3",
      role: "assistant",
      content:
        "Found it. The connection pool was caching connections indefinitely without any eviction policy. I've added:\n\n1. TTL of 30 minutes for idle connections\n2. Maximum pool size of 50 connections\n3. Automatic cleanup of stale connections every 5 minutes\n\nMemory usage should now stay stable around 200MB instead of growing unbounded.",
    },
  ],

  // mobile-app: Push notifications
  v1w2x3: [
    { id: "1", role: "user", content: "Set up push notifications for the mobile app" },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll configure Firebase Cloud Messaging for cross-platform push notifications. Starting with the Firebase project setup and native configuration.",
    },
    { id: "3", role: "user", content: "Support both iOS and Android" },
    {
      id: "4",
      role: "assistant",
      content:
        "I've configured FCM for both platforms:\n\n**iOS:**\n- Added APNs key to Firebase console\n- Configured `AppDelegate` for notification handling\n- Added required capabilities in Xcode\n\n**Android:**\n- Added `google-services.json`\n- Configured notification channels for Android 8+\n- Set up the `FirebaseMessagingService`\n\nCurrently implementing the token registration flow...",
    },
  ],

  // mobile-app: Biometric auth
  y4z5a6: [
    { id: "1", role: "user", content: "Add Face ID and fingerprint authentication" },
    {
      id: "2",
      role: "assistant",
      content:
        "I've integrated biometric authentication using the LocalAuthentication framework on iOS and BiometricPrompt on Android.\n\nThe implementation includes:\n- Availability check before showing the biometric option\n- Graceful fallback to passcode/PIN entry\n- Secure storage of auth tokens in Keychain/Keystore\n- Re-authentication requirement after 5 minutes of inactivity",
    },
  ],

  // data-pipeline: ETL optimization
  k6l7m8: [
    { id: "1", role: "user", content: "The ETL job is taking too long, it's at 45 minutes now" },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll analyze the pipeline to find bottlenecks. Looking at the current implementation...",
    },
    {
      id: "3",
      role: "assistant",
      content:
        "Found several optimization opportunities:\n\n1. **Sequential processing** - Transformation steps were running one after another. Parallelized independent steps using asyncio.\n\n2. **Row-by-row inserts** - Changed to batch inserts of 1000 rows at a time.\n\n3. **Missing indexes** - Added indexes on frequently queried columns in the staging tables.\n\n4. **Unnecessary data loading** - Added column projection to only load required fields.\n\nTotal runtime reduced from 45 minutes to 12 minutes.",
    },
  ],

  // data-pipeline: Add Kafka consumer
  n9o0p1: [
    { id: "1", role: "user", content: "Add a Kafka consumer for the event stream" },
    {
      id: "2",
      role: "assistant",
      content:
        "Setting up the Kafka consumer with the confluent-kafka library. I'll configure it for at-least-once delivery with manual offset commits.",
    },
    { id: "3", role: "user", content: "Handle backpressure gracefully" },
    {
      id: "4",
      role: "assistant",
      content:
        "Implemented backpressure handling:\n\n- Configurable batch size (default 100 messages)\n- Processing timeout with automatic partition pause\n- Dead letter queue for failed messages\n- Metrics for consumer lag monitoring\n\nProcessing events now at ~5000/second with stable memory usage.",
    },
  ],

  // design-system: Data tables
  z1a2b3: [
    { id: "1", role: "user", content: "Create a data table component for the design system" },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll build a flexible DataTable component with sorting, pagination, and selection. Starting with the core table structure.",
    },
    { id: "3", role: "user", content: "Add column resizing and reordering" },
    {
      id: "4",
      role: "assistant",
      content:
        "Added interactive column features:\n\n- **Resizing**: Drag column borders to resize. Minimum width enforced.\n- **Reordering**: Drag column headers to reorder. Visual indicator shows drop position.\n- **Persistence**: Column state saved to localStorage per table ID.\n\nCurrently adding keyboard navigation for accessibility...",
    },
  ],

  // docs-site: Quick start guide
  u2v3w4: [
    { id: "1", role: "user", content: "Write a quick start guide for new users" },
    {
      id: "2",
      role: "assistant",
      content:
        "I've created a comprehensive quick start guide covering:\n\n1. **Installation** - npm/yarn/pnpm commands with version requirements\n2. **Basic Setup** - Minimal configuration to get started\n3. **First API Call** - Working code example with explanation\n4. **Common Patterns** - Authentication, error handling, pagination\n5. **Next Steps** - Links to advanced topics\n\nEach section includes copy-paste code samples that work out of the box.",
    },
  ],

  // analytics-dashboard: Real-time metrics
  d1e2f3: [
    { id: "1", role: "user", content: "Add real-time metrics to the dashboard" },
    {
      id: "2",
      role: "assistant",
      content:
        "Implemented WebSocket-based real-time updates:\n\n- Server pushes metric updates every second\n- Client reconnects automatically on disconnect\n- Smooth chart animations for incoming data points\n- 5-minute sliding window for trend visualization\n\nThe dashboard now shows live user count, request rate, and error percentage.",
    },
  ],

  // analytics-dashboard: Custom reports
  g4h5i6: [
    { id: "1", role: "user", content: "Add ability to create custom reports" },
    {
      id: "2",
      role: "assistant",
      content:
        "I'll build a report builder with drag-and-drop metrics and configurable visualizations.",
    },
    { id: "3", role: "user", content: "Need to export to PDF" },
    {
      id: "4",
      role: "assistant",
      content:
        "Working on PDF export using react-pdf. The export will include:\n\n- Company logo and report title\n- Date range and applied filters\n- All charts rendered as high-resolution images\n- Data tables with pagination\n- Summary statistics\n\nGenerating the first test export now...",
    },
  ],
};
