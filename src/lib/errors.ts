export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "发生未知错误，请稍后再试";
}
