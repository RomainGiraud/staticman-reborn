import convict from "convict";

const schema = {
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
  githubAccessTokenUri: {
    doc: "URI for the GitHub authentication provider.",
    format: String,
    default: "https://github.com/login/oauth/access_token",
    env: "GITHUB_ACCESS_TOKEN_URI",
  },
  githubAppID: {
    doc: "ID of the GitHub App.",
    format: String,
    default: null,
    nullable: true,
    env: "GITHUB_APP_ID",
  },
  githubBaseUrl: {
    doc: "Base URL for the GitHub API.",
    format: String,
    default: "https://api.github.com",
    env: "GITHUB_BASE_URL",
  },
  githubPrivateKey: {
    doc: "Private key for the GitHub App.",
    format: String,
    default: null,
    nullable: true,
    env: "GITHUB_PRIVATE_KEY",
  },
  githubToken: {
    doc: "Access token to the GitHub account (legacy)",
    format: String,
    default: null,
    nullable: true,
    env: "GITHUB_TOKEN",
  },
  gitlabAccessTokenUri: {
    doc: "URI for the GitLab authentication provider.",
    format: String,
    default: "https://gitlab.com/oauth/token",
    env: "GITLAB_ACCESS_TOKEN_URI",
  },
  gitlabBaseUrl: {
    doc: "Base URL for the GitLab API.",
    format: String,
    default: "https://gitlab.com",
    env: "GITLAB_BASE_URL",
  },
  gitlabToken: {
    doc: "Access token to the GitLab account being used to push files with.",
    format: String,
    default: null,
    nullable: true,
    env: "GITLAB_TOKEN",
  },
  port: {
    doc: "The port to bind the application to.",
    format: "port",
    default: 0,
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
    slackWebhook: {
      doc: "Slack webhook URL to pipe log output to",
      format: String,
      default: null,
      nullable: true,
      env: "SLACK_WEBHOOK",
    },
  },
};

const conf = convict(schema);

const filename = `config.${conf.get("env")}.json`;
conf.loadFile(filename);
conf.validate();

console.log(`(*) Local config file loaded ${filename}`);

export default conf;
export { schema };
