// Generate the JavaScript Neon driver client without downloading unused native engines.
// Prisma schema parsing and validation use Prisma's bundled WASM implementation.
import internals from "@prisma/internals";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const generators = await internals.getGenerators({
  schemaPath: "prisma/schema.prisma",
  skipDownload: true,
  noEngine: false,
  registry: {
    "prisma-client-js": {
      type: "rpc",
      generatorPath: require.resolve("@prisma/client/generator-build"),
      isNode: true,
    },
  },
});
try {
  for (const generator of generators) await generator.generate();
} finally {
  for (const generator of generators) generator.stop();
}
