import type { ViteDevServer, Plugin } from 'vite';
import type * as http from 'node:http';
import {
  netlifyEnvironment,
  type DevEnvironment,
} from '@netlify/vite-6-alpha-environment-provider-netlify';

const ssrEnvName = 'ssr-env';

export function dummyFramework({
  entrypoint,
}: {
  entrypoint: string;
}): Plugin[] {
  const environmentPlugin = netlifyEnvironment(ssrEnvName);

  return [
    ...environmentPlugin,
    {
      name: 'example-framework-plugin',

      async configureServer(server: ViteDevServer) {
        const devEnv = server.environments[ssrEnvName] as
          | undefined
          | DevEnvironment;

        let handler: RequestHandler;

        if (devEnv) {
          handler = await devEnv.api.getHandler({
            entrypoint,
          });
        } else {
          throw new Error('No ssr environment was detected');
        }

        return async () => {
          server.middlewares.use(
            async (req: http.IncomingMessage, res: http.ServerResponse) => {
              const url = `http://localhost${req.url ?? '/'}`;

              const nativeReq = new Request(url);
              const resp = await handler(nativeReq);
              const html = await resp.text();
              const transformedHtml = await server.transformIndexHtml(
                url,
                html,
              );
              res.end(transformedHtml);
            },
          );
        };
      },
    },
  ];
}

type RequestHandler = (req: Request) => Response | Promise<Response>;
