require('dotenv').config();
const { Bot } = require('./src');

const token = process.env.QUERY_ID;
const blumBot = new Bot('blum', token, 'wKl9ShrBkV');

const express = require('express');
const app = express();

// Твой код для работы бота

// Это часть для прослушивания порта, чтобы Render был доволен
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('Bot is running');
});
app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});

blumBot.start().then(r => {});
