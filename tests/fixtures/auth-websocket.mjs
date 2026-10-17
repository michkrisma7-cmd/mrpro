// Configure both official export variants for the isolated local Next.js test.
import { neonConfig as esmConfig } from "@neondatabase/serverless";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { neonConfig: cjsConfig } = require("@neondatabase/serverless");
const proxy = process.env.MR_TEST_WEBSOCKET_PROXY;
if (!/^127\.0\.0\.1:\d+$/.test(proxy || ""))
  throw new Error("Expected loopback test proxy.");
delete globalThis.WebSocket;
for (const config of [esmConfig, cjsConfig]) {
  config.wsProxy = () => `${proxy}/v2`;
  config.useSecureWebSocket = false;
  config.pipelineConnect = false;
}
