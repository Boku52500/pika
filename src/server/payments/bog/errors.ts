export class BogApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "BogApiError";
    this.status = status;
    this.code = code;
  }
}

export class BogNotConfiguredError extends Error {
  constructor() {
    super("BOG payments are not configured");
    this.name = "BogNotConfiguredError";
  }
}
