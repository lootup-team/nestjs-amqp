export const QueuesFromDecoratorsContainer = new Set<string>();

export class FailedPolicyException extends Error {
  readonly innerException: { stack: string; message: string };
  constructor(innerException: any) {
    super(`Failed Policy Exception`);
    this.innerException = {
      message: innerException.message,
      stack: innerException.stack,
    };
  }
}
