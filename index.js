/*
Thank To:
- Miftah
- Caliph
- Yanz

Source code: https://github.com/miftahganzz/Bot-Telegram

Forbidden to sell and delete the credit name
*/
const express = require('express');
const chalk = require('chalk');
const mongoose = require('mongoose');
const path = require('path');
const cfonts = require('cfonts');
const chokidar = require('chokidar');
const fetch = require("node-fetch");
require('./config');

const { bot, User } = require('./main/bot');
let bott = require('./main/bot');
let config = require('./config');
let menu = require('./main/menu');

const app = express();
const PORT = process.env.PORT || 3000;

if (web_view) {
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'views')));

app.get('/', async (req, res) => {
  try {
    const users = await User.find();
    const totalUsers = users.length;
    const premiumUsers = users.filter(user => user.isPremium).length;

    let botStatus = 'offline';

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();

    if (data.ok) {
      botStatus = 'online';
    }

    res.render('index', { totalUsers, premiumUsers, botStatus, botName: data.result.first_name, botUsername: data.result.username, totalFeatures, ownerName, github, telegram });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Failed to fetch users.');
  }
});

  app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });

  app.listen(PORT, () => {
    console.log(chalk.whiteBright('╭─── [ LOG ]'));
    console.log(chalk.whiteBright('├'), chalk.cyanBright(`</> Server running on port ${PORT}`));
  });
}

cfonts.say('ITzpire', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'red', 'yellow', 'blue'],
  background: 'transparent',
  space: true,
  maxLength: '0',
  gradient: true,
  independentGradient: false,
  transitionGradient: true,
  env: 'node'
});

cfonts.say('ITzpire simple bot telegram created by Miftah', {
  font: 'console',
  align: 'center',
  colors: ['red', '#f80'],
  background: 'transparent',
  space: true,
  maxLength: '0',
  gradient: true,
  independentGradient: false,
  transitionGradient: true,
  env: 'node'
});

const clearRequireCache = (module) => {
    delete require.cache[require.resolve(module)];
};

const reloadModules = () => {
    console.log(chalk.whiteBright('├'), chalk.blueBright('Reloading the file...'));
    clearRequireCache('./main/bot');
    clearRequireCache('./config');
    clearRequireCache('./main/menu');

    bott = require('./main/bot');
    config = require('./config');
    menu = require('./main/menu');
    console.log(chalk.whiteBright('├'), chalk.greenBright('File reloaded successfully.'));
};

const watcher = chokidar.watch(['./main/bot.js', './config.js', './main/menu.js'], {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 1000
});

watcher.on('change', (filePath) => {
    console.log(chalk.whiteBright('├'), chalk.cyanBright(`${path.basename(filePath)} already changed. Reloading...`));
    reloadModules();
});

bot.launch().then(() => {
  console.log(chalk.whiteBright('├'), chalk.cyanBright('[✓] Bot is now running!'));
}).catch((err) => {
  console.error(chalk.whiteBright('├'), chalk.redBright('[✗] Error starting the bot:'), err);
});
