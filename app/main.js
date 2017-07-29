const { app } = require('electron');
const debug = require('debug')('airplane:main');

app.on('ready', () => {
  debug('app ready');

  require('./lib/app');
});
