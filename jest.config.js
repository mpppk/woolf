module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['!**/node_modules/**', '**/src/**/*.ts', '!**/src/**/*.d.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/*.ts?(x)']
};
