module.exports = {
  root: true,
  extends: ['@block65/eslint-config/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: true,
  },

  overrides: [
    {
      files: ['**/fixtures/**/*.ts'],
      rules: {
        'max-classes-per-file': 'off',
        quotes: 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
