// Local PostgreSQL-over-WebSocket fixture only. Never loaded by application code.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Match the CommonJS driver instance used by tsx.
const { neonConfig } = require("@neondatabase/serverless");
const proxy = process.env.MR_TEST_WEBSOCKET_PROXY;
if (!/^127\.0\.0\.1:\d+$/.test(proxy || ""))
  throw new Error("Expected loopback test proxy.");
// Reproduce Node 20 without a global constructor: seed itself must install ws.
delete globalThis.WebSocket;
neonConfig.wsProxy = () => `${proxy}/v2`;
neonConfig.useSecureWebSocket = false; // Unencrypted traffic stays on loopback.
neonConfig.pipelineConnect = false;
