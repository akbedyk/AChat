const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB } = require('./server/config/db');
const chatSocket = require('./server/socket/chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Подключение к MongoDB
connectDB();

// Настройка статических файлов
app.use(express.static('public'));

// Маршруты
app.use('/', require('./server/routes/index'));

// Socket.io
chatSocket(io);

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});