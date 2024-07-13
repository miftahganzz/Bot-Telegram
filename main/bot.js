const { Telegraf, Extra, session, Markup } = require('telegraf');
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const cfonts = require('cfonts');
const chalk = require('chalk');
const menu = require("./menu");
const os = require('os');
const exec = require('child_process').exec;
const util = require('util');
require("../config");

// Lib
const func = require("../lib/func");

mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
const User = mongoose.model('bot-tele', {
  id: Number,
  username: String,
  isPremium: Boolean,
  status: String,
  lastClaim: Date,
  limit: { type: Number, default: 25 },
  balance: { type: Number, default: 50 },
  premiumExpireDate: Date,
  referralCode: String,
  referredBy: String,
  referrals: { type: Number, default: 0 }
});

const db = mongoose.connection;

db.on('connected', () => {
  console.log(chalk.whiteBright('├'), chalk.greenBright(`[✓] Connected to MongoDB!`));
});

db.on('error', (err) => {
  console.error(chalk.red(`[!] MongoDB connection error: ${err}`));
});

const bot = new Telegraf(botToken);

// Function
function restartLimitAndBalance() {
  setInterval(async () => {
    const currentDate = new Date();
    const autoRestart = autoRestartLimitAndBalance;

    if (autoRestart) {
      if (currentDate.getHours() === 0 && currentDate.getMinutes() === 0) {
        const users = await User.find();

        for (const user of users) {
          const prevLimit = user.limit;
          const prevBalance = user.balance;

          user.limit = user.Limit; 
          user.balance = user.Balance;
          await user.save();

          const ownerMessage = `Limit and balance have been restarted for user ${user.username} (ID: ${user.id}).\nPrevious Limit: ${prevLimit}, Previous Balance: ${prevBalance}\nNew Limit: ${user.Limit}, New Balance: ${user.Balance}`;
          bot.telegram.sendMessage(ownerId, ownerMessage);
        }
      }
    } else {
      console.log('Automatic restart of limit and balance is turned off.');
    }
  }, 60 * 1000); 
}

restartLimitAndBalance();

async function findUserByIdentification(userIdentification) {
  const user = await User.findOne({
    $or: [
      { id: userIdentification },
      { username: userIdentification },
      { 'profile.username': userIdentification }
    ]
  });
  return user;
}

// Command
bot.use(session());

bot.use(async (ctx, next) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id; 
  
  if (botMode === 'self') {
    const allowedUserIds = [ownerId]; 
    
    if (!allowedUserIds.includes(userId)) {
    }
  }
  
  return next();
});

bot.command(['start', 'help', 'menu'], async (ctx) => {
  const now = moment().tz('Asia/Jakarta');
  const hour = now.hour();
  let greeting = '';
  let emoji = '';

  if (hour >= 4 && hour < 11) {
    greeting = 'Good morning';
    emoji = '🌅';
  } else if (hour >= 11 && hour < 15) {
    greeting = 'Good midday';
    emoji = '☀️';
  } else if (hour >= 15 && hour < 18) {
    greeting = 'Good afternoon';
    emoji = '🌆';
  } else if (hour >= 18 && hour < 24) {
    greeting = 'Good evening';
    emoji = '🌙';
  } else {
    greeting = 'Good midnight';
    emoji = '🌌';
  }

  const date = now.format('DD MMMM YYYY');
  const day = now.format('dddd');
  const time = now.format('HH:mm:ss');
  const { first_name, id } = ctx.from;
  const keyboard = {
    inline_keyboard: [
      [{ text: 'Join Grup', url: 'https://t.me/' + nameGroup }],
      [{ text: 'Channel', url: 'https://t.me/' + nameChannel }]
    ]
  };

  let replyMessage;
  try {
    let existingUser = await User.findOne({ id: ctx.from.id });

    const args = ctx.message.text.split(' ');
    let referredBy = null;
    if (args.length > 1) {
      referredBy = args[1];
    }

    if (!existingUser) {
      const newUser = new User({
        id: ctx.from.id,
        username: ctx.from.username,
        isPremium: false,
        lastClaim: null,
        status: 'free',
        limit: 25,
        balance: 50,
        referralCode: func.generateReferralCode(ctx.from.id),
        referredBy: referredBy
      });

      if (ctx.from.id === ownerId) {
        newUser.status = 'Owner';
        newUser.limit = Infinity;
        newUser.balance = Infinity;
      }

      if (referredBy) {
        const referrer = await User.findOne({ referralCode: referredBy });
        if (referrer) {
          referrer.balance += refferUser.balance;
          referrer.limit += refferUser.limit;
          referrer.referrals += 1;
          await referrer.save();

          newUser.balance += reffer.balance;
          newUser.limit += reffer.limit;
          await newUser.save();

          await ctx.reply(`WELCOME! You have used a referral code. You get +${reffer.balance} balance and +${reffer.limit} limit.`);
          await bot.telegram.sendMessage(referrer.id, `New user has used your referral code! You get +${refferUser.balance} balance and +${refferUser.limit} limit.`);
        } else {
          await newUser.save();
          await ctx.reply('Welcome! Unfortunately, the referral code you used is invalid.');
        }
      } else {
        await newUser.save();
      }

      existingUser = newUser;
    }

    const isOwner = existingUser.id === ownerId;
    if (isOwner) {
      existingUser.status = 'Owner';
      existingUser.limit = Infinity;
      existingUser.balance = Infinity;
      await existingUser.save();
    }
    
    const status = existingUser.status;
    const limit = existingUser.limit; 
    const balance = existingUser.balance;

    const userInfo = `
${greeting} ${first_name} ${emoji}\n
┎━「 INFO BOT ｣
┃➤ Date: ${date}
┃➤ Day: ${day}
┃➤ Time: ${time}
┃➤ Database: ${database}
┣━「 INFO USER ｣
┃➤ Name: ${existingUser.username}
┃➤ ID: ${existingUser.id}
┃➤ Status User: ${status}
┃➤ Limit: ${limit}
┃➤ Balance: ${balance}
┃➤ Referral Code: ${existingUser.referralCode}
┗━━━━━━━━━\n
${menu}
`;

    const randomThumb = thumb[Math.floor(Math.random() * thumb.length)];
    //await ctx.replyWithPhoto(randomThumb, { caption: `${userInfo}`, reply_markup: keyboard });
    await ctx.reply(userInfo, { reply_markup: keyboard })
  } catch (error) {
    console.error('Error handling bot start:', error);
    replyMessage = 'An error occurred. Please try again later.';
    await ctx.reply(replyMessage);
  }
});

// API Feature
bot.command(['ai', 'gptweb'], async (ctx) => {
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }

  if (user.limit > 0) {
    const question = ctx.message.text.split(' ').slice(1).join(' ');

    if (!question) {
      await ctx.reply(mess.question);
      return;
    }

    const encodedQuestion = encodeURIComponent(question);
    const apiUrl = `${api.itzpire}/ai/gpt-web?q=${encodedQuestion}&chat_id=${ctx.from.id}`;

    try {
      await ctx.replyWithChatAction('typing');

      const response = await axios.get(apiUrl);
      const answer = response.data.result;

      user.limit -= 1;
      await user.save();

      await ctx.reply(`${answer}`);
    } catch (error) {
      console.error(error);
      await ctx.reply(mess.error);
    }
  } else {
    await ctx.reply(mess.limit);
  }
});

