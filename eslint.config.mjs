import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  // === Next.js 内置规则 ===
  ...nextVitals,
  ...nextTs,

  // === 全局忽略 ===
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // === 墨境自定义规则 ===
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // 禁止未使用的变量（参数以 _ 开头除外）
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // 禁止 console.warn（允许 console.error、console.info）
      "no-console": ["warn", { allow: ["error", "info"] }],

      // 禁止显式 any 类型（JSON.parse 等场景用 eslint-disable 豁免）
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
