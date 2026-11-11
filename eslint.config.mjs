import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import stylistic from "@stylistic/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", fixStyle: "inline-type-imports" }],
    },
  },
  // Supabase queries: one chained call per line, listed like parameters.
  {
    files: ["db/queries/**/*.ts"],
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/indent": ["error", 2],
    },
  },
  // Only db/ talks to Supabase, so every read is in db/queries.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["db/**", "lib/supabase/**", "scripts/**", "tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "@/lib/supabase/*"],
              message: "Read through db/queries. Only db/ talks to Supabase.",
            },
          ],
        },
      ],
    },
  },
  // Generated Supabase types and shadcn UI components.
  globalIgnores(["db/database.types.ts", "components/ui/**"]),
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
