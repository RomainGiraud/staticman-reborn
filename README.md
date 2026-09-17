# Staticman Reborn

## Purpose

Since [Staticman](https://staticman.net/) is not maintained anymore. The idea was incredible so I've decided to revive a similar tool with recent frameworks.

## Usage

You must specify the following URL in your form: `http://myinstance.org/entry/:version/:service/:username/:project/:branch/:property`.

With the following placeholders:

- version: v1
- service: `gitlab` or `github`
- username: your username for the wanted project
- project: the project name
- branch: the target branch
- property: top level property of staticman.yaml file

A single staticman.yaml can have multiples properties to address several types of post.

For a list of available transformers, see `src/Transformers.ts`.

Generate a key for encryption:

```bash
ssh-keygen -m PEM -t rsa -b 4096 -f key.pem
```

To decrypt an encrypted field:

```bash
echo "$field" | base64 -d - | openssl pkeyutl -decrypt -inkey priv.pem -pkeyopt rsa_padding_mode:oaep -in -
```

## Test

Tests need a local `config.test.json` with a throwaway RSA key (not a real secret, just needs to be a valid key). Generate one once:

```bash
bun run scripts/generate-test-config.ts
```

Then run the full functional test suite (with mocks):

```bash
bun test
```

## Development

To start the development server run:

```bash
bun run dev
```

## Docker

1. Copy `config.sample.json` to `config.production.json` and fill in your GitLab/GitHub token(s) and RSA private key (see above for generating one).
2. Run:

   ```bash
   docker compose up --build
   ```

The service listens on port 3000.

## Differences
