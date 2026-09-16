FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["bun", "src/index.ts"]
