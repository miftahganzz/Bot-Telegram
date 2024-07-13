global.PORT = process.env.PORT || 3000;
global.time_interval = 60 * 60 * 1000;

// Bot Settings
global.ownerName = "miftahganzz";
global.ownerId = your_id;
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