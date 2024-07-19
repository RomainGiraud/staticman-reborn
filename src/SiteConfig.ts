import { t } from "elysia";
import { Value } from "@sinclair/typebox/value";

export const ParametersRequest = t.Object({
  service: t.String(),
  username: t.String(),
  project: t.String(),
  branch: t.String(),
  property: t.String(),
});

export const BodyElement = t.Record(t.String(), t.String());

export const BodyRequest = t.Object({
  fields: BodyElement,
  options: BodyElement,
});

export const SiteGeneratedFieldsDate = t.Object({
  type: t.Literal("date"),
  format: t.String(),
});
export const SiteGeneratedFields = t.Record(
  t.String(),
  t.Union([
    SiteGeneratedFieldsDate,
    t.Object({ type: t.Literal("literal"), value: t.String() }),
  ]),
);
export const SiteTransforms = t.Record(
  t.String(),
  t.Union([t.String(), t.Array(t.String())]),
);

export const SitePropertySchema = t.Object({
  allowedFields: t.Array(t.String()),
  branch: t.String(),
  commitMessage: t.String(),
  filename: t.String(),
  format: t.String(),
  generatedFields: SiteGeneratedFields,
  moderation: t.Boolean(),
  name: t.String(),
  path: t.String(),
  requiredFields: t.Array(t.String()),
  transforms: SiteTransforms,
});

export const SiteConfigSchema = t.Record(t.String(), SitePropertySchema);

export function ParseRemoteConfig(obj: unknown) {
  return Value.Decode(SiteConfigSchema, obj);
}
