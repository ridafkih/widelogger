export function buildProjectResolutionPrompt(
  task: string,
  projectContext: string
): string {
  return `You are a project routing assistant. Given a user's task and a list of available projects, determine which project the task should be routed to.

## Available Projects

${projectContext}

## User's Task

"${task}"

## Instructions

Analyze the task and determine which project it should be routed to. Consider:
1. Keywords and terminology in the task that match project names or descriptions
2. The intent of the task and which project's purpose best aligns with it
3. Any explicit or implicit references to specific projects

Respond with a JSON object in exactly this format:
{
  "projectId": "<the UUID of the selected project>",
  "projectName": "<the name of the selected project>",
  "confidence": "<high|medium|low>",
  "reasoning": "<brief explanation of why this project was selected>"
}

If the task is ambiguous or could apply to multiple projects equally, use "medium" or "low" confidence.
If there's only one project or the task clearly matches a specific project, use "high" confidence.

Respond ONLY with the JSON object, no additional text.`;
}
