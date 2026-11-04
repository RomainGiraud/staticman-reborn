import { version } from "../package.json";

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: ".",
  naming: "bundle.js",
  target: "bun",
  minify: true,
  sourcemap: "none",
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}
