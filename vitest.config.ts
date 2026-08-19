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
    // Billing periods are half-open, so the UI renders `periodEnd - 1ms` as the
    // inclusive end date. Which calendar day that lands on depends on the
    // runner's timezone, so pin it — otherwise "15 Aug → 14 Sep" passes in UTC
    // and fails on an IST developer machine.
    env: { TZ: "UTC" },
    // Only our own tests — never node_modules' bundled test files.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
