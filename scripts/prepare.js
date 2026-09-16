console.log("Preparing the project...");
if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === undefined
) {
  try {
    require.resolve("husky");
  } catch {
    process.exit(0); // devDependencies not installed -> production install
  }
  require("child_process").execSync("husky", { stdio: "inherit" });
}
