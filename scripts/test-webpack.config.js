var path = require("path");

module.exports = {
  context: path.join(__dirname, "../src"),
  entry: [
    './test/JsonInterpreter_test.spec.ts',
    './test/annotations_test.spec.ts',
    './test/annotations_errors_test.spec.ts'
  ],
  displayErrorDetails: true,
  debug: true,
  output: {
    filename: 'test1.browser.js'
  },
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
  },
  devtool: 'source-map',
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        loader: "source-map-loader"
      }
    ],
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  }
}