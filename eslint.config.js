// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const NO_NETWORK_MESSAGE =
  'Network calls are banned. Tutumluyum is 100% on-device — see README privacy model.';
const NO_GRADIENT_MESSAGE = 'No gradients. Neo-brutalist design system — see src/theme/.';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'coverage/**',
      'assets/**',
      'node_modules/**',
    ],
  },
  {
    // CLI scripts run in Node, not React Native.
    files: ['scripts/**/*.{mjs,js,ts}'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Core privacy promise: the app must work fully in airplane mode.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: NO_NETWORK_MESSAGE },
        { name: 'XMLHttpRequest', message: NO_NETWORK_MESSAGE },
        { name: 'WebSocket', message: NO_NETWORK_MESSAGE },
        { name: 'EventSource', message: NO_NETWORK_MESSAGE },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: NO_NETWORK_MESSAGE },
            { name: 'expo-linear-gradient', message: NO_GRADIENT_MESSAGE },
            { name: 'react-native-linear-gradient', message: NO_GRADIENT_MESSAGE },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'global', property: 'fetch', message: NO_NETWORK_MESSAGE },
        { object: 'globalThis', property: 'fetch', message: NO_NETWORK_MESSAGE },
      ],
    },
  },
]);
