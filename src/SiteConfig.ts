import { z } from "zod";

export const SitePropertySchema = z.object({
  allowedFields: z.array(z.string()),
  branch: z.string(),
  commitMessage: z.string(),
  filename: z.string(),
  format: z.string(),
  generatedFields: z.record(z.string(), z.discriminatedUnion("type", [
    z.object({ type: z.literal("date"), format: z.string() }),
    z.object({ type: z.literal("literal"), value: z.string() }),
  ])),
  moderation: z.boolean(),
  name: z.string(),
  path: z.string(),
  requiredFields: z.array(z.string()),
  transforms: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
}).strict();

export const SiteConfigSchema = z.record(z.string(), SitePropertySchema);

export function ParseRemoteConfig(obj: any) {
  return SiteConfigSchema.safeParse(obj);
}
