/**
 * @fileoverview Jest configuration for Next.js application.
 *
 * Configures Jest test runner with Next.js integration, including:
 * - Test environment setup (jsdom for browser simulation)
 * - Module path aliases (@/ imports)
 * - Test file patterns
 * - Coverage provider
 *
 * @module jest.config
 * @requires jest
 * @requires next/jest
 *
 * @see {@link https://jestjs.io/docs/configuration|Jest Configuration Documentation}
 * @see {@link https://nextjs.org/docs/testing#jest|Next.js Testing Documentation}
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

/**
 * Creates a Jest config with Next.js integration.
 *
 * This function loads Next.js configuration, environment variables,
 * and sets up module resolution for the test environment.
 *
 * @function
 * @returns {Function} A function that generates the final Jest configuration
 */
const createJestConfig = nextJest({
    /** Path to Next.js application root */
    dir: './',
});

/**
 * Custom Jest configuration.
 *
 * Extends the Next.js Jest configuration with project-specific settings.
 *
 * @constant {Config}
 */
const config: Config = {
    /**
     * Global setup/teardown for the test database container.
     *
     * Starts a dedicated PostgreSQL container on port 5433 before any tests
     * run and applies a fresh schema. The container is kept alive after the
     * run so subsequent test runs start faster.
     */
    globalSetup: '<rootDir>/jest.globalSetup.ts',
    globalTeardown: '<rootDir>/jest.globalTeardown.ts',

    /**
     * Coverage provider.
     *
     * Uses V8 for faster and more accurate coverage reporting compared to Babel.
     *
     * @type {string}
     * @default "v8"
     */
    coverageProvider: 'v8',

    /**
     * Test environment.
     *
     * Uses jsdom to simulate a browser environment with DOM APIs.
     * Necessary for testing React components and frontend code.
     *
     * @type {string}
     * @default "jsdom"
     */
    testEnvironment: 'jsdom',

    /**
     * Setup files to run after the test framework is installed.
     *
     * Imports global test utilities like @testing-library/jest-dom matchers.
     *
     * @type {string[]}
     * @see {@link ./jest.setup.ts}
     */
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    /**
     * Module name mapper for resolving import paths.
     *
     * Maps TypeScript path aliases to their actual locations.
     * Transforms `@/component` imports to `<rootDir>/component`.
     * Forces jose package to use Node.js version instead of browser version.
     *
     * @type {Object.<string, string>}
     * @example
     * In test files:
     * import { prisma } from '@/lib/prisma' // resolves to <rootDir>/lib/prisma
     */
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
        '^jose$': '<rootDir>/node_modules/jose/dist/node/cjs/index.js',
    },

    /**
     * Glob patterns for test file discovery.
     *
     * Matches:
     * - Files in `__tests__/` directories ending with .test.ts(x) or .js(x)
     * - Files ending with .spec.ts(x) or .test.ts(x) anywhere in the project
     *
     * @type {string[]}
     */
    testMatch: [
        '**/__tests__/**/*.test.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
    ],

    /**
     * Directories to ignore when searching for test files.
     *
     * Prevents testing of:
     * - Third-party dependencies in node_modules
     * - Compiled Next.js build output in .next
     *
     * @type {string[]}
     */
    testPathIgnorePatterns: [
        '/node_modules/',
        '/.next/',
    ],

    /**
     * Transform ignore patterns.
     *
     * Configures which node_modules should be transformed by Jest.
     * By default, Jest ignores all node_modules, but some packages
     * (like jose, openid-client, oauth4webapi) use ESM and need transformation.
     *
     * @type {string[]}
     */
    transformIgnorePatterns: [
        'node_modules/(?!(jose|openid-client|oauth4webapi)/)',
    ],
};

/**
 * Export the Jest configuration.
 *
 * The configuration is wrapped in `createJestConfig` to ensure Next.js
 * configuration is loaded asynchronously before tests run.
 *
 * @constant {Config}
 * @default
 */
export default createJestConfig(config);
