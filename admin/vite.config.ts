import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The page reads only the public Supabase URL + anon key from the repo's env (../.env.local). The server code
// (server/) reuses the app's pure weekly-note logic through the "@" alias; the page imports no consumer code.
export default defineConfig({
  plugins: [react()],
  envDir: "..",
  envPrefix: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  resolve: { alias: { "@": path.resolve(__dirname, "../src") } },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
  test: {
    include: ["server/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node", // screen tests opt into jsdom per file
    setupFiles: ["./src/test/setup.ts"],
  },
});
