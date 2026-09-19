import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const client = fileURLToPath(new URL("./src/client", import.meta.url));
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^next\/server$/, replacement: "next/server.js" },
      { find: "@/shared", replacement: `${client}/shared` },
      { find: "@/features", replacement: `${client}/features` },
      { find: "@/entities", replacement: `${client}/entities` },
      { find: "@/widgets", replacement: `${client}/widgets` },
      { find: "@/pages", replacement: `${client}/_pages` },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    server: { deps: { inline: ["next-intl"] } },
  },
});
