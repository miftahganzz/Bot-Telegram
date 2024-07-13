<p align="center">
  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0uzFzEpGE1pH5fwJSbPCVF5t_piVbNDIcc6fkIIrzD9s2G1iQZHJYvoKzBjNM0d-_YGU&usqp=CAU" alt="BOT TELEGRAM" width="400"/>
</p>

<p align="center">
  <a href="https://miftahganzz.github.io">
    <img src="https://readme-typing-svg.herokuapp.com?size=15&width=280&lines=Bot+Telegram+Created+By+Miftah+🌐" alt="Miftah GanzZ"/>
  </a>
</p>

<p align="center">
  <a href="#">
    <img title="Bot-Telegram" src="https://img.shields.io/badge/Bot-Telegram-green?colorA=%23ff0000&colorB=%23017e40&style=for-the-badge">
  </a>
</p>

<p align="center">
  <a href="https://github.com/miftahganzz/followers">
    <img title="Followers" src="https://img.shields.io/github/followers/miftahganzz?color=red&style=flat-square">
  </a>
  <a href="https://github.com/miftahganzz/Bot-Telegram/stargazers/">
    <img title="Stars" src="https://img.shields.io/github/stars/miftahganzz/Bot-Telegram?color=blue&style=flat-square">
  </a>
  <a href="https://github.com/miftahganzz/Bot-Telegram/network/members">
    <img title="Forks" src="https://img.shields.io/github/forks/miftahganzz/Bot-Telegram?color=red&style=flat-square">
  </a>
  <a href="https://github.com/miftahganzz/Bot-Telegram/watchers">
    <img title="Watching" src="https://img.shields.io/github/watchers/miftahganzz/Bot-Telegram?label=Watchers&color=blue&style=flat-square">
  </a>
  <a href="https://github.com/miftahganzz/Bot-Telegram">
    <img title="Open Source" src="https://badges.frapsoft.com/os/v2/open-source.svg?v=103">
  </a>
  <a href="https://github.com/miftahganzz/Bot-Telegram/">
    <img title="Size" src="https://img.shields.io/github/repo-size/miftahganzz/Bot-Telegram?style=flat-square&color=green">
  </a>
  <a href="https://hits.seeyoufarm.com">
    <img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fmiftahganzz%2FBot-Telegram&count_bg=%2379C83D&title_bg=%23555555&icon=probot.svg&icon_color=%2300FF6D&title=hits&edge_flat=false"/>
  </a>
  <a href="https://github.com/miftahganzz/Bot-Telegram/graphs/commit-activity">
    <img height="20" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg">
  </a>
</p>

<p align="center">
  <a href="https://github.com/miftahganzz/Bot-Telegram#feature">Feature</a> •
  <a href="https://github.com/miftahganzz/Bot-Telegram#howtoinstall">How To Install</a> •
  <a href="https://github.com/miftahganzz/Bot-Telegram#installing">Installing</a> •
  <a href="https://github.com/miftahganzz/Bot-Telegram#thanks-to">Thanks to</a> •
  <a href="https://github.com/miftahganzz/Bot-Telegram#donate">Donate</a>
</p>

---

# 🤖 Features
- Main Menu
- AI Menu
- Group Menu
- Download Menu
- Random Menu
- Search Menu
- Tools Menu
- Game Menu
- Owner Menu

---

# 🚀 How To Install

1. **Get Telegram Bot Tokens** from [Bot Father](https://t.me/@BotFather)
2. **Get Chat Owner ID** from [Bot ID](https://t.me/@username_to_id_bot)
3. **Get API Key** from [Yanz API](https://api.yanzbotz.my.id) and [Caliph API](https://api.caliph.biz.id)
4. **Download or fork** this GitHub repository
5. **Configure** the bot token, API key, etc. in the `config.js` file
6. **Install the dependencies** by running `npm install`
7. **Run the bot** by running `npm start`
8. **Open the Telegram app** and search for the bot you have created
9. **Start a chat** with your bot

---

## 📦 Installing
```bash
git clone https://github.com/miftahganzz/Bot-Telegram
cd Bot-Telegram
npm install
npm start
```

---

## ⚙️ Settings

<details>
  <summary>Click to expand</summary>

You can edit the owner and other settings in `'./config.js'`:
```js
global.PORT = process.env.PORT || 3000;
global.time_interval = 60 * 60 * 1000;

// Bot Settings
global.ownerName = "miftahganzz";
global.ownerId = ; // your id
global.botToken = ""; // get in bot Father 
global.botMode = "public"; // Bot Mode
global.nameGroup = "miftahgrup";
global.nameChannel = "ITzpire";
global.mongoURL = ""; // Your url mongodb
global.autoRestartLimitAndBalance = false; // true or false
global.web_view = true; // default false
global.database = "MongoDB";
global.github = "https://github.com/miftahganzz"; // your github
global.telegram = "https://t.me/miftahganzz";
global.totalFeatures = 10; // total feature or just empty it
global.game_duration = 60; // Game duration 
global.fileLimit = 10;

// Default limit and balance user free
global.user = {
  Limit: 25,
  Balance: 50
};

global.refferUser = {
  limit: 15,
  balance: 25
};

global.reffer = {
  limit: 30,
  balance: 50
};

global.thumb = [
  "https://minimalistic-wallpaper.demolab.com/?random"
];

global.mess = {
  onlyOwner: "[!] This feature can only be used by the owner.",
  onlyPremium: "[!] This feature can only be used by premium users.",
  onlyGroup: "[!] This feature can only be used within groups.",
  onlyPrivate: "[!] This feature can only be used in private chat.",
  onlyGroup: "[!] This feature can only be used in group chat.",
  onlyAdmin: "[!] This feature can only be used by admin group.",
  onlyBotAdmin: "[!] The bot must be a group admin to use this command.",
  question: "Enter a question...",
  prompt: "Enter a prompt...",
  error: "Sorry, the feature has an error.",
  limit: "You have reached the limit.",
  start: "You are not yet registered in the Bot database. Use the command /start to start."
};

global.api = {
  yanz: "https://api.yanzbotz.my.id",
  itzpire: "https://itzpire.com",
  caliph: "https://api.caliph.biz.id"
};

global.apikey = {
  yanz: "", // your apikey yanz
  caliph: "" // yout apikey caliph
};
```
</details>

---

## 🤝 Contributing
Contributions are always welcome! Feel free to fork the repository and submit a pull request with your improvements.

---

## ⚠️ Note
- **Do not sell** this bot or any part of this code.
- **Keep the credits** to respect the effort of the developer.

---

## 💖 Donate
- [Saweria](https://saweria.co/itzpire)
- [Trakteer](https://trakteer.id/itzpire_business)

---

## 🙏 Thanks to
<a href="https://github.com/miftahganzz"><img src="https://github.com/miftahganzz.png?size=100" width="100" height="100"></a> | <a href="https://github.com/YanzBotz"><img src="https://github.com/YanzBotz.png?size=100" width="100" height="100"></a> | <a href="https://github.com/caliph91"><img src="https://github.com/caliph91.png?size=100" width="100" height="100"></a> 
---|---|---
[Miftah GanzZ](https://github.com/miftahganzz)  | [Yanz](https://github.com/YanzBotz) | [Caliph Dev](https://github.com/caliph91) 
Developer | Constributor | Constributor | 

---
