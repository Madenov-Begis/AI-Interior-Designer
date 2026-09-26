import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@mantine/charts") || id.includes("/recharts/")) return "charts-vendor";
          if (id.includes("/@mantine/")) return "mantine-vendor";
          if (id.includes("/@tanstack/")) return "query-vendor";
          if (id.includes("/react-router") || id.includes("/react-dom/") || id.includes("/react/")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
});
