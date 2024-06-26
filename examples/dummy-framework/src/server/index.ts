import type { Store } from "@netlify/blobs";

import { getUserAgentText } from "./userAgent";
import { getCurrentTimeText } from "./time";
import { getCount } from "./counter";

export async function serverSideRender(blobs?: Store) {
  const html = `
    <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <link rel="icon" type="image/svg+xml" href="src/favicon.svg" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Vite App</title>
          <style>
            body {
                margin: 0;
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-around; padding: 0.05rem; margin-block: 0.1rem; font-size: 0.7rem">
            <span>
            <a href="https://github.com/vitejs/vite/discussions/16358" target="_blank">Vite Environment API</a> Experimentation</span>
          </div>
          <hr style="margin-top: 0" />
          <div style="display: flex; justify-content: space-between; padding: 0.25rem; margin-block: 0.15rem">
            <span>${getUserAgentText()}</span>${
              blobs
                ? `\n            <span>Count: ${await getCount(blobs)}</span>`
                : ""
            }
            <span>${getCurrentTimeText()}</span>
          </div>
          <hr />
          <div id="app" style="padding-inline: 1.5rem;">
            <h1>Hello World</h1>
            <div id="input-a-wrapper"></div>
            <br />
            <div id="input-b-wrapper"></div>
          </div>
          <script type="module" src="../src/client/index.ts"></script>
        </body>
      </html>
    `;
  return html;
}
