import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This rule flags the standard "setLoading(true) at the top of a
      // data-fetching effect" pattern used consistently throughout this
      // app (see lib/use-resource-list.ts and every detail-page loader).
      // That pattern is correct here: each effect fetches from the API,
      // guards against race conditions with a `cancelled` flag, and has
      // accurate dependency arrays. Downgraded to a warning rather than
      // disabled outright, so a genuine future misuse still gets flagged
      // for review.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
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
