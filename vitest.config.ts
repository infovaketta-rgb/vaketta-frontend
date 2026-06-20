import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Cast: Next 16 ships a rolldown-based vite while vitest bundles its own vite,
  // so the plugin's inferred type doesn't structurally match. Runtime is fine.
  plugins: [react() as never],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Only our own tests — never node_modules' bundled test files.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
