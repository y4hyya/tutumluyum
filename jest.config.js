/**
 * Unit tests run in plain Node against pure modules (parsers, analysis, lib,
 * pdf protocol). Files that import react-native / expo APIs are not unit
 * tested; all business logic is deliberately kept in pure modules.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.node.json' }],
  },
  // Business-critical modules carry an enforced coverage floor (>=90%).
  collectCoverageFrom: [
    'src/analysis/**/*.ts',
    'src/parsers/**/*.ts',
    '!src/parsers/index.ts', // re-export barrel
  ],
  coverageThreshold: {
    './src/analysis/': { statements: 90, lines: 90, functions: 90, branches: 85 },
    './src/parsers/': { statements: 90, lines: 90, functions: 90, branches: 85 },
  },
};
