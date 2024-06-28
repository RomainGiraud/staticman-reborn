# Staticman Reborn

## Purpose

Since [Staticman](https://staticman.net/) is not maintained anymore. The idea was incredible so I've decided to revive a similar tool with recent frameworks.

## Usage

You must specify the following URL in your form: `http://myinstance.org/entry/:service/:username/:project/:branch/:property`.

With the following placeholders:
- service: gitlab (only one for now)
- username: your username for the wanted project
- project: the project name
- branch: the target branch
- property: top level property of staticman.yaml file

A single staticman.yaml can have multiples properties to address several types of post.

## Test

A full functional test exists (with mocks):

```bash
bun test
```

## Development

To start the development server run:

```bash
bun run dev
```

## Differences
