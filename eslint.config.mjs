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
    // Node build/utility scripts are intentionally CommonJS (.cjs) and run
    // outside the Next.js app; the React/TS lint rules do not apply to them.
    "scripts/**",
    "**/*.cjs",
    // Guard against a stray nested build directory being linted if a build
    // ever ran with an incorrect inferred workspace root.
    "medibot/**",
  ]),
]);

export default eslintConfig;
