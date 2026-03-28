import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [".next/**", "node_modules/**", "storage/uploads/**", "tmp_*.log", "tmp_*.err.log"]
  },
  js.configs.recommended,
  {
    files: ["app/**/*.js", "components/**/*.js", "lib/**/*.js", "*.mjs", "scripts/**/*.cjs"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        URL: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        console: "readonly",
        process: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
      "no-empty": "off",
      "no-useless-escape": "off"
    }
  }
];
