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
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  // Real network + auth admin calls: give each test room to breathe.
  testTimeout: 30000,
};
