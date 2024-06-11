/// <reference lib="deno.ns" />
// @deno-types="../../node_modules/vite/dist/node/module-runner.d.ts"
import { ModuleRunner } from "vite/module-runner";

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

import { handleRequest } from "https://edge.netlify.com/bootstrap/handler.ts";
import { InternalHeaders } from "https://edge.netlify.com/bootstrap/headers.ts";
import { EdgeFunction } from "https://edge.netlify.com/bootstrap/edge_function.ts";

import type { RunnerArguments } from "../shared/bridge.ts";

let args: RunnerArguments;

type EdgeFunctionFile = {
  default: EdgeFunction;
};

try {
  args = JSON.parse(Deno.args[0]) as RunnerArguments;
} catch (error) {
  console.error("Could not parse runner arguments");

  throw error;
}

const moduleRunner = new ModuleRunner(
  {
    root: args.rootPath,
    transport: {
      async fetchModule(id, importer) {
        const response = await fetch(
          `http://localhost:${args.hostServerPort}/fetch-module`,
          {
            headers: {
              "x-id": id,
              "x-importer": importer ?? ""
            }
          }
        );

        return response.json();
      }
    }
  },
  {
    runInlinedModule: async (context, transformed) => {
      const codeDefinition = `'use strict';async (${Object.keys(context).join(
        ","
      )})=>{{`;
      const code = `${codeDefinition}${transformed}\n}}`;

      await eval(code)(...Object.values(context));

      Object.freeze(context.__vite_ssr_exports__);
    },
    async runExternalModule(filepath) {
      return await import(filepath);
    }
  }
);

let entrypoint: EdgeFunctionFile;

Deno.serve(
  {
    onListen: async (address: Deno.NetAddr) => {
      await fetch(`http://localhost:${args.hostServerPort}/register`, {
        headers: {
          "x-runner-server-port": address.port.toString()
        }
      });
    },
    port: 0
  },
  async (req: Request) => {
    const url = new URL(req.url);

    if (url.pathname === "/__netlify-bootstrap") {
      const entrypointPath = req.headers.get("x-entrypoint-path");

      if (!entrypointPath) {
        return new Response("Entrypoint path is missing", { status: 400 });
      }

      entrypoint = await moduleRunner.import(entrypointPath);

      return new Response("Entrypoint imported");
    }

    const headers = new Headers(req.headers);

    headers.set(InternalHeaders.DeployID, "0");
    headers.set(InternalHeaders.EdgeFunctions, "edge");
    headers.set(InternalHeaders.IP, "127.0.0.1");
    headers.set(InternalHeaders.EdgeFunctionBypass, "1");
    headers.set(InternalHeaders.Passthrough, "passthrough");
    headers.set(InternalHeaders.RequestID, "1234567");

    if (args.blobsServerPort) {
      const blobsContext = {
        url: `http://0.0.0.0:${args.blobsServerPort}`,
        url_uncached: `http://0.0.0.0:${args.blobsServerPort}`,
        token: "netlify"
      };

      headers.set(
        InternalHeaders.BlobsInfo,
        encodeBase64(JSON.stringify(blobsContext))
      );
    }

    const site = {
      id: "0"
    };

    headers.set(InternalHeaders.SiteInfo, encodeBase64(JSON.stringify(site)));

    const nfReq = new Request(req, {
      headers
    });

    return handleRequest(nfReq, {
      edge: entrypoint.default
    });
  }
);
