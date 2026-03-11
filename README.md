# lab.rida.dev

This is a background agent inspired by [Ramp Inspect](https://builders.ramp.com/post/why-we-built-our-background-agent) and powered by Bun, Docker, OpenCode and Vercel's `agent-browser`.

> [!CAUTION]
>
> This repository is experimental, please proceed with caution and only deploy in a secure environment!

Create projects with pre-defined container configurations, and spin up agents whether through manual provisioning or through an orchestrator. You can speak to the orchestrator through the chat platform of your choice. The agent has access to a browser, can see its logs, take screenshots and evaluate styles and loop you into changes.

## How do I use this?

More detailed instructions will be coming soon, but essentially once you've got it running -

1. Configure one or more projects
   1. Provide one or more development Docker images, this cluster will be spawned for each new session.
   2. Describe the project to The Orchestrator to help it know when to spawn the cluster of containers.
2. Give a demand to The Orchestrator
   1. Use a messaging platform of your choice, iMessage is currently supported aside from the web UI.
   2. A session will spawn, and the agent will immediately begin working to see your demand through.
3. All done!

Once the process is finished, you'll be able to immediately preview your changes.

---

## Screenshot

On the left, we have a list of sessions which you can work on and observe in parallel. You can chat, review, view a stream or live-view of logs, and more. 

<img width="1507" height="800" alt="CleanShot 2026-02-06 at 03 44 20" src="https://github.com/user-attachments/assets/a433b4d9-2e38-4b48-a95e-dafc525597fc" />

## Disclaimer

This README is placeholder. More details will be added soon as my schedule frees
