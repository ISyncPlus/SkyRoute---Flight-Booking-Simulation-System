import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/* Flat config, required from ESLint 9 on. `eslint-config-next` ships these
   two entry points as ready-made flat-config arrays, so they spread straight
   in where `.eslintrc.json` used to "extend" them by name. */
const config = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["node_modules/", ".next/", "out/", "coverage/"],
  },
];

export default config;
