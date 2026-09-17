import { generateKeyPairSync } from "crypto";
import { existsSync, writeFileSync } from "fs";

const path = "config.test.json";

if (existsSync(path)) {
  console.log(`${path} already exists, skipping.`);
  process.exit(0);
}

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "pkcs1", format: "pem" },
});

writeFileSync(
  path,
  JSON.stringify(
    {
      gitlabToken: "test-token",
      githubToken: "test-token",
      rsaPrivateKey: privateKey,
    },
    null,
    2,
  ),
);

console.log(`Generated ${path}`);
