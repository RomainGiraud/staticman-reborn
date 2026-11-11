import convict from "convict";
import crypto from "crypto";
import { logger, configureLogger } from "./Logger";

export interface ServiceConfig {
  name: string;
  type: "gitlab" | "github";
  url: string;
  apiUrl: string;
  token: string;
}

type RawServiceConfig = Omit<ServiceConfig, "token"> & {
  token: string | null;
};

export function serviceTokenEnvName(name: string): string {
  return `STATICMAN_${name.toUpperCase()}_TOKEN`;
}

// The environment variable, when set, overrides the token from the file.
export function resolveServiceTokens(
  services: RawServiceConfig[],
  env: Record<string, string | undefined> = process.env,
): ServiceConfig[] {
  return services.map((service) => {
    const envName = serviceTokenEnvName(service.name);
    const token = env[envName] || service.token;
    if (!token) {
      throw new Error(
        `Service '${service.name}' has no token: set "token" in the config file or the ${envName} environment variable.`,
      );
    }
    return { ...service, token };
  });
}

convict.addFormat({
  name: "service-array",
  validate(services: unknown, schema: convict.SchemaObj) {
    if (!Array.isArray(services)) {
      throw new Error("must be of type Array");
    }
    const names = new Set<string>();
    for (const service of services) {
      convict(
        (schema as unknown as { children: convict.Schema<ServiceConfig> })
          .children,
      )
        .load(service)
        .validate();
      const key = service.name.toLowerCase();
      if (names.has(key)) {
        throw new Error(
          `duplicate service name '${service.name}' (names are case-insensitive)`,
        );
      }
      names.add(key);
    }
  },
});

export const schema = {
  akismet: {
    site: {
      doc: "URL of an Akismet account used for spam checking.",
      docExample: "http://yourdomain.com",
      format: String,
      default: null,
      nullable: true,
      env: "AKISMET_SITE",
    },
    apiKey: {
      doc: "API key to be used with Akismet.",
      format: String,
      default: null,
      nullable: true,
      env: "AKISMET_API_KEY",
    },
  },
  analytics: {
    uaTrackingId: {
      doc: "Universal Analytics account ID.",
      docExample: 'uaTrackingId: "UA-XXXX-XX"',
      format: String,
      default: null,
      nullable: true,
      env: "UA_TRACKING_ID",
    },
  },
  env: {
    doc: "The applicaton environment.",
    format: ["production", "development", "test"],
    default: "development",
    env: "NODE_ENV",
  },
  port: {
    doc: "The port to bind the application to.",
    format: "port",
    default: 3000,
    env: "PORT",
  },
  rsaPrivateKey: {
    doc: "RSA private key to encrypt sensitive configuration parameters with.",
    docExample:
      'rsaPrivateKey: "-----BEGIN RSA PRIVATE KEY-----\\nkey\\n-----END RSA PRIVATE KEY-----"',
    format: String,
    default: "",
    env: "RSA_PRIVATE_KEY",
  },
  logging: {
    level: {
      doc: "Minimum level of messages to log.",
      format: ["error", "warn", "info", "http", "verbose", "debug", "silly"],
      default: "debug",
      env: "LOG_LEVEL",
    },
    slackWebhook: {
      doc: "Slack webhook URL to pipe log output to",
      format: String,
      default: null,
      nullable: true,
      env: "SLACK_WEBHOOK",
    },
  },
  services: {
    doc: "List of services to use for storing content.",
    format: "service-array",
    default: [] as ServiceConfig[],
    children: {
      name: {
        doc: "Unique name of the service, used in the entry URL.",
        format: (val: unknown) => {
          if (typeof val !== "string" || !/^\w+$/.test(val)) {
            throw new Error(
              "must be a string containing only letters, numbers or underscores",
            );
          }
        },
        default: null,
      },
      type: {
        doc: "Type of the service.",
        format: ["gitlab", "github"],
        default: null,
      },
      url: {
        doc: "URL of the service.",
        format: String,
        default: null,
      },
      apiUrl: {
        doc: "API URL of the service.",
        format: String,
        default: null,
      },
      token: {
        doc: "Token to be used with the service. Can be omitted if the STATICMAN_<NAME>_TOKEN environment variable is set (it takes precedence).",
        format: String,
        default: null,
        nullable: true,
      },
    },
  },
};

export const Config = convict(schema);

const filename = `config.${Config.get("env")}.json`;
Config.loadFile(filename);
Config.validate();
Config.set(
  "services",
  resolveServiceTokens(Config.get("services") as RawServiceConfig[]),
);

configureLogger(Config.get("env"), Config.get("logging.level"));
logger.info(`(*) Local config file loaded: ${filename}`);

export const PrivateKey = crypto.createPrivateKey(
  Buffer.from(Config.get("rsaPrivateKey")),
);
export const PublicKey = crypto.createPublicKey(PrivateKey);
