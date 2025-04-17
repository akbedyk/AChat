const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    messagesSent: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }     //seconds
});

module.exports = mongoose.model('Stats', statsSchema);