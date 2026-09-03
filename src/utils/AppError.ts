export class AppError extends Error {
  public statusCode: number;
  public errors: any[];

  constructor(statusCode: number, message: string, errors: any[] = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
