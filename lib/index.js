const app = require('../package.json');

app.cmdList = [];
app.addCmd = (cmd) => {
  app[cmd] = require(`./${cmd}`);
  app.cmdList.push(cmd);
};

app.addCmd('scrape');
app.addCmd('api');

app.options = [
  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print help and exit.'
  }
];

module.exports = app;