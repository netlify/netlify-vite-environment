import {
  DevEnvironment as ViteDevEnvironment,
  BuildEnvironment,
  type ResolvedConfig,
  type Plugin
} from "vite";

import { resolve } from "node:path";

import { BlobsServer } from "@netlify/blobs/server";

import { RuntimeBridge } from "./runtime-bridge";

export type NetlifyEnvironmentProviderOptions = {};

export function netlifyEnvironment(
  environmentName: string,
  options: NetlifyEnvironmentProviderOptions = {}
): Plugin[] {
  return [
    {
      name: "netlify-environment-plugin",

      async config() {
        return {
          environments: {
            [environmentName]: createNetlifyEnvironment(options)
          }
        };
      }
    }
  ];
}

export function createNetlifyEnvironment(
  options: NetlifyEnvironmentProviderOptions
) {
  return {
    metadata: { runtimeName: "netlify" },
    dev: {
      createEnvironment(
        name: string,
        config: ResolvedConfig
      ): Promise<DevEnvironment> {
        return createNetlifyDevEnvironment(name, config, options);
      }
    },
    build: {
      createEnvironment(
        name: string,
        config: ResolvedConfig
      ): Promise<BuildEnvironment> {
        return createNetlifyBuildEnvironment(name, config, options);
      }
    }
  };
}

async function createNetlifyBuildEnvironment(
  name: string,
  config: ResolvedConfig,
  _options: NetlifyEnvironmentProviderOptions
): Promise<BuildEnvironment> {
  return new BuildEnvironment(name, config);
}

async function createNetlifyDevEnvironment(
  name: string,
  config: any,
  _options: NetlifyEnvironmentProviderOptions
): Promise<DevEnvironment> {
  const blobsPath = resolve(config.root, ".netlify/blobs");
  const blobs = new BlobsServer({
    directory: blobsPath,
    token: "netlify"
  });
  const blobsServer = await blobs.start();
  const devEnv = new ViteDevEnvironment(name, config, {
    hot: false
  }) as DevEnvironment;
  const runtimeBridge = new RuntimeBridge(devEnv, blobsServer.port);

  devEnv.api = {
    async getHandler({ entrypoint }) {
      await runtimeBridge.bootstrap(entrypoint);

      return runtimeBridge.handle.bind(runtimeBridge);
    }
  };

  await runtimeBridge.startHost();
  await runtimeBridge.startRunner();

  return devEnv as DevEnvironment;
}

export type DevEnvironment = ViteDevEnvironment & {
  metadata: {
    runtimeName: string;
  };
  api: {
    getHandler: ({
      entrypoint
    }: {
      entrypoint: string;
    }) => Promise<(req: Request) => Response | Promise<Response>>;
  };
};
