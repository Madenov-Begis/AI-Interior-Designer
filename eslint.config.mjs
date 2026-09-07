import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/server/**",
                "@/generated/**",
                "**/server/**",
                "**/generated/**",
                "**/admin/**",
              ],
              message:
                "Client code must use API DTOs, never server or admin runtime modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/client/**",
                "@/shared/**",
                "@/features/**",
                "@/widgets/**",
                "react",
                "next/link",
              ],
              message:
                "Keep presentation in app/client and server services independent of React.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "admin/dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
