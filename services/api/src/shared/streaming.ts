/**
 * Transforms a text stream to yield chunks on delimiter boundaries.
 * Useful for breaking up streamed AI responses into paragraphs for platforms like iMessage.
 *
 * @param stream - Async iterable of string chunks (e.g., from streamText().textStream)
 * @param delimiter - Boundary to split on (default: "\n\n")
 * @yields Text chunks split on delimiter boundaries, as soon as each is complete
 *
 * @example
 * ```ts
 * const result = streamText({ model, prompt });
 * for await (const paragraph of breakOnDelimiter(result.textStream)) {
 *   await sendToiMessage(paragraph); // Send each paragraph immediately
 * }
 * ```
 */
async function* breakOnDelimiter(
  stream: AsyncIterable<string>,
  delimiter = "\n\n"
): AsyncGenerator<string, void, unknown> {
  let buffer = "";

  for await (const chunk of stream) {
    buffer += chunk;

    let delimiterIndex: number;
    while ((delimiterIndex = buffer.indexOf(delimiter)) !== -1) {
      const textBeforeDelimiter = buffer.slice(0, delimiterIndex).trim();
      if (textBeforeDelimiter.length > 0) {
        yield textBeforeDelimiter;
      }
      buffer = buffer.slice(delimiterIndex + delimiter.length);
    }
  }

  const remaining = buffer.trim();
  if (remaining.length > 0) {
    yield remaining;
  }
}

/**
 * Stream text and yield on double newlines (paragraph boundaries).
 * Convenience function for breaking messages into paragraphs during streaming.
 */
export function breakDoubleNewlines(
  stream: AsyncIterable<string>
): AsyncGenerator<string, void, unknown> {
  return breakOnDelimiter(stream, "\n\n");
}
