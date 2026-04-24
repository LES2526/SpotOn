import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Allow `any` in test files — API responses are untyped by nature
    {
        files: ['__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        // Generated Prisma client files — not hand-written code
        "app/generated/**",
        // Utility scripts using CommonJS require()
        "check-reports.js",
        "test-patch.js",
    ]),
]);

export default eslintConfig;
