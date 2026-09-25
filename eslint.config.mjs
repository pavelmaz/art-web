import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Automatic prefetching loops on Cloudflare and runs up the bill; see components/Link.tsx.
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "next/link", message: 'Import Link from "@/components/Link" (prefetch off by default).' }] },
      ],
    },
  },
  { files: ["components/Link.tsx"], rules: { "no-restricted-imports": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
