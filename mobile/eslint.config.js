export default [
  {
    ignores: [
      '**/node_modules/**',
      'android/**',
      'ios/**',
      'dist/**',
      'build/**',
      '.expo/**',
    ],
  },
  {
    // This repo includes TypeScript, but we don't ship @typescript-eslint here yet.
    // Keep linting limited to JS/JSX to avoid parser errors.
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {},
  },
];

