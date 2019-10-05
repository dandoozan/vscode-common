module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/out/'], // <-- to ignore the ".test.js" files in "out"
};
