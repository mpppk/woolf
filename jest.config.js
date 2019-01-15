module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/__tests__/*.ts?(x)'],
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['!**/node_modules/**', '**/src/**/*.ts', '!**/src/**/*.d.ts']
};
