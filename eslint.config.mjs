import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ["src/components/**", "src/shared/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "server-only"],
              message: "Client code must not import server modules. Call the API instead.",
            },
            {
              group: ["@/domain/roles"],
              allowTypeImports: true,
              message:
                "Don't use the role matrix on the client. Use the `allowed`/`meta` flags the API returns.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/domain/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [{ group: ["next", "next/*", "react", "@/server/*", "@/app/*", "@/components/*"], message: "src/domain must stay framework-free." }] },
      ],
    },
  },

  {
    files: ["src/server/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/app/*", "@/components/*"], message: "src/server must not import UI or route modules." }] },
      ],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
