import reactHooks from "eslint-plugin-react-hooks";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import {fileURLToPath} from "node:url";
import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      },
      parser: tsParser
    },
    rules: {
      "no-cond-assign": 0,
      "no-constant-condition": 0,
      "no-sparse-arrays": 0,
      "no-unexpected-multiline": 0,
      "@typescript-eslint/no-empty-function": 0,
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/no-this-alias": 0,
      "@typescript-eslint/no-unused-expressions": 0,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ]
    }
  },
  {
    files: ["src/react/**/*.tsx", "src/react/**/*.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-nocheck": "allow-with-description",
        "ts-expect-error": "allow-with-description"
      }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ]
    }
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ["src/react/**/*.tsx", "src/react/**/*.ts"],
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // The mark registry registers marks during render and records resolved
      // options on the mark instance, by design: <Plot> must see every mark
      // before its compute effect runs. The React Compiler rules read those
      // patterns as violations, so they are reported rather than failed.
      // react-hooks/rules-of-hooks stays an error: hook order is not something
      // this layer is allowed to get wrong.
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn"
    }
  },
  {
    files: ["test/**/*.js", "test/**/*.ts", "test/**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.mocha
      }
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-nocheck": "allow-with-description",
        "ts-expect-error": "allow-with-description"
      }]
    }
  }
];
