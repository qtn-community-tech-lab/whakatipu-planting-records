import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import stylistic from "@stylistic/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Supabase queries: one chained call per line, listed like parameters.
  {
    files: ["db/queries/**/*.ts"],
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/newline-per-chained-call": ["error", { ignoreChainWithDepth: 1 }],
      "@stylistic/indent": ["error", 2],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
