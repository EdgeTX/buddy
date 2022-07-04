const confusingBrowserGlobals = require("confusing-browser-globals");

module.exports = {
  plugins: [
    "react",
    "react-hooks",
    "@typescript-eslint",
    "import",
    "functional",
    "jest",
    "file-progress",
    "testing-library",
  ],
  extends: [
    "airbnb",
    "airbnb-typescript",
    "airbnb/hooks",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  rules: {
    "file-progress/activate": 1,
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unnecessary-condition": [
      "error",
      { allowConstantLoopConditions: true },
    ],
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: false,
      },
    ],
    "react/prop-types": ["off"],
    "react/require-default-props": ["off"],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      },
    ],
    "import/named": "off",
    "functional/no-class": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "functional/no-this-expression": "error",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: [
          "**/*.spec.{ts,tsx}",
          "**/e2e/**/*.{ts,tsx}",
          "**/*.stories.{ts,tsx}",
          "src/test-utils/**/*",
          "**/.vitest/*.{ts,tsx,js}",
          "**/e2e/**/*.{ts,tsx,js}",
          "**/webpack/*.js",
          "**/.storybook/*.{js,ts}",
          "**/__mocks__/**/*.{ts,tsx}",
          "**/vitest.*.ts",
          "**/storyshots*.ts",
        ],
      },
    ],
    "default-case": "off",
    "react/jsx-filename-extension": [1, { extensions: [".tsx"] }],
    "@typescript-eslint/no-require-imports": "error",
    "@typescript-eslint/array-type": ["error", { default: "array" }],
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-extra-non-null-assertion": "error",
    "@typescript-eslint/no-inferrable-types": "error",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/no-use-before-define": "off",
    "import/prefer-default-export": "off",
    "@typescript-eslint/return-await": "error",
    "no-void": "off",
    "react/no-unescaped-entities": "off",
  },
  parserOptions: {
    project: "./tsconfig.eslint.json",
    warnOnUnsupportedTypeScriptVersion: false,
  },
  settings: {
    "import/resolver": {
      node: {
        // baseUrl
        moduleDirectory: ["node_modules", "./src"],
      },
    },
  },
  overrides: [
    {
      files: ["src/**/*"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["../*"],
                message: "Usage of relative parent imports is not allowed.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["src/{renderer,webworker}/**/*"],
      env: {
        browser: true,
      },
    },
    {
      files: ["src/**/*.spec.tsx"],
      extends: ["plugin:jest/recommended"],
      rules: {
        "jest/no-deprecated-functions": "off",
      },
    },
    {
      files: ["src/webworker/**/*"],
      rules: {
        "no-restricted-globals": ["error"].concat(
          confusingBrowserGlobals.filter((entry) => entry !== "self")
        ),
      },
    },
    {
      files: ["src/renderer/**/*"],
      rules: {
        "import/prefer-default-export": "error",
      },
    },
    {
      files: ["src/renderer/**/*.spec.tsx"],
      extends: ["plugin:testing-library/react"],
    },
    {
      files: [
        "**/*.spec.{ts,tsx}",
        "**/__mocks__/**/*",
        "src/test-utils/**/*",
        "**/*.stories.{ts,tsx}",
        "**/e2e/**/*.{ts,tsx}",
      ],
      env: {
        jest: true,
      },
      rules: {
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "react/jsx-props-no-spreading": "off",
        "no-constant-condition": "off",
        "no-empty": "off",
        "no-await-in-loop": "off",
      },
    },
    {
      files: ["*.d.ts"],
      rules: {
        // Fix to /// imports in .d.ts
        "spaced-comment": ["error", "always", { markers: ["/"] }],
        "@typescript-eslint/no-unused-vars": "off",
        "functional/no-class": "off",
        "no-shadow": "off",
      },
    },
    {
      files: ["*.js", "*.json"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/prefer-optional-chain": "off",
        "@typescript-eslint/prefer-nullish-coalescing": "off",
        "import/named": "error",
      },
    },
  ],
};
