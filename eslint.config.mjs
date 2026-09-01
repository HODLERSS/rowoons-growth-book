import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated or non-source trees
    "ios/**",
    "resources/**",
    "html/**",
    "docs/**",
    "qa/**",
    "test-results/**",
    "playwright-report/**",
    "src/content/gen/**",
    "public/sw.js",
  ]),
]);

export default eslintConfig;
