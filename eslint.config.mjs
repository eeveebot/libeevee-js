import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
				...globals.node,
			},
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [
      js.configs.recommended,
    ],
    rules: {
      "semi": ["error", "always"],
      "prefer-const": "error",
      "no-unused-vars": "error",
      "no-console": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.mts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
      "semi": ["error", "always"],
      "prefer-const": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "error",
      "no-console": "error",
    },
  },
  {
    ignores: ["node_modules/", "dist/"],
  },
]);
