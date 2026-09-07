import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const client = fileURLToPath(new URL("./src/client", import.meta.url));
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@/shared": `${client}/shared`,
      "@/features": `${client}/features`,
      "@/entities": `${client}/entities`,
      "@/widgets": `${client}/widgets`,
      "@/pages": `${client}/_pages`,
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.tsx"] },
});
