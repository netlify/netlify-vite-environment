import { getDeployStore } from "@netlify/blobs";

import { serverSideRender } from "./src/server/index";

export default async (req: Request) => {
  const url = new URL(req.url);
  const store = url.pathname === "/" ? getDeployStore() : undefined;
  const html = await serverSideRender(store);

  return new Response(html, {
    headers: {
      "content-type": "text/html"
    }
  });
};
