/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.integration.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          target: 'es2021',
          strictNullChecks: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@familieoya/contracts$': '<rootDir>/libs/contracts/src/index.ts',
    '^@familieoya/common$': '<rootDir>/libs/common/src/index.ts',
    '^@familieoya/testing$': '<rootDir>/libs/testing/src/index.ts',
  },
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  testTimeout: 30000,
};
