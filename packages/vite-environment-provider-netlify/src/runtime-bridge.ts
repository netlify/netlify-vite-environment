import EventEmitter from "node:events";
import http from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DenoBridge as Deno } from "@netlify/edge-bundler";
import { DevEnvironment as ViteDevEnvironment } from "vite";

import type { RunnerArguments } from "./shared/bridge";

/**
 * A communication channel between the host (running Vite's DevEnvironment in
 * Node.js) and the runner (running in Deno). The runner
 */
export class RuntimeBridge extends EventEmitter {
  private server: Promise<void>;
  private runner: Promise<void>;

  bootstrapped: boolean;
  devEnv: ViteDevEnvironment;
  hostPort: number;
  runnerPort: number;

  constructor(devEnv: ViteDevEnvironment) {
    super();

    this.bootstrapped = false;
    this.devEnv = devEnv;
  }

  private async listener(req: http.IncomingMessage, res: http.ServerResponse) {
    // The runner calls this endpoint when it wants to fetch the code for a
    // module.
    if (req.url === "/fetch-module") {
      if (typeof req.headers["x-id"] !== "string") {
        const error = new Error("Missing module ID");

        this.emit("runner_error", error);

        res.writeHead(400);
        res.end(error.message);

        return;
      }

      const mod = await this.devEnv.fetchModule(req.headers["x-id"]);

      res.end(JSON.stringify(mod));
    }

    // The runner calls this endpoint when it starts its HTTP server. It
    // sends its port number in a header.
    if (req.url === "/register") {
      const portHeader = req.headers["x-runner-server-port"];
      const port = Number.parseInt(
        typeof portHeader === "string" ? portHeader : undefined,
      );

      if (Number.isNaN(port)) {
        const error = new Error("Missing or invalid port");

        this.emit("runner_error", error);

        res.writeHead(400);
        res.end(error.message);

        return;
      }

      this.runnerPort = port;
      this.emit("runner_ready", port);
    }
  }

  /**
   * Bootstraps the runner, waits for its HTTP server to be ready, and tells it
   * to import the entrypoint at a given path.
   */
  async bootstrap(entrypointPath: string) {
    if (this.bootstrapped) {
      return;
    }

    await this.startRunner();

    const entrypointRes = await fetch(
      `http://0.0.0.0:${this.runnerPort}/__netlify-bootstrap`,
      {
        headers: {
          "x-entrypoint-path": entrypointPath,
        },
      },
    );

    this.bootstrapped = entrypointRes.ok;
  }

  /**
   * Handles a request, forwarding it to the runner.
   */
  async handle(req: Request) {
    await this.startRunner();

    const url = new URL(req.url);

    url.hostname = "0.0.0.0";
    url.port = this.runnerPort.toString();

    return await fetch(
      new Request(url, {
        body: req.body,
        headers: req.headers,
        method: req.method,
        signal: req.signal,
      }),
    );
  }

  /**
   * Starts the host server on any available port. Returns a Promise that
   * resolves once the HTTP server is up.
   */
  startHost() {
    if (this.server) {
      return this.server;
    }

    this.server = new Promise((resolve, reject) => {
      const httpServer = http.createServer(async (req, res) =>
        this.listener(req, res),
      );

      httpServer.on("error", (error) => {
        reject(error);
      });

      httpServer.listen({ port: 0 }, () => {
        const address = httpServer.address();

        if (typeof address === "string") {
          return reject(
            new Error("Server unexpectedly listening on a Unix pipe"),
          );
        }

        this.emit("host_ready", address.port);

        this.hostPort = address.port;

        resolve();
      });
    });

    return this.server;
  }

  /**
   * Starts the runner by executing the Deno script and waiting for it to
   * start its own HTTP server and ping back with its port.
   */
  startRunner() {
    if (this.runner) {
      return this.runner;
    }

    this.runner = new Promise((resolve, reject) => {
      this.on("runner_error", (error: Error) => {
        reject(error);
      });

      this.on("runner_ready", () => {
        resolve();
      });
    });

    // The data sent to the runner as a Deno arg.
    const runnerArguments: RunnerArguments = {
      hostServerPort: this.hostPort,
      rootPath: this.devEnv.config.root,
    };
    const runnerPath = resolve(
      fileURLToPath(import.meta.url),
      "..",
      "deno",
      "index.js",
    );
    const denoBridge = new Deno({});

    denoBridge.runInBackground(
      ["run", "--allow-all", runnerPath, JSON.stringify(runnerArguments)],
      undefined,
      {
        pipeOutput: true,
      },
    );

    return this.runner;
  }
}
