// Configurazione di Jest: usiamo ts-jest per eseguire i test scritti in TypeScript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
};
