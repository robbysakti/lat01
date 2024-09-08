const path = require('path')
const webpack = require('webpack')
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")


module.exports = {
  resolve: {
  fallback: {
    "fs": false,
    "tls": false,
    "net": false,
    "path": false,
    "zlib": false,
    "http": false,
    "https": false,
    "stream": false,
    "crypto": false,
    "crypto-browserify": require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify 
   // "console": false,
   // "dns": false,
   // "module": false
    
  } 
},
  entry: './frontend-js/main.js',
  output: {
    filename: 'main-bundled.js',
    path: path.resolve(__dirname, 'public')
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  
  // Other rules...
	plugins: [
		new NodePolyfillPlugin({
			excludeAliases: ['console']
		})
	]
}