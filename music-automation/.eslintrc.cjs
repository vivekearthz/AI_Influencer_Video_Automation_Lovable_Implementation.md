/** @type {import('eslint').Linter.Config} */
// `root: true` stops ESLint's config cascade here, the same way
// influenceos/.eslintrc.cjs does -- this is a plain Node/TS project with no
// React, so it shouldn't inherit the repo root's React-flavored ruleset.
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["dist", "node_modules", "data", "assets"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "off",
    "no-console": "off",
  },
};
