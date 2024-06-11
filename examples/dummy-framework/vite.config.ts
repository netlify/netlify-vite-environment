import type { UserConfig } from "vite";
import { dummyFramework } from "./frameworkPlugin";

const config: UserConfig = {
  appType: "custom",
  ssr: {
    target: "webworker",
  },
  dev: {
    preTransformRequests: false,
  },
  server: {
    preTransformRequests: false,
  },
  optimizeDeps: {
    include: [],
  },
  plugins: [
    dummyFramework({
      entrypoint: "./entry-edge-function.ts",
    }),
  ],
};

export default config;