bot.command('gemini', async (ctx) => {
  const user = await User.findOne({ id: ctx.from.id });

  if (user.limit > 0) {
  try {
    const query = ctx.message.text.split('/gemini')[1];

    if (!query) {
      return ctx.reply(mess.question);
    }

    let fileLink = '';
    const repliedMessage = ctx.message.reply_to_message;
    const isPhoto = repliedMessage && repliedMessage.photo && repliedMessage.photo.length > 0;

    if (isPhoto) {
      const fileId = repliedMessage.photo[repliedMessage.photo.length - 1].file_id;
      const file = await ctx.telegram.getFile(fileId);
      fileLink = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
    }

    await ctx.replyWithChatAction('typing');
    const response = await axios.get(api.itzpire + `/ai/gemini-ai?q=${query}&url=${encodeURIComponent(fileLink)}`);
    const result = response.data.result;

    user.limit -= 1;
    await user.save();  
    
    ctx.replyWithMarkdown(result);
  } catch (error) {
    console.error('Error processing image:', error.message);
    ctx.reply('An error occurred while processing the image.');
  } 
} else {
    await ctx.reply(mess.limit);
  }
});

bot.command('alicia', async (ctx) => {
  const emojiRegex = /\p{Emoji}/gu;
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }

  if (user.limit > 0) {
    const question = ctx.message.text.split(' ').slice(1).join(' ');

    if (!question) {
      await ctx.reply('Please type your question.');
      return;
    }

    const encodedQuestion = encodeURIComponent(question);
    const apiUrl = `${api.itzpire}/ai/botika?q=${encodedQuestion}&model=alicia&user=${ctx.chat.id}`;

    try {
      await ctx.replyWithChatAction('typing');

      const response = await axios.get(apiUrl);
      let fullJawaban = response.data.result;

      fullAnswer = fullJawaban.replace(emojiRegex, '');

      const limitedAnswer = fullAnswer.substring(0, 300);

      const ttsApiUrl = `/api/tts/janie?query=${encodeURIComponent(limitedAnswer)}&apiKey=${apikey.yanz}`;

      const ttsResponse = await axios.get(api.yanz + ttsApiUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(ttsResponse.data, 'base64');

      user.limit -= 1;
      await user.save();

      await ctx.reply(`${fullJawaban}`);

      await ctx.replyWithAudio({ source: audioBuffer });
    } catch (error) {
      console.error(error);
      await ctx.reply(mess.error);
    }
  } else {
    await ctx.reply(mess.limit);
  }
});

bot.command('emi', async (ctx) => {
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }

  if (user.limit > 0) {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');

    if (!prompt) {
      await ctx.reply(`Incorrect use. Example: /emi cat`);
      return;
    }

    try {
      await ctx.replyWithChatAction('upload_photo');

      const response = await axios.get(api.itzpire + `/ai/emi?prompt=${prompt}`);
      const result = response.data.result;

      user.limit -= 1;
      await user.save();

      await ctx.replyWithPhoto({url: result}, { caption: `Prompt: ${prompt}` });
    } catch (error) {
      console.error(error);
      await ctx.reply(mess.error);
    }
  } else {
    await ctx.reply(mess.limit);
  }
});

bot.command('3dmodel', async (ctx) => {
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }

  if (user.limit > 0) {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');

    if (!prompt) {
      await ctx.reply(`Incorrect use. Example: /3dmodel cat`);
      return;
    }

    try {
      await ctx.replyWithChatAction('upload_photo');

      const response = await axios.get(api.itzpire + `/ai/3dmodel?prompt=${prompt}`);
      const result = response.data.result;

      user.limit -= 1;
      await user.save();

      await ctx.replyWithPhoto({url: result}, { caption: `Prompt: ${prompt}` });
    } catch (error) {
      console.error(error);
      await ctx.reply(mess.error);
    }
  } else {
    await ctx.reply(mess.limit);
  }
});

bot.command('animediff', async (ctx) => {
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }

  if (user.limit > 0) {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');

    if (!prompt) {
      await ctx.reply(`Incorrect use. Example: /animediff cat`);
      return;
    }

    try {
      await ctx.replyWithChatAction('upload_photo');

      const response = await axios.get(api.itzpire + `/ai/animediff2?prompt=${prompt}`);
      const result = response.data.result;

      user.limit -= 1;
      await user.save();

      await ctx.replyWithPhoto({url: result}, { caption: `Prompt: ${prompt}` });
    } catch (error) {
      console.error(error);
      await ctx.reply(mess.error);
    }
  } else {
    await ctx.reply(mess.limit);
  }
});

// Search Feature 
bot.command('pinterest', async (ctx) => {
    const commandParams = ctx.message.text.split('|');
    const query = commandParams[0].split(' ')[1];
    let count = parseInt(commandParams[1]) || 1;
    if (count > 5) count = 5; 

    if (!query) {
        return ctx.reply('Incorrect command format. Use /pinterest query|amount. Max quantity 5');
    }

    try {
        const user = await User.findOne({ id: ctx.from.id });
        if (!user) {
            return ctx.reply(mess.start);
        }
        if (user.limit <= 0) {
            return ctx.reply(mess.limit);
        }

        user.limit -= 1;
        await user.save();

        const response = await axios.get(api.itzpire + `/search/pinterest?query=${query}`);
        const { status, data } = response.data;

        if (status === 'success') {
            const images = data.slice(0, count);
            for (const image of images) {
            	await ctx.replyWithChatAction('upload_photo');
                await ctx.replyWithPhoto({ url: image });
            }
        } else {
            await ctx.reply('Cannot find image for the given query.');
        }
    } catch (error) {
        console.error('Error:', error);
        await ctx.reply(mess.error);
    }
});

// Tools Feature 
bot.command('get', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    ctx.reply('Incorrect command format. Usage example: /get <url>', { reply_to_message_id: ctx.message.message_id });
    return;
  }
  const url = args[1];
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'];

    if (contentType.startsWith('image/')) {
      await ctx.replyWithChatAction('upload_photo');
      ctx.replyWithPhoto({ source: Buffer.from(response.data) });
    } else if (contentType.startsWith('video/')) {
      await ctx.replyWithChatAction('upload_video');
      ctx.replyWithVideo({ source: Buffer.from(response.data) });
    } else if (contentType.startsWith('audio/')) {
      await ctx.replyWithChatAction('upload_audio');
      ctx.replyWithAudio({ source: Buffer.from(response.data) });
    } else if (contentType.startsWith('text/html')) {
      await ctx.replyWithChatAction('upload_document');
      ctx.replyWithDocument({ source: Buffer.from(response.data), filename: 'data.html' });
    } else if (contentType.startsWith('application/json')) {
      const jsonData = Buffer.from(response.data).toString('utf-8');
      if (jsonData.length <= 200) {
        await ctx.replyWithChatAction('typing');
        ctx.reply(`\`\`\`json\n${jsonData}\n\`\`\``, { parse_mode: 'Markdown' });
      } else {
        await ctx.replyWithChatAction('upload_document');
        ctx.replyWithDocument({ source: Buffer.from(response.data), filename: 'data.json' });
      }
    } else {
      ctx.reply('Data is inaccessible or format is not supported.', { reply_to_message_id: ctx.message.message_id });
    }
  } catch (error) {
    console.error('Error:', error);
    ctx.reply(mess.error, { reply_to_message_id: ctx.message.message_id });
  }
});

bot.command('makezombie', async (ctx) => {
  const user = await User.findOne({ id: ctx.from.id });

  if (user.limit > 0) {
    try {
      const message = ctx.message;
      const repliedMessage = message.reply_to_message;

      if (!repliedMessage || !repliedMessage.photo) {
        return ctx.reply('Please reply to an image to convert it to a zombie filter.');
      }

      const photo = repliedMessage.photo;
      const fileId = photo[photo.length - 1].file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await axios.get(api.itzpire + `/tools/jadizombie?url=${encodeURIComponent(fileLink)}`);
      const result = response.data.result;

      user.limit -= 2;
      await user.save();

      await ctx.replyWithChatAction('upload_photo');
      await ctx.replyWithPhoto({ url: result }, { caption: "Success Convert To Zombie Filter" });
    } catch (error) {
      console.error('Error processing image:', error.message);
      ctx.reply(mess.error);
    }
  } else {
    await ctx.reply(mess.limit);
  }
});

