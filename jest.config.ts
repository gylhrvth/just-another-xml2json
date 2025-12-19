import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  // Look for tests in __tests__ or files ending with .test.ts or .spec.ts
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  // Optionally enable collecting coverage by default (can be overridden on CLI)
  collectCoverage: false,
  coverageDirectory: 'coverage',
  // If you want to collect coverage only for src files:
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  // Verbose for clearer output in CI / local runs
  verbose: true,

  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(.*)\.js$': '$1' }
};

export default config;