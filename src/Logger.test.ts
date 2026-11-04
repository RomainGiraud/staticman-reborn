import { afterEach, describe, expect, test } from "bun:test";
import { Writable } from "node:stream";
import { createLogger, transports } from "winston";
import { configureLogger, logger } from "./Logger";

const consoleTransports = () =>
  logger.transports.filter((t) => t instanceof transports.Console);

afterEach(() => {
  consoleTransports().forEach((t) => logger.remove(t));
});

describe("logger", () => {
  test("has debug level and the two file transports", () => {
    expect(logger.level).toBe("debug");

    const files = logger.transports.filter(
      (t): t is transports.FileTransportInstance =>
        t instanceof transports.File,
    );
    expect(files).toHaveLength(2);

    const errorFile = files.find((t) => t.filename === "error.log");
    const combinedFile = files.find((t) => t.filename === "combined.log");
    expect(errorFile?.level).toBe("error");
    expect(combinedFile).toBeDefined();
    expect(combinedFile?.level).toBeUndefined();
  });

  test("has no console transport by default", () => {
    expect(consoleTransports()).toHaveLength(0);
  });

  test('formats lines as "<timestamp> <level>: <message>"', () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });
    // Reuse the production format without writing to the real log files.
    const probe = createLogger({
      level: logger.level,
      format: logger.format,
      transports: [new transports.Stream({ stream: sink })],
    });

    probe.info("hello");
    probe.error(new Error("boom"));

    expect(lines[0]?.trim()).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} info: hello$/,
    );
    expect(lines[1]).toMatch(/ error: boom/);
  });
});

describe("configureLogger", () => {
  test.each(["production", "test", ""])(
    'does not add a console transport for "%s"',
    (env) => {
      configureLogger(env);
      expect(consoleTransports()).toHaveLength(0);
    },
  );

  test("adds a console transport in development", () => {
    const before = logger.transports.length;
    configureLogger("development");
    expect(consoleTransports()).toHaveLength(1);
    expect(logger.transports).toHaveLength(before + 1);
  });
});
