module.exports = {
    extends: [
        "plugin:react/recommended", // Uses the recommended rules from @eslint-plugin-react
        "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
        "plugin:prettier/recommended" // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    ],
    rules: {
        "unused-imports/no-unused-imports": "warn",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-unused-vars": ["warn", {"vars": "all", "args": "none", "ignoreRestSiblings": false}],
        "prettier/prettier": "warn",
        "prefer-const": "warn",
        "react/prop-types": "off",
        "@typescript-eslint/no-this-alias": [
            "error",
            {
            "allowDestructuring": true, // Allow `const { props, state } = this`; false by default
            "allowedNames": ["_self"] // Allow `const _self= this`; `[]` by default
            }
        ]
    },
    plugins: [
        "unused-imports"
    ],
    ignorePatterns: ["@types"],
    settings: {
        "import/resolver": {
            "node": {
                "paths": ["src"]
            }
        },
        "react": {
            "pragma": "React",  // Pragma to use, default to "React"
            "version": "detect", // React version. "detect" automatically picks the version you have installed.
                                 // You can also use `16.0`, `16.3`, etc, if you want to override the detected value.
                                 // default to latest and warns if missing
                                 // It will default to "detect" in the future
        }
    }
};
