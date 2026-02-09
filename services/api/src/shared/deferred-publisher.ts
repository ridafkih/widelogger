import type { Publisher } from "../types/dependencies";
import { InternalError, ServiceUnavailableError } from "./errors";

export class DeferredPublisher {
  private publisher: Publisher | null = null;

  resolve(publisher: Publisher): void {
    if (this.publisher) {
      throw new InternalError(
        "DeferredPublisher already resolved",
        "PUBLISHER_ALREADY_RESOLVED"
      );
    }
    this.publisher = publisher;
  }

  get(): Publisher {
    if (!this.publisher) {
      throw new ServiceUnavailableError(
        "DeferredPublisher not yet resolved - call resolve() first",
        "PUBLISHER_NOT_RESOLVED"
      );
    }
    return this.publisher;
  }
}
