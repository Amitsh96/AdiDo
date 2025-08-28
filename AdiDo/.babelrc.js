const path = require('path');

const isBundlerWebpack = process.env.BUNDLER === 'webpack';
const isWeb = process.env.PLATFORM === 'web' || isBundlerWebpack || 
  process.cwd().includes('webpack') || 
  (process.env._ && process.env._.includes('webpack'));

if (isWeb) {
  module.exports = {
    presets: [
      ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
      '@babel/preset-react',
      '@babel/preset-typescript'
    ],
    plugins: [
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }]
    ]
  };
} else {
  module.exports = {
    presets: ['module:@react-native/babel-preset'],
  };
}