const Message = require('../models/message');
const User = require('../models/user');
const Stats = require('../models/Stats');

// In-memory user storage
const users = {};

module.exports = (io) => {
    io.on('connection', socket => {
        socket.on('join', async ({ username, password, color }) => {
            users[username] = { password, socketId: socket.id, color };
            socket.username = username;
            await User.findOneAndUpdate(
                { username },
                { username, password, color },
                { upsert: true, new: true }
            );
            await Stats.findOneAndUpdate(
                { username },
                { username },
                { upsert: true, new: true }
            );
            io.emit('userList', users);
            const user = await User.findOne({ username });
            socket.emit('userColor', { color: user.color });
        });

        socket.on('privateMessage', async ({ to, message }) => {
            const recipient = Object.values(users).find(user => user.socketId === users[to].socketId);
            if (recipient) {
                await Message.create({
                    from: socket.username,
                    to,
                    message,
                    timestamp: new Date()
                });
                await Stats.findOneAndUpdate(
                    { username: socket.username },
                    { $inc: { messagesSent: 1 } },
                    { upsert: true }
                );
                io.to(recipient.socketId).emit('privateMessage', { from: socket.username, message });
                socket.emit('privateMessage', { from: socket.username, message });
            };
            Stats.findOneAndUpdate(
                { username: socket.username },
                { $inc: { messagesSent: 1 } },
                { upsert: true }
            );
        });

        socket.on('loadHistory', async ({ withUser }) => {
            const messages = await Message.find({
                $or: [
                    { from: socket.username, to: withUser },
                    { from: withUser, to: socket.username }
                ]
            }).sort({ timestamp: 1 });
            socket.emit('history', messages);
        });

        socket.on('updateProfile', async ({ username, newUsername, newPassword, color }) => {
            if (users[username]) {
                delete users[username];
                users[newUsername] = { password: newPassword, socketId: socket.id, color };
                socket.username = newUsername;
                await User.findOneAndUpdate(
                    { username },
                    { username: newUsername, password: newPassword, color },
                    { upsert: true }
                );
                io.emit('userList', users);
                socket.emit('userColor', { color });
            }
        });

        socket.on('updateTime', async ({ username }) => {
            await Stats.findOneAndUpdate(
                { username },
                { $inc: { timeSpent: 10 } },
                { upsert: true }
            );
        });

        socket.on('getStats', async ({ username }) => {
            const stats = await Stats.findOne({ username });
            socket.emit('stats', stats || { username, messagesSent: 0, timeSpent: 0 });
        });

        socket.on('logout', ({ username }) => {
            delete users[username];
            io.emit('userList', users);
        });

        socket.on('disconnect', () => {
            delete users[socket.username];
            io.emit('userList', users);
        });
    });
};