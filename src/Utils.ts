import { YAML } from "bun";

export function createDate(format: string): string {
  const date = new Date();

  switch (format) {
    case "timestamp":
      return date.getTime().toString();

    case "timestamp-seconds":
      return Math.floor(date.getTime() / 1000).toString();

    case "iso8601":
    default:
      return date.toISOString();
  }
}

// Either an object or an array, both indexable by string key while expanding.
type Container = Record<string, unknown> & { push?: (v: unknown) => number };

export function expandSubmittedData(
  formData: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formData)) {
    const keys = key.replace(/\[/g, ".").replace(/\]/g, "").split(".");
    if (
      keys.some(
        (k) => k === "__proto__" || k === "constructor" || k === "prototype",
      )
    )
      continue; // protects agains pollution
    let r: Container = result;
    keys.forEach((e, j) => {
      if (r[e] === undefined) {
        if (keys.length - 1 == j) {
          if (Array.isArray(r)) {
            r.push(value);
          } else {
            r[e] = value;
          }
        } else if (keys[j + 1]?.length === 0 || !isNaN(Number(keys[j + 1]))) {
          r[e] = [];
        } else {
          r[e] = {};
        }
      }
      r = r[e] as Container;
    });
  }
  return result;
}

export function parseFrontmatter(
  content: string,
): Record<string, string | number> {
  const ret: Record<string, string | number> = {};

  const parts = content.split("---\n");
  const params = parts[1];
  if (params === undefined) {
    throw new Error("Invalid frontmatter format");
  }
  const message = parts[2];
  if (message === undefined) {
    throw new Error("Invalid frontmatter format");
  }

  const paramsDecoded = YAML.parse(params);
  if (typeof paramsDecoded !== "object" || paramsDecoded === null) {
    throw new Error("Invalid frontmatter format");
  }

  for (const [key, value] of Object.entries(paramsDecoded)) {
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error(
        `Invalid frontmatter format: ${key} is not a string or number`,
      );
    }
    ret[key] = value;
  }

  ret["message"] = message.trim();
  return ret;
}
