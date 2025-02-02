module.exports = {
  plugins: [
    [
      'react-intl',
      {
        messagesDir: './i18n',
      },
    ],
    '@babel/proposal-class-properties',
    '@babel/plugin-syntax-dynamic-import',
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        forceAllTransforms: true,
        useBuiltIns: 'usage',
        corejs: 3,
      },
    ],
    '@babel/preset-typescript',
    'react',
  ],
};
