const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/app.ts',
  output: { path: path.resolve(__dirname, 'dist'), filename: 'app.[contenthash].js', clean: true },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [
      { test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' }),
    new CopyWebpackPlugin({
      patterns: [
        // PDFium engine files (pdfium.js / pdfium.wasm) used by resourceUrl
        { from: 'node_modules/@syncfusion/ej2-pdfviewer/dist/ej2-pdfviewer-lib', to: 'ej2-pdfviewer-lib' },
        // Sample PDFs
        { from: 'public/samples', to: 'samples' },
      ],
    }),
  ],
  devServer: { port: 4000, static: false },
  performance: { hints: false }, // the PDF Viewer is a large bundle; this is expected
  devtool: false,
};
