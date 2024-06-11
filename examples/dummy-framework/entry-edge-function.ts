import { serverSideRender } from "./src/server/index";

export default async (_req: Request) => {
  const html = await serverSideRender();

  return new Response(html, {
    headers: {
      "content-type": "text/html",
    },
  });
};
