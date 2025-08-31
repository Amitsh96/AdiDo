const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Set environment variables for web
process.env.PLATFORM = 'web';
process.env.BUNDLER = 'webpack';

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: './index.web.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'bundle.[contenthash].[hash].js' : 'bundle.js',
      publicPath: './',
      clean: true,
    },
    cache: false,
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[path][name].[ext]',
            },
          },
        ],
      }
    ]
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
    },
    extensions: ['.web.js', '.js', '.web.jsx', '.jsx', '.ts', '.tsx', '.json']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './web/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'web/favicon.svg', to: 'favicon.svg' },
        { from: 'web/manifest.json', to: 'manifest.json' },
        { from: 'web/sw.js', to: 'sw.js' }
      ]
    }),
    new webpack.ProvidePlugin({
      React: 'react',
    })
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'dist'),
    },
  }
  };
};