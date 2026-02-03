import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod/v4";
import type { ToolContext } from "../types/tool";
import { config } from "../config/environment";

interface ScreenshotResponse {
  sessionId: string;
  timestamp: number;
  format: string;
  encoding: string;
  data: string;
}

async function fetchScreenshot(sessionId: string): Promise<ScreenshotResponse | null> {
  const response = await fetch(`${config.apiBaseUrl}/internal/sessions/${sessionId}/screenshot`);
  if (!response.ok) return null;
  return response.json();
}

function createS3Client(): S3Client {
  return new S3Client({
    endpoint: config.rustfs.endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: config.rustfs.accessKey,
      secretAccessKey: config.rustfs.secretKey,
    },
    forcePathStyle: true,
  });
}

async function uploadToRustFS(data: Buffer, filename: string): Promise<string> {
  const s3 = createS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: config.rustfs.bucket,
      Key: filename,
      Body: data,
      ContentType: "image/png",
    }),
  );

  return `${config.rustfs.publicUrl}/${config.rustfs.bucket}/${filename}`;
}

export function screenshot(server: McpServer, _context: ToolContext) {
  server.registerTool(
    "screenshot",
    {
      description:
        "Capture a screenshot of the browser session. Returns a public URL to the screenshot image.",
      inputSchema: {
        sessionId: z.string().describe("The Lab session ID (provided in the system prompt)"),
      },
    },
    async (args) => {
      const screenshotData = await fetchScreenshot(args.sessionId);
      if (!screenshotData) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Could not capture screenshot for session "${args.sessionId}". The session may not exist or the browser may not be running.`,
            },
          ],
        };
      }

      const buffer = Buffer.from(screenshotData.data, "base64");
      const filename = `${args.sessionId}/${screenshotData.timestamp}.png`;

      try {
        const url = await uploadToRustFS(buffer, filename);
        return {
          content: [
            {
              type: "text",
              text: `Screenshot captured successfully.\n\nURL: ${url}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Failed to upload screenshot: ${message}`,
            },
          ],
        };
      }
    },
  );
}
