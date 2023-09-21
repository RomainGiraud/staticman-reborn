export default class BaseError extends Error {
  constructor(name: string, message: string, options = {}) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;

    Error.captureStackTrace(this);
  }

  toString() {
    return `${this.name}: ${JSON.stringify(this.message)}`;
  }
}

export class GitError extends BaseError {
  constructor(message: string, options = {}) {
    super("GitError", message, options);
  }
}
