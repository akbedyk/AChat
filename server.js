const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const socketIo = require('socket.io');
const io = socketIo(server);

const { connectDB } = require('./server/config/db');
const chatSocket = require('./server/socket/chat');

connectDB(); // Подключение к MongoDB

app.use(express.static('public')); // Настройка статических файлов
app.use('/', require('./server/routes/index')); // Маршруты

chatSocket(io); // Socket.io

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});