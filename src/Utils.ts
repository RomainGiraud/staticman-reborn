export interface Parameters {
  service: string;
  username: string;
  project: string;
  branch: string;
  property: string;
}

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

export function formDataToJson(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    const keys = key.replace(/\[/g, ".").replace(/\]/g, "").split(".");
    keys.reduce(function (r, e, j) {
      if (!r[e]) {
        if (keys.length - 1 == j) {
          if (Array.isArray(r)) {
            r.push(value);
          } else {
            r[e] = value;
          }
        } else if (!isNaN(Number(keys[j + 1])) || keys[j + 1].length == 0) {
          if (Array.isArray(r)) {
            r.push([]);
            return r[r.length - 1];
          } else {
            r[e] = [];
          }
        } else {
          if (Array.isArray(r)) {
            if (r.length === 0 || r[r.length - 1][keys[j + 1]] !== undefined) {
              r.push({});
            }
            return r[r.length - 1];
          } else {
            r[e] = {};
          }
        }
      }
      return r[e];
    }, result);
  }
  return result;
}
