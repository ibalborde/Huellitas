// Integration tests run against the REAL local Supabase stack
// (`supabase start`) — see __tests__/integration/. They are excluded from the
// default unit run (package.json -> jest.testPathIgnorePatterns) and executed
// via `npm run test:integration`.
//
// Plain node environment on purpose: these tests exercise the API over HTTP
// with supabase-js and never import React Native, so jest-expo's RN setup
// files are unnecessary (and would break under testEnvironment: 'node').
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.integration.test.ts'],
  // Same "@/" alias as tsconfig paths, so repository modules under test
  // (src/features/*/data) resolve their imports.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  // babel-preset-expo rewrites process.env.EXPO_PUBLIC_* reads into imports
  // from expo/virtual/env, which ships as ESM — let jest transform it.
  transformIgnorePatterns: ['node_modules/(?!expo/virtual/)'],
  // Real network + auth admin calls: give each test room to breathe.
  testTimeout: 30000,
};
