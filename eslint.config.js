const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // Turn off any warnings
      'no-console': 'off',
      'prefer-const': 'error',
      'no-undef': 'off', // TypeScript handles this
      'no-prototype-builtins': 'error',
      'no-dupe-class-members': 'error',
      'react-hooks/exhaustive-deps': 'off', // We'll add react hooks plugin separately if needed
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-dupe-class-members': 'off', // Allow method overloads in type definitions
      '@typescript-eslint/no-explicit-any': 'off', // Type definitions often need any
    },
  },
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      '.build/',
      'docs-local/',
      'android/',
      'ios/',
      '*.config.js',
    ],
  },
];
