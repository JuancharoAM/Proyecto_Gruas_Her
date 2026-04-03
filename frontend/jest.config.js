const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'jest-environment-jsdom',
    testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    clearMocks: true,
};

module.exports = createJestConfig(config);
