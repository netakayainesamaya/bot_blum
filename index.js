require('dotenv').config();
const { Bot } = require('./src');

const token = process.env.QUERY_ID;
const blumBot = new Bot('blum', token, 'wKl9ShrBkV');
blumBot.start().then(r => {});