// Downloader Feature 
bot.command('tiktok', async (ctx) => {
    const url = ctx.message.text.split(' ')[1];
    if (!url) {
        return ctx.reply('Usage example: /tiktok <url>.');
    }

    try {
        const user = await User.findOne({ id: ctx.from.id });

        if (user.limit > 0) {
            const response = await fetch(`https://api.tiklydown.eu.org/api/download/v3?url=${url}`);
            const data = await response.json();

            if (data.status === 200) {
                const { author, statistics, video, music, images, desc } = data.result;

                let message = `Author: ${author.nickname}\n`;
                message += `Desc: ${desc}\n`;
                message += `Like: ${statistics.likeCount}\n`;
                message += `Comment: ${statistics.commentCount}\n`;
                message += `Share: ${statistics.shareCount}\n`;

                if (data.result.type === 'video' && video) {
                    await ctx.replyWithChatAction('upload_video');
                    await ctx.replyWithVideo({ url: video }, { caption: message });

                    if (music) {
                        await ctx.replyWithChatAction('upload_audio');
                        await ctx.replyWithVoice({ url: music });
                    }
                }

                if (data.result.type === 'image' && images && images.length > 0) {
                    if (images.length <= 3) {
                        for (const image of images) {
                            await ctx.replyWithChatAction('upload_photo');
                            await ctx.replyWithPhoto({ url: image });
                        }
                        await ctx.replyWithPhoto({ url: images[images.length - 1] }, { caption: message });
                    } else {
                        for (const image of images) {
                            await ctx.replyWithChatAction('upload_photo');
                            await ctx.telegram.sendPhoto(ctx.from.id, { url: image });
                        }
                        await ctx.telegram.sendPhoto(ctx.from.id, { url: images[images.length - 1] }, { caption: message });
                        await ctx.reply(`Too many images to display here. Sent ${images.length} images to your private chat.`);
                    }

                    if (music) {
                        await ctx.telegram.sendVoice(ctx.from.id, { url: music });
                    }
                }

                user.limit -= 1;
                await user.save();

            } else {
                return ctx.reply('Failed to retrieve TikTok data. The URL may be invalid or the video may not be available.');
            }
        } else {
            return ctx.reply(mess.limit);
        }
    } catch (error) {
        console.error('Error:', error);
        return ctx.reply(mess.error);
    }
});

bot.command('spotifydl', async (ctx) => {
const user = await User.findOne({ id: ctx.from.id });

  if (user.limit > 0) {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    const url = args[0];

    if (!url || !url.includes('open.spotify.com')) {
      return ctx.reply('Invalid Spotify URL. Please provide a valid Spotify track URL.');
    }

    const response = await axios.get(api.itzpire + `/download/aio?url=${encodeURIComponent(url)}`);
    const data = response.data;

    if (data.status === 'success') {
      const { title, duration, image, download, artist } = data.data;
      const durationInSeconds = Math.floor(duration / 1000);
      const startTime = '0:00';
      const endTime = func.formatTime(durationInSeconds);

      const musicardResponse = await axios.get(api.itzpire + `/maker/musicard?song=${title}&artist=${artist}&theme=neon&album_img=${image}&progress=15&startTime=${startTime}&endTime=${endTime}`);
      const musicardResult = musicardResponse.data.result;

      user.limit -= 2;
      await user.save(); 
      
      await ctx.replyWithChatAction('upload_audio');
      await ctx.replyWithPhoto({ url: musicardResult}, { caption: `Title: ${title}\nArtist: ${artist}\nDuration: ${endTime}` });
      await ctx.replyWithAudio({ url: download });
    } else {
      ctx.reply('An error occurred while processing the Spotify URL.');
    }
  } catch (error) {
    console.error('Error:', error);
    ctx.reply(mess.error);
  }
} else {
    await ctx.reply(mess.limir);
  }
});

// Main Feature 
bot.command('ping', async (ctx) => {
      try {
        const startTime = performance.now();
        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMemory = os.totalmem() / 1024 / 1024;
        const freeMemory = os.freemem() / 1024 / 1024;
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const cpuCores = os.cpus().length;
        const cpuModel = os.cpus()[0].model;
       const cpuSpeed = os.cpus()[0].speed;
        const nodeVersion = process.version;
        const runtimeSeconds = process.uptime();
        const pingMessage =
          `Ping: ${responseTime.toFixed(2)} ms\n` +
          `Used Memory: ${usedMemory.toFixed(2)} MB\n` +
          `Total Memory: ${totalMemory.toFixed(2)} MB\n` +
          `Free Memory: ${freeMemory.toFixed(2)} MB\n` +
          `CPU Cores: ${cpuCores}\n` +
          `CPU Model: ${cpuModel}\n` +
          `CPU Speed: ${cpuSpeed} MHz\n` +
          `NodeJS Version: ${nodeVersion}\n` +
          `Bot Online: ${func.formatRuntime(runtimeSeconds)}\n`;

        await ctx.reply(pingMessage);
      } catch (error) {
        console.error('Error:', error);
        ctx.reply(mess.error);
      }
    });
    
// Group Feature
bot.command('hidetag', async (ctx) => {
    const isAdmin = ctx.message.chat.type === 'group' || ctx.message.chat.type === 'supergroup' ? await bot.telegram.getChatMember(ctx.message.chat.id, ctx.message.from.id).then(member => member.status === 'administrator' || member.status === 'creator') : false;
    const isOwner = ctx.from.username === ownerName;

    if (!isAdmin && !isOwner) {
        ctx.reply(mess.onlyAdmin);
        return;
    }

    const message = ctx.message.text.split(' ').slice(1).join(' ');
    const members = await bot.telegram.getChatMembersCount(ctx.message.chat.id);
    const userIds = [];
    for (let i = 0; i < Math.ceil(members / 200); i++) {
        const memberIds = await bot.telegram.getChatAdministrators(ctx.message.chat.id);
        memberIds.forEach(member => {
            if (!member.user.is_bot) {
                userIds.push(member.user.id);
            }
        });
    }

    try {
        userIds.forEach(userId => {
            bot.telegram.sendMessage(ctx.message.chat.id, `[\u200c](tg://user?id=${userId})${message}`, { parse_mode: 'MarkdownV2' });
        });
    } catch (error) {
        console.error('Error sending message:', error);
        ctx.reply('An error occurred while sending the message.');
    }
});

bot.command('delete', async (ctx) => {
    if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
        const botInfo = await ctx.telegram.getMe();
        const botId = botInfo.id;
        const chatAdmins = await ctx.getChatAdministrators(ctx.chat.id);
        const isBotAdmin = chatAdmins.some(admin => admin.user.id === botId);
        if (!isBotAdmin) {
            await ctx.reply(mess.onlyBotAdmin);
            return;
        }

        try {
            const messageId = ctx.message.message_id;
            await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
        } catch (error) {
            console.error('Error:', error);
            await ctx.reply('An error occurred while deleting the message.');
        }

        const replyMessage = ctx.message.reply_to_message;
        if (!replyMessage) {
            await ctx.reply('Use the /delete command to reply to the message you want to delete.');
            return;
        }

        const senderId = ctx.from.id.toString();
        const isAdmin = chatAdmins.some(admin => admin.user.id.toString() === senderId && (admin.status === 'creator' || admin.status === 'administrator'));
        if (!isAdmin) {
            await ctx.reply(mess.onlyAdmin);
            return;
        }

        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, replyMessage.message_id);
        } catch (error) {
            console.error('Error:', error);
            await ctx.reply('An error occurred while deleting the message.');
        }
    } else if (ctx.chat.type === 'private') {
        try {
            const messageId = ctx.message.message_id;
            await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
        } catch (error) {
            console.error('Error:', error);
            await ctx.reply('An error occurred while deleting the message.');
        }
    } else {
        await ctx.reply('This command can only be used in a group or private chat.');
    }
});

bot.command('pinmsg', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }
    
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!chatMember || chatMember.status !== 'administrator') {
        return ctx.reply(mess.onlyBotAdmin);
    }

    const repliedMessage = ctx.message.reply_to_message;
    if (!repliedMessage) {
        return ctx.reply('Please reply to the message you want to pin in the group.');
    }

    try {
        await ctx.telegram.pinChatMessage(ctx.chat.id, repliedMessage.message_id, { disable_notification: true });
        return ctx.reply('The message was successfully pin in the group.');
    } catch (error) {
        console.error('Failed to pin message in group:', error);
        return ctx.reply('Failed to pin message in group.');
    }
});

bot.command('unpinmsg', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }
    
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!chatMember || chatMember.status !== 'administrator') {
        return ctx.reply(mess.onlyBotAdmin);
    }

    try {
        await ctx.telegram.unpinChatMessage(ctx.chat.id);
        return ctx.reply('Message successfully unpin from group.');
    } catch (error) {
        console.error('Failed to unpin message from group:', error);
        return ctx.reply('Failed to unpin message from group.');
    }
});

bot.command('setdesc', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!chatMember || chatMember.status !== 'administrator') {
        return ctx.reply(mess.onlyBotAdmin);
    }

    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }

    const commandParts = ctx.message.text.split(' ');
    commandParts.shift(); 
    const newDescription = commandParts.join(' ');
    
    if (!newDescription.trim()) {
        return ctx.reply('Description cannot be empty.');
    }

    try {
        await ctx.telegram.setChatDescription(ctx.chat.id, newDescription);
        return ctx.reply('The group description was changed successfully.');
    } catch (error) {
        console.error('Failed to change group description:', error);
        return ctx.reply('Failed to change group description.');
    }
});

bot.command('setppgc', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!chatMember || chatMember.status !== 'administrator') {
        return ctx.reply(mess.onlyBotAdmin);
    }

    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }

    const repliedMessage = ctx.message.reply_to_message;
    if (!repliedMessage || !repliedMessage.photo) {
        return ctx.reply('Please reply with the image you want to use as the group profile photo.');
    }

    const photo = repliedMessage.photo[repliedMessage.photo.length - 1];
    try {
        const photoInfo = await ctx.telegram.getFile(photo.file_id);
        const photoUrl = `https://api.telegram.org/file/bot${botToken}/${photoInfo.file_path}`;
        await ctx.telegram.setChatPhoto(ctx.chat.id, { url: photoUrl });
        return ctx.reply('The group profile photo has been successfully changed.');
    } catch (error) {
        console.error('Failed to change group profile photo:', error);
        return ctx.reply('Failed to change group profile photo.');
    }
});

bot.command('promote', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!chatMember || chatMember.status !== 'administrator') {
        return ctx.reply(mess.onlyBotAdmin);
    }

    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }

    const targetUserId = getTargetUserId(ctx);
    if (!targetUserId) {
        return ctx.reply('Please reply to the message of the user you want to make admin and use the /promote command.');
    }

    const chatId = ctx.message.chat.id;

    try {
        await ctx.telegram.promoteChatMember(chatId, targetUserId, {
            can_change_info: true,
            can_delete_messages: true,
            can_invite_users: true,
            can_restrict_members: true,
            can_pin_messages: true,
            can_promote_members: false,
        });
        return ctx.reply('User has been promote as admin.');
    } catch (error) {
        console.error('Failed to promote users:', error);
        return ctx.reply('Failed to promote users.');
    }
});

bot.command('demote', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!chatMember || chatMember.status !== 'administrator') {
        return ctx.reply(mess.onlyBotAdmin);
    }

    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }

    const targetUserId = getTargetUserId(ctx);
    if (!targetUserId) {
        return ctx.reply('Please reply to the message of the user you want to demote as admin and use the /demote command.');
    }

    const chatId = ctx.message.chat.id;

    try {
        await ctx.telegram.promoteChatMember(chatId, targetUserId, {
            can_change_info: false,
            can_delete_messages: false,
            can_invite_users: false,
            can_restrict_members: false,
            can_pin_messages: false,
            can_promote_members: false,
        });
        return ctx.reply('Admin has been demote.');
    } catch (error) {
        console.error('Failed to demote admin:', error);
        return ctx.reply('Failed to demote admin.');
    }
});

bot.command('createpoll', async (ctx) => {
	    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }
    
    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }

    const pollArgs = ctx.message.text.split(';');
    const question = pollArgs[1];
    const options = pollArgs.slice(2);

    if (options.length < 2) {
        return ctx.reply('Polls must have at least two options.');
    }

    const keyboard = {
        inline_keyboard: options.map((option) => [{ text: option, callback_data: option }])
    };

    return ctx.telegram.sendPoll(ctx.message.chat.id, question, options, { reply_markup: keyboard });
});

bot.command('infogroup', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    const chatId = ctx.message.chat.id;
    const chatInfo = await ctx.telegram.getChat(chatId);
    const membersCount = await ctx.telegram.getChatMembersCount(chatId);
    const adminList = await ctx.telegram.getChatAdministrators(chatId);
    const adminNames = adminList.map(admin => admin.user.username).join(', ');

    let photo = '';
    if (chatInfo.photo) {
        photo = chatInfo.photo.big_file_id;
    } else {
        photo = 'AgACAgIAAxkBAAIBomE9MfM-NCaU-UeritVgN-gouSYKAAJysTEbs8S5SswybVqdfl3H--mjli4AAwEAAwIAA3gAA5FpAAIfBA'; // PP kosong
    }

    let message = `
    Information about the group:
    - Group Name: ${chatInfo.title}
    - Group Description: ${chatInfo.description ? chatInfo.description : 'No description.'}
    - Group Link: ${chatInfo.invite_link ? chatInfo.invite_link : 'No Link.'}
    - Group ID: ${chatId}
    - Group Type: ${chatInfo.type}
    - Number of Members: ${membersCount}
    - Group Admins: ${adminNames}
    `;

    ctx.replyWithPhoto(photo, { caption: message });
});

bot.command('linkgc', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }

    try {
        const inviteLink = await ctx.telegram.exportChatInviteLink(ctx.message.chat.id);
        ctx.reply('Group invite link: ' + inviteLink);
    } catch (error) {
        console.error('Error while getting group link:', error);
        ctx.reply('An error occurred while getting the group invite link.');
    }
});

bot.command('setnamegc', async (ctx) => {
    if (!ctx.message.chat.type || (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup')) {
        return ctx.reply(mess.onlyGroup);
    }
    
    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply(mess.onlyAdmin);
    }
    
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!chatMember || chatMember.status !== 'administrator') {
        return ctx.reply(mess.onlyBotAdmin);
    }

    const chatId = ctx.message.chat.id;
    const newName = ctx.message.text.split(' ').slice(1).join(' '); 

    try {
        await ctx.telegram.setChatTitle(chatId, newName);
        ctx.reply('The group name has been successfully changed to: ' + newName);
    } catch (error) {
        console.error('Error while setting group name:', error);
        ctx.reply('An error occurred while changing the group name.');
    }
});

function getTargetUserId(ctx) {
    const replyMessage = ctx.message.reply_to_message;
    if (replyMessage && replyMessage.from && replyMessage.from.id) {
        return replyMessage.from.id;
    }
    return null;
}

async function checkAdmin(ctx) {
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return chatMember && (chatMember.status === 'administrator' || chatMember.status === 'creator');
}

// Random Menu
bot.command('moviepotter', async (ctx) => {
    try {
        const response = await axios.get('https://api.potterdb.com/v1/characters');
        const movies = response.data.data;
        const randomIndex = Math.floor(Math.random() * characters.length);
        const randomMovies = movies[randomIndex].attributes;

        let message = '';
        message += `*Name*: ${randomCharacter.name}\n`;

        if (randomCharacter.alias_names && randomCharacter.alias_names.length > 0) {
            message += `*Alias Names*: ${randomCharacter.alias_names.join(', ')}\n`;
        }
        if (randomCharacter.type) {
            message += `*Type*: ${randomCharacter.type}\n`;
        }
        if (randomCharacter.image) {
            await ctx.replyWithPhoto(randomCharacter.image, {
                caption: message,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(message);
        }
    } catch (error) {
        console.error('Error fetching movie:', error);
        ctx.reply(mess.error);
    }
});

bot.command('bookspotter', async (ctx) => {
    try {
        const response = await axios.get('https://api.potterdb.com/v1/books');
        const books = response.data.data;
        const randomIndex = Math.floor(Math.random() * books.length);
        const randomBooks = books[randomIndex].attributes;

        let message = '';
        message += `*Title*: ${randomBooks.title}\n`;

        if (randomBooks.type) {
            message += `*Type*: ${randomBooks.type}\n`;
        }
        if (randomBooks.species) {
            message += `*Author*: ${randomBooks.author}\n`;
        }
        if (randomBooks.slug) {
            message += `*Slug*: ${randomBooks.slug}\n`;
        }
        if (randomBooks.dedication) {
            message += `*Dedication*: ${randomBooks.dedication}\n`;
        }
        if (randomBooks.pages) {
            message += `*Page*: ${randomBooks.pages}\n`;
        }
        if (randomBooks.release_date) {
            message += `*Release Date*: ${randomBooks.release_date}\n`;
        }
        if (randomBooks.summary) {
            message += `*Summary*: ${randomBooks.summary}\n`;
        }
        if (randomBooks.wiki) {
            message += `*Wiki*: [Learn More](${randomBooks.wiki})\n`;
        }
        if (randomBooks.cover) {
            await ctx.replyWithPhoto(randomBooks.cover, {
                caption: message,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(message);
        }
    } catch (error) {
        console.error('Error fetching books:', error);
        ctx.reply(mess.error);
    }
});

bot.command('charpotter', async (ctx) => {
    try {
        const response = await axios.get('https://api.potterdb.com/v1/characters');
        const characters = response.data.data;
        const randomIndex = Math.floor(Math.random() * characters.length);
        const randomCharacter = characters[randomIndex].attributes;

        let message = '';
        message += `*Name*: ${randomCharacter.name}\n`;

        if (randomCharacter.alias_names && randomCharacter.alias_names.length > 0) {
            message += `*Alias Names*: ${randomCharacter.alias_names.join(', ')}\n`;
        }
        if (randomCharacter.type) {
            message += `*Type*: ${randomCharacter.type}\n`;
        }
        if (randomCharacter.species) {
            message += `*Species*: ${randomCharacter.species}\n`;
        }
        if (randomCharacter.slug) {
            message += `*Slug*: ${randomCharacter.slug}\n`;
        }
        if (randomCharacter.animagus) {
            message += `*Animagus*: ${randomCharacter.animagus}\n`;
        }
        if (randomCharacter.born) {
            message += `*Born*: ${randomCharacter.born}\n`;
        }
        if (randomCharacter.died) {
            message += `*Died*: ${randomCharacter.died}\n`;
        }
        if (randomCharacter.blood_status) {
            message += `*Blood Status*: ${randomCharacter.blood_status}\n`;
        }
        if (randomCharacter.eye_color) {
            message += `*Eye Color*: ${randomCharacter.eye_color}\n`;
        }
        if (randomCharacter.gender) {
            message += `*Gender*: ${randomCharacter.gender}\n`;
        }
        if (randomCharacter.hair_color) {
            message += `*Hair Color*: ${randomCharacter.hair_color}\n`;
        }
        if (randomCharacter.house) {
            message += `*House*: ${randomCharacter.house}\n`;
        }
        if (randomCharacter.jobs && randomCharacter.jobs.length > 0) {
            message += `*Jobs*: ${randomCharacter.jobs.join(', ')}\n`;
        }
        if (randomCharacter.wiki) {
            message += `*Wiki*: [Learn More](${randomCharacter.wiki})\n`;
        }
        if (randomCharacter.image) {
            await ctx.replyWithPhoto(randomCharacter.image, {
                caption: message,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(message);
        }
    } catch (error) {
        console.error('Error fetching character:', error);
        ctx.reply(mess.error);
    }
});

bot.command('spellpotter', async (ctx) => {
    try {
        const response = await axios.get('https://api.potterdb.com/v1/spells');
        const spells = response.data.data;
        const randomIndex = Math.floor(Math.random() * spells.length);
        const randomSpell = spells[randomIndex].attributes;

        let message = '';
        message += `*Spell Name*: ${randomSpell.name}\n`;
        message += `*Category*: ${randomSpell.category}\n`;
        message += `*Effect*: ${randomSpell.effect}\n`;

        if (randomSpell.hand) {
            message += `*Hand Movement*: ${randomSpell.hand}\n`;
        }
        if (randomSpell.incantation) {
            message += `*Incantation*: ${randomSpell.incantation}\n`;
        }
        if (randomSpell.light) {
            message += `*Light Color*: ${randomSpell.light}\n`;
        }
        if (randomSpell.wiki) {
            message += `*Wiki*: [Learn More](${randomSpell.wiki})\n`;
        }

       if (randomSpell.image) {
            await ctx.replyWithPhoto({ url: randomSpell.image }, { caption: message, parse_mode: 'Markdown' });
        } else {
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('Error fetching spell:', error);
        ctx.reply(mess.error);
    }
});

// User Feature
bot.command('leaderboard', async (ctx) => {
    try {
        const topUsersByLimit = await User.find({ premium: false }).sort({ limit: -1 }).limit(10);
        
        const topUsersByBalance = await User.find({ premium: false }).sort({ balance: -1 }).limit(10);

        let leaderboardMessage = 'Leaderboard Top 10 Limit:\n\n';
        topUsersByLimit.forEach((user, index) => {
            leaderboardMessage += `${index + 1}. ${user.username || 'Unknown User'} - ${user.limit} limit\n`;
        });

        leaderboardMessage += '\nLeaderboard Top 10 Balance:\n\n';
        topUsersByBalance.forEach((user, index) => {
            leaderboardMessage += `${index + 1}. ${user.username || 'Unknown User'} - ${user.balance} balance\n`;
        });

        ctx.reply(leaderboardMessage);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        ctx.reply(mess.error);
    }
});

bot.command('claim', async (ctx) => {
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }

  const now = new Date();
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(now.getDate() - 1);

  if (user.lastClaim && user.lastClaim > oneDayAgo) {
    const remainingTime = new Date(user.lastClaim.getTime() + 24 * 60 * 60 * 1000);
    return ctx.reply(`You have already claimed today. Please wait until ${remainingTime.toLocaleString()}.`);
  }

  const newLimit = Math.floor(Math.random() * (15 - 3 + 1)) + 3;

  user.limit += newLimit;
  user.lastClaim = now;
  await user.save();

  ctx.reply(`Congratulations! You have claimed ${newLimit} limits. Your total limit now is ${user.limit}.`);
});

bot.command('listprem', async (ctx) => {
  const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
    return ctx.reply(mess.start);
  }

  if (user.isPremium || user.status === 'Owner') {
    const premiumUsers = await User.find({ isPremium: true });
    const premUserList = premiumUsers.map((premUser) => {
      const remainingTime = func.calculateRemainingTime(premUser.premiumExpireDate);
      return `Username: ${premUser.username}, Expired In: ${remainingTime}`;
    }).join('\n');
    ctx.reply(`List of Premium Users:\n${premUserList}`);
  } else {
    ctx.reply(mess.onlyPremium);
  }
});

bot.command('cekprem', async (ctx) => {
  const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
    return ctx.reply(mess.start);
  }

  if (user.isPremium || user.status === 'Owner') {
    const remainingTime = func.calculateRemainingTime(user.premiumExpireDate);
    ctx.reply(`Your Premium Expires In: ${remainingTime}`);
  } else {
    ctx.reply(mess.onlyPremium);
  }
});

bot.command('me', async (ctx) => {
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }
  
  const message = `*[ Your Profile ]*\n\nName: ${user.username}\nStatus: ${user.status}\nYour Limit: ${user.limit}\nYour Balance: ${user.balance}\nYour Refferal: ${user.referralCode}`

  ctx.replyWithMarkdown(message);
});

bot.command('myrefferal', async (ctx) => {
  try {
    const user = await User.findOne({ id: ctx.from.id });
    if (!user) {
      return ctx.reply(mess.start);
    }

    const referralLink = `https://t.me/${ctx.botInfo.username}?start=ref-${user.id}`;
    const inviteMessage = `🎉 Let's play ${ctx.botInfo.username} together! Earn rewards: +${reffer.balance} balance and +${reffer.limit} limit. Use my referral code \`${user.referralCode}\` and join the fun!`;

    const shareLink = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(inviteMessage)}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: 'Share Referral Link', url: shareLink }],
      ]
    };

    await ctx.replyWithHTML(`<b>[ REFERRAL CODE ]</b>\n\nReferral Code: \`${user.referralCode}\`\nReferral Link: ${referralLink}`, { reply_markup: keyboard });
  } catch (error) {
    console.error('Error fetching user data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('buylimit', async (ctx) => {
    const user = await User.findOne({ id: ctx.from.id });
  if (!user) {
     return ctx.reply(mess.start);
  }

  const args = ctx.message.text.split(' ').slice(1);
  const limitToBuy = parseInt(args[0]);

  if (!limitToBuy || isNaN(limitToBuy) || limitToBuy <= 0) {
    ctx.reply('Invalid command. Please use: /buylimit <quantity>');
    return;
  }

  const cost = limitToBuy * 15;

  if (user.balance >= cost) {

    user.balance -= cost;
    user.limit += limitToBuy;
    await user.save();

    ctx.reply(`Successfully bought ${limitToBuy} limits for ${cost} balance. New balance: ${user.balance}, New limit: ${user.limit}`);
  } else {
    ctx.reply('Sorry, your balance is not enough.');
  }
});

// Owner Feature
bot.command('listuser', async (ctx) => {
  if (ctx.from.username === ownerName) {
    try {
      const users = await User.find();

      const userList = users.map((user) => `ID: \`${user.id}\`, Username: ${user.username}, Status: ${user.status}\n`).join('\n');

      ctx.reply(`List of Users:\n\n${userList}`);
    } catch (error) {
      console.error('Error fetching users:', error);
      ctx.reply('Failed to fetch users.');
    }
  } else {
    ctx.reply(mess.onlyOwner);
  }
});

bot.command('bc', async (ctx) => {
  if (ctx.from.username === ownerName) {
    const commandParts = ctx.message.text.split(' ');
    commandParts.shift();
    const message = commandParts.join(' ');

    if (message || ctx.message.caption || ctx.message.photo || ctx.message.document || ctx.message.video || ctx.message.animation || ctx.message.audio || ctx.message.sticker) {
      const users = await User.find();

      for (const user of users) {
        try {
          if (ctx.message.photo) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            await bot.telegram.sendPhoto(user.id, photo.file_id, { caption: message || ctx.message.caption });
          } else if (ctx.message.document) {
            const document = ctx.message.document;
            const fileSizeMB = document.file_size / (1024 * 1024);

            if (fileSizeMB <= fileLimit) {
              await bot.telegram.sendDocument(user.id, document.file_id, { caption: message || ctx.message.caption });
            } else {
              console.error(`File size exceeds the limit for user ${user.username} (ID: ${user.id})`);
            }
          } else if (ctx.message.video) {
            const video = ctx.message.video;
            await bot.telegram.sendVideo(user.id, video.file_id, { caption: message || ctx.message.caption });
          } else if (ctx.message.animation) {
            const animation = ctx.message.animation;
            await bot.telegram.sendAnimation(user.id, animation.file_id, { caption: message || ctx.message.caption });
          } else if (ctx.message.audio) {
            const audio = ctx.message.audio;
            await bot.telegram.sendAudio(user.id, audio.file_id, { caption: message || ctx.message.caption });
          } else if (ctx.message.sticker) {
            const sticker = ctx.message.sticker;
            await bot.telegram.sendSticker(user.id, sticker.file_id);
          } else {
            await bot.telegram.sendMessage(user.id, message || ctx.message.caption);
          }

          console.log(`Broadcast message sent to user ${user.username} (ID: ${user.id})`);
        } catch (error) {
          console.error(`Failed to send broadcast message to user ${user.username} (ID: ${user.id}): ${error.message}`);
        }
      }

      ctx.reply('Broadcast completed. Check the console for details.');
    } else {
      ctx.reply('Invalid command. Please use: /bc <message>');
    }
} else {
      ctx.reply(mess.onlyOwner)
  }
});

bot.command('addprem', async (ctx) => {
  if (ctx.from.username === ownerName) {
    const args = ctx.message.text.split(' ').slice(1);
    const userName = args[0];
    const duration = args[1];

    if (userName && duration) {
      const user = await User.findOne({ username: userName });

      if (user) {
        const durationRegex = /^(\d+)([mhd])$/;

        const match = duration.match(durationRegex);

        if (match) {
          const numericValue = parseInt(match[1]);
          const unit = match[2];

          let durationInMilliseconds;

          switch (unit) {
            case 'm':
              durationInMilliseconds = numericValue * 60 * 1000;
              break;
            case 'h':
              durationInMilliseconds = numericValue * 60 * 60 * 1000;
              break;
            case 'd':
              durationInMilliseconds = numericValue * 24 * 60 * 60 * 1000;
              break;
          }

          user.isPremium = true;
          user.status = 'Premium';
          user.premiumExpireDate = new Date(new Date().getTime() + durationInMilliseconds);
          user.balance = Infinity;
          user.limit = Infinity;

          await user.save();
          ctx.telegram.sendMessage(user.id, `Premium added to your account for ${numericValue} ${unit}. Enjoy the benefits!`);
          ctx.reply(`Premium added to user ${user.username} for ${numericValue} ${unit}.`);
        } else {
          ctx.reply('Invalid duration format. Please use: /addprem <username> <duration>');
        }
      } else {
        ctx.reply(`User with Username ${user.username} not found.`);
      }
    } else {
      ctx.reply('Invalid command. Please use: /addprem <username> <duration>');
    }
  } else {
    ctx.reply(mess.onlyOwner);
  }
});

bot.command('delprem', async (ctx) => {
  if (ctx.from.username === ownerName) {
    const args = ctx.message.text.split(' ').slice(1);
    const userName = args[0];

    if (userName) {
      const user = await User.findOne({ username: userName });
      const userToDelete = await User.findOne({ username: userName, isPremium: true });

      if (userToDelete) {

        userToDelete.isPremium = false;
        userToDelete.status = 'free';
        userToDelete.limit = user.Limit; 
        userToDelete.balance = user.Balance; 
        userToDelete.premiumExpireDate = undefined;

        await userToDelete.save();
        ctx.telegram.sendMessage(user.id, `Premium removed from your account. You are now a free user.`);
        ctx.reply(`Premium removed from user ${user.username}.`);
      } else {
        ctx.reply(`User with Username ${user.username} is not a premium user.`);
      }
    } else {
      ctx.reply('Invalid command. Please use: /delprem <username>');
    }
  } else {
    ctx.reply(mess.onlyOwner);
  }
});

bot.command('resetlimit', async (ctx) => {
  if (ctx.from.username === ownerName) {
    const newLimit = parseInt(ctx.message.text.split(' ')[1]);

    if (isNaN(newLimit) || newLimit < 0) {
      return ctx.reply('Invalid limit value.');
    }

    try {
      await User.updateMany({ isPremium: false }, { $set: { limit: newLimit } });
      ctx.reply(`All non-premium users have been reset to ${newLimit} limit.`);
    } catch (error) {
      console.error('Error resetting limits:', error);
      ctx.reply('Failed to reset limits.');
    }
  } else {
    ctx.reply(mess.onlyOwner);
  }
});

bot.command('resetbalance', async (ctx) => {
  if (ctx.from.username === ownerName) {

  const newBalance = parseInt(ctx.message.text.split(' ')[1]);

  if (isNaN(newBalance)) {
    return ctx.reply('Invalid balance value.');
  }

  try {
    await User.updateMany({}, { $set: { balance: newBalance } });
    ctx.reply(`All users have been reset to ${newBalance} balance.`);
  } catch (error) {
    console.error('Error resetting balances:', error);
    ctx.reply('Failed to reset balances.');
  }
} else {
  ctx.reply(mess.onlyOwner);
 }
});

bot.command('addbalance', async (ctx) => {
  if (ctx.from.username !== ownerName) {
    return ctx.reply(mess.onlyOwner);
  }

  const args = ctx.message.text.split(' ').slice(1);
  const userName = args[0];
  const amount = parseInt(args[1]);

  if (!userName || isNaN(amount) || amount <= 0) {
    return ctx.reply('Invalid usage. Please use: /addbalance username amount');
  }

  try {
    const receiver = await User.findOne({ username: userName });

    if (!receiver) {
      return ctx.reply('Receiver user not found. Please check the username.');
    }

    receiver.balance += amount;
    await receiver.save();

    await ctx.telegram.sendMessage(receiver.id, `Balance added to your account. Your new balance: ${receiver.balance}`);
    ctx.reply(`Balance added to user ${receiver.username}.`);
  } catch (error) {
    console.error('Error adding balance:', error);
    ctx.reply('An error occurred while adding balance.');
  }
});

bot.command('addlimit', async (ctx) => {
  if (ctx.from.username !== ownerName) {
    return ctx.reply(mess.onlyOwner);
  }

  const args = ctx.message.text.split(' ').slice(1);
  const userName = args[0];
  const amount = parseInt(args[1]);

  if (!userName || isNaN(amount) || amount <= 0) {
    return ctx.reply('Invalid usage. Please use: /addlimit username amount');
  }

  try {
    const receiver = await User.findOne({ username: userName });

    if (!receiver) {
      return ctx.reply('Receiver user not found. Please check the username.');
    }

    receiver.limit += amount;
    await receiver.save();

    await ctx.telegram.sendMessage(receiver.id, `Limit added to your account. Your new limit: ${receiver.limit}`);
    ctx.reply(`Limit added to user ${receiver.username}.`);
  } catch (error) {
    console.error('Error adding limit:', error);
    ctx.reply('An error occurred while adding limit.');
  }
});

bot.on('text', async (ctx, next) => {
    const budy = ctx.message.text
    const userId = ctx.from.id;
    const user = await User.find();
    const isOwner = userId === ownerId;
    
    if (!isOwner) return;
    
    const regex = /^(>|x|\$)/;
    
    if (!regex.test(budy)) return next(); 

    if (budy.startsWith("> ") || budy.startsWith("x ")) {
        const commandType = budy.startsWith("x ") ? 'eval' : 'exec';
        const logPrefix = commandType === 'eval' ? chalk.green('[EVAL]') : chalk.blue('[EXEC]');
        console.log(chalk.whiteBright('├'), `${logPrefix} ${moment(ctx.message.date * 1000).format('DD/MM/YY HH:mm:ss')} From Owner`);

        try {
            let evaled;
            if (commandType === 'eval') {
                evaled = await eval(budy.slice(2));
                if (typeof evaled !== 'string') evaled = util.inspect(evaled);
            } else if (commandType === 'exec') {
                exec(budy.slice(2), (err, stdout) => {
                    if (err) {
                        ctx.reply(`${err}`);
                    } else if (stdout) {
                        ctx.reply(`${stdout}`);
                    }
                });
                return; 
            }
            ctx.reply(evaled);
        } catch (err) {
            ctx.reply(err.message);
        }
    } else if (budy.startsWith("$ ")) {
        console.log(chalk.whiteBright('├'), chalk.yellow('[EXEC]'), moment(ctx.message.date * 1000).format('DD/MM/YY HH:mm:ss'), chalk.yellow('From Owner'));
        exec(budy.slice(2), (err, stdout) => {
            if (err) {
                ctx.reply(`${err}`);
            } else if (stdout) {
                ctx.reply(`${stdout}`);
            }
        });
    }
});

// Not working
/** bot.command('changemode', (ctx) => {
/**  if (ctx.from.username === ownerName) {
/**    return ctx.reply('Silakan pilih mode baru:', {
/**      reply_markup: {
/**        inline_keyboard: [
/**          [{ text: 'Self', callback_data: 'mode_self' }],
          [{ text: 'Public', callback_data: 'mode_public' }]
        ]
      }
    });
  } else {
    return ctx.reply(mess.onlyOwner);
  }
});

bot.action('mode_self', (ctx) => {
  botMode = 'self';
  return ctx.answerCbQuery('Mode telah diubah ke Self');
});

bot.action('mode_public', (ctx) => {
  botMode = 'public';
  return ctx.answerCbQuery('Mode telah diubah ke Public');
}); */

// Game Feature
bot.command('family100', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/family100?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'family100';
    ctx.session.answersGiven = [];

    ctx.reply(`*[ FAMILY 100]*\n\nQuestion: ${quizData.soal}\nTime: ${game_duration}s`, { parse_mode: 'Markdown' });

    setTimeout(() => {
      if (ctx.session.isPlaying === 'family100') {
        const remainingAnswers = ctx.session.quizItem.jawaban.filter(answer => !ctx.session.answersGiven.includes(answer.toLowerCase()));
        if (remainingAnswers.length > 0) {
          ctx.reply(`Waktu habis! Jawaban yang benar yang belum terjawab adalah:\n${remainingAnswers.join('\n')}`);
        } else {
          ctx.reply('Time has run out! You have answered all the answers correctly!');
        }
        ctx.session.isPlaying = false; 
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('asahotak', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/asahotak?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'asahotak';

    ctx.reply(`*[ ASAH OTAK ]*\n\nQuestion: ${quizData.soal}\nTime: ${game_duration}s`, { parse_mode: 'Markdown' });

    setTimeout(() => {
      if (ctx.session.isPlaying === 'asahotak') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebakkata', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebakkata?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebakkata';

    ctx.reply(`[ TEBAK KATA ]\n\nQuestion: ${quizData.soal}\nTime: ${game_duration}s`, { reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebakkata') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebakkalimat', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebakkalimat?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebakkalimat';

    ctx.reply(`[ TEBAK KALIMAT ]\n\nQuestion: ${quizData.soal}\nTime: ${game_duration}s`, { reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebakkalimat') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('siapakahaku', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/siapakahaku?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'siapakahaku';

    ctx.reply(`[ SIAPAKAH AKU ]\n\nQuestion: ${quizData.soal}\nTime: ${game_duration}s`, { reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'siapakahaku') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebaklirik', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebaklirik?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebaklirik';

    ctx.reply(`[ TEBAK LIRIK ]\n\nQuestion: ${quizData.soal}\nTime: ${game_duration}s`, { reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebaklirik') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tekateki', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tekateki?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tekateki';

    ctx.reply(`[ TEKA TEKI ]\n\nQuestion: ${quizData.soal}\nTime: ${game_duration}s`, { reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tekateki') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('susunkata', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/siapakahaku?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'susunkata';

    ctx.reply(`[ SUSUN KATA ]\n\nType: ${quizData.tipe}\nQuestion: ${quizData.soal}\nClue: ${quizData.bantuan}\nTime: ${game_duration}s`);

    setTimeout(() => {
      if (ctx.session.isPlaying === 'susunkata') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebakkimia', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebakkimia?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebakkimia';

    ctx.reply(`[ TEBAK KALIMAT ]\n\nQuestion: ${quizData.lambang}\nTime: ${game_duration}s`, { reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebakkimia') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.unsur}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebakbendera', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebakbendera?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebakbendera';

    ctx.replyWithPhoto(quizData.gambar, { caption: `[ TEBAK BENDERA ]\nWhat country's flag is this?`, reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebakbendera') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.nama}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebakanime', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebakanime?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebakanime';

    ctx.replyWithPhoto(quizData.img, { caption: `[ TEBAK ANIME ]\nWhat anime character is this??\n\nAnime: ${quizData.anime}`, reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebakanime') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.nama}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebaklagu', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebaklagu?id=37i9dQZEVXbObFQZ3JLcXt&apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebaklagu';

    ctx.replyWithAudio(quizData.preview, { caption: `[ TEBAK LAGU ]\nWhat's the title of this song???\n\nArtist: ${quizData.artis}`, reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebaklagu') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.judul}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.command('tebakgambar', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    return ctx.reply('Anda sudah sedang bermain. Tunggu permainan selesai atau ketik /nyerah untuk menyerah.');
  }

  try {
    const response = await fetch(api.caliph + '/api/tebakgambar?apikey=' + apikey.caliph);
    const quizData = await response.json();

    ctx.session.quizItem = quizData;
    ctx.session.startTime = Date.now();
    ctx.session.isPlaying = 'tebakgambar';

    ctx.replyWithPhoto(quizData.img, { caption: `[ TEBAK GAMBAR ]\n Guess this picture!\nDescription: ${quizData.deskripsi}\nClue: ${quizData.bantuan}`, reply_markup: {
        inline_keyboard: [
          [{ text: 'Help', callback_data: 'clue' }]
        ]
      }});

    setTimeout(() => {
      if (ctx.session.isPlaying === 'tebakgambar') {
        ctx.reply(`Time has run out! The correct answer is:\n${ctx.session.quizItem.jawaban}`);
        ctx.session.isPlaying = false;
      }
    }, game_duration * 1000);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    ctx.reply(mess.error);
  }
});

bot.action('clue', async (ctx) => {
  const userId = ctx.from.id;
    if (!ctx.session) ctx.session = {};

  if (ctx.session.clueUsed) {
    return ctx.answerCbQuery(`You've already used help.`);
  }

  try {
    const user = await User.findOne({ id: userId });
    if (user) {
      if (user.limit >= 3) {
        user.limit -= 3;
        await user.save();
        ctx.session.clueUsed = true;
        ctx.editMessageReplyMarkup({
          inline_keyboard: [] 
        });
        ctx.replyWithHTML(`<b>You use help/clue, -3 limit</b>\n\nClue: ${ctx.session.quizItem.bantuan}\nYour limits are now: ${user.limit}`);
      } else {
        ctx.answerCbQuery('Your limit is not enough to get help/clue.');
      }
    } else {
      ctx.reply('Sorry, an error occurred in retrieving user data.');
    }
  } catch (error) {
    console.error('Error updating user limit:', error);
    ctx.reply('An error occurred in updating user limits.');
  }
});

bot.command('nyerah', (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    if (ctx.session.isPlaying === 'family100') {
      const remainingAnswers = ctx.session.quizItem.jawaban.filter(answer => !ctx.session.answersGiven.includes(answer.toLowerCase()));
      if (remainingAnswers.length > 0) {
        ctx.reply(`You give up! The unanswered correct answer is:\n${remainingAnswers.join('\n')}`);
      } else {
        ctx.reply('You give up! You have answered all the answers correctly!');
      }
    } else {
      ctx.reply(`You give up! The correct answer is:\n${ctx.session.quizItem.jawaban || ctx.session.quizItem.nama || ctx.session.quizItem.unsur || ctx.session.quizItem.judul}`);
    }
    ctx.session.isPlaying = false;
  } else {
    ctx.reply("Youre not playing.");
  }
});

bot.on('message', async (ctx) => {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.isPlaying) {
    const userAnswer = ctx.message.text.trim().toLowerCase();

    if (ctx.session.isPlaying === 'family100') {
      const correctAnswers = ctx.session.quizItem.jawaban.map(answer => answer.toLowerCase());

      if (correctAnswers.includes(userAnswer)) {
        if (!ctx.session.answersGiven.includes(userAnswer)) {
          ctx.session.answersGiven.push(userAnswer);

          const userId = ctx.from.id;
          try {
            const user = await User.findOne({ id: userId });
            if (user) {
              user.balance += 10;
              await user.save();
              ctx.reply(`*Your answer is correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
            } else {
              ctx.reply('Sorry, an error occurred in retrieving user data.');
            }
          } catch (error) {
            console.error('Error updating user balance:', error);
            ctx.reply('An error occurred in updating the users balance.');
          }
        } else {
          ctx.reply('Youve answered this answer before.');
        }
      }
    } else if (ctx.session.isPlaying === 'asahotak') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tekateki') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebakkimia') {
      const correctAnswer = ctx.session.quizItem.unsur.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'siapakahaku') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'susunkata') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebaklirik') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebakkata') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebakkalimat') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebakbendera') {
      const correctAnswer = ctx.session.quizItem.nama.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebakgambar') {
      const correctAnswer = ctx.session.quizItem.jawaban.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebaklagu') {
      const correctAnswer = ctx.session.quizItem.judul.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    } else if (ctx.session.isPlaying === 'tebakanime') {
      const correctAnswer = ctx.session.quizItem.nama.toLowerCase();
      if (userAnswer === correctAnswer) {
        const userId = ctx.from.id;
        try {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.balance += 10;
            await user.save();
            ctx.reply(`*Your Answer is Correct!*\n\nYou get +10 balance.\nCurrent balance: ${user.balance}`, { parse_mode: 'Markdown' });
          } else {
            ctx.reply('Sorry, an error occurred in retrieving user data.');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          ctx.reply('An error occurred in updating the users balance.');
        }
        ctx.session.isPlaying = false;
      }
    }
  }
});

// End
setInterval(async () => {
  const currentDate = new Date();

  const expiredUsers = await User.find({ isPremium: true, premiumExpireDate: { $lt: currentDate } });

  expiredUsers.forEach(async (user) => {
    user.isPremium = false;
    user.status = 'free';
    user.limit = 25; 
    user.balance = 50; 
    await user.save();
  });
}, time_interval); 

module.exports = { bot, User };