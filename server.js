const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8080;
const MESSAGE_HISTORY_FILE = path.join(__dirname, 'message_history.json');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let users = {};
let messageHistory = [];

// Load message history from file
if (fs.existsSync(MESSAGE_HISTORY_FILE)) {
    const data = fs.readFileSync(MESSAGE_HISTORY_FILE);
    messageHistory = JSON.parse(data);
}

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join', (data) => {
        users[socket.id] = { username: data.username, room: data.room, avatar: data.avatar };
        socket.join(data.room);
        sendUserList(data.room);
        sendChatHistory(socket);
        io.to(data.room).emit('user joined', { username: data.username, avatar: data.avatar });
    });

    socket.on('chat message', (msg) => {
        messageHistory.push(msg);
        saveMessageHistory();
        io.to(msg.room).emit('chat message', msg);
    });

    socket.on('typing', (data) => {
        socket.to(data.room).emit('typing', { username: data.username, isTyping: data.isTyping });
    });

    socket.on('file', (msg) => {
        messageHistory.push(msg);
        saveMessageHistory();
        io.to(msg.room).emit('file', msg);
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            io.to(user.room).emit('user disconnected', { username: user.username });
            delete users[socket.id];
        }
    });

    socket.on('error', (error) => {
        console.error('Socket.io error:', error);
    });
});

function sendUserList(room) {
    const userList = Object.values(users)
        .filter(user => user.room === room)
        .map(user => ({ username: user.username, avatar: user.avatar }));
    io.to(room).emit('user list', { users: userList });
}

function sendChatHistory(socket) {
    socket.emit('chat history', { messages: messageHistory });
}

function saveMessageHistory() {
    fs.writeFileSync(MESSAGE_HISTORY_FILE, JSON.stringify(messageHistory, null, 2));
}

server.listen(PORT, () => {
    console.log(`ChatSpot server is listening on port ${PORT}`);
});
