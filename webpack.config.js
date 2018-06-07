const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
      app: './src/index.js',
  },
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
         contentBase: './dist',
         hot: true
  },
  module: {
         rules: [
           {
             test: /\.css$/,
             use: ['style-loader', 'css-loader']
           },
           { 
             test: /\.handlebars$/,
             loader: "handlebars-loader" 
           }
         ]
       },
  plugins: [
      new CleanWebpackPlugin(['dist']),
      new HtmlWebpackPlugin({
          template: 'geotag.hbs'
      }),
      new webpack.NamedModulesPlugin(),
      new webpack.HotModuleReplacementPlugin()
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};
