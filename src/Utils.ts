export interface Parameters {
  service: string;
  username: string;
  project: string;
  branch: string;
  property: string;
}

export type Fields = Record<string, string>;
export type BodyRequest = Record<string, Fields[]>;
export type Transforms = Record<string, string | string[]>;

export function createDate(options: any): string {
  options = options || {};

  const date = new Date();

  switch (options["format"]) {
    case "timestamp":
      return date.getTime().toString();

    case "timestamp-seconds":
      return Math.floor(date.getTime() / 1000).toString();

    case "iso8601":
    default:
      return date.toISOString();
  }
}
