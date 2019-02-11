const
  fs = require('fs'),
  path = require('path'),
  configPath = path.join(__dirname, '..', 'etc', 'config.json'),
  defaultConfigPath = path.join(__dirname, '..', 'etc', 'config.example.json');

if (fs.existsSync(configPath)) {
  module.exports = require(configPath);
} else {
  module.exports = require(defaultConfigPath);
}