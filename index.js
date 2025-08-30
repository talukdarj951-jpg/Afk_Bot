const mineflayer = require('mineflayer');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send("Bot is running!"));
app.listen(3000, () => console.log("Web server running"));

function createBot() {
  const bot = mineflayer.createBot({
    host: "OnlitesSMP_S2.aternos.me", // your server IP
    port: 57535,                     // your server port
    username: "Afk_Bot",             // bot username
    // password: "bot123",           // uncomment if server uses AuthMe
    version: false
  });

  bot.on('login', () => {
    console.log("Bot joined the server!");
  });

  bot.on('end', () => {
    console.log("Bot disconnected. Reconnecting...");
    setTimeout(createBot, 10000); // reconnect after 10s
  });
}

createBot();
