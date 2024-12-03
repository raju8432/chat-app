let userAvatar = localStorage.getItem('userAvatar') || 'avatar1.png';
let username = localStorage.getItem('username') || '';
let lastMessageDate = null;

// Function to set avatar images
function setAvatar() {
    document.querySelectorAll('.avatar').forEach(img => img.src = userAvatar);
}

// Function to set username
function setUsername() {
    const usernameInput = document.getElementById('username-input');
    username = usernameInput.value.trim();
    if (username) {
        localStorage.setItem('username', username);
        usernameInput.style.display = 'none';
        document.querySelector('button[onclick="setUsername()"]').style.display = 'none';
        document.getElementById('status').innerText = `Online as ${username}`;
        setAvatar();
        joinRoom();
    }
}

// Function to join room
function joinRoom() {
    const room = 'default'; // or any room logic you have
    socket.emit('join', { username, room, avatar: userAvatar });
}

// Function to open avatar selection popup
function openAvatarPopup() {
    document.getElementById('avatar-popup').style.display = 'flex';
}

// Function to close avatar selection popup
function closeAvatarPopup() {
    document.getElementById('avatar-popup').style.display = 'none';
}

// Function to select an avatar
function selectAvatar(avatar) {
    userAvatar = avatar;
    localStorage.setItem('userAvatar', userAvatar);
    setAvatar();
    closeAvatarPopup();
}

// Initialize Socket.io connection
const socket = io();

socket.on('connect', () => {
    console.log('Connected to Socket.io server.');
});

socket.on('chat message', (messageData) => {
    addMessage(messageData.username, messageData.message, 'received', messageData.avatar, messageData.timestamp);
});

socket.on('user joined', (data) => {
    displayNotification(`${data.username} has joined the room.`);
});

socket.on('user disconnected', (data) => {
    displayNotification(`${data.username} has left the room.`);
});

socket.on('typing', (data) => {
    updateTypingStatus(data);
});

socket.on('chat history', (data) => {
    loadChatHistory(data.messages);
});

socket.on('user list', (data) => {
    updateUserList(data.users);
});

socket.on('file', (messageData) => {
    addFile(messageData.username, messageData.file, 'received', messageData.avatar, messageData.timestamp);
});

// Load chat history
function loadChatHistory(messages) {
    messages.forEach(msg => {
        if (msg.type === 'chat message') {
            addMessage(msg.username, msg.message, 'received', msg.avatar, msg.timestamp);
        } else if (msg.type === 'file') {
            addFile(msg.username, msg.file, 'received', msg.avatar, msg.timestamp);
        }
    });
}

// Add event listener to send button
document.getElementById('send-button').addEventListener('click', sendMessage);

// Function to send a message
function sendMessage() {
    if (!username) {
        alert('Please set your username first.');
        return;
    }

    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    if (message) {
        const timestamp = new Date().toLocaleTimeString();
        const messageData = { type: 'chat message', username, message, avatar: userAvatar, timestamp, room: 'default' };
        addMessage(username, message, 'sent', userAvatar, timestamp);
        socket.emit('chat message', messageData);
        messageInput.value = '';
    }
}

// Function to add a message to the chat
function addMessage(username, message, type, avatar, timestamp) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);

    const avatarElement = document.createElement('img');
    avatarElement.classList.add('avatar');
    avatarElement.src = avatar || 'default-avatar.png';

    const content = document.createElement('div');
    content.classList.add('content');
    content.textContent = type === 'received' ? `${username}: ${message}` : message;

    const timestampElement = document.createElement('div');
    timestampElement.classList.add('timestamp');
    timestampElement.textContent = timestamp;

    messageElement.appendChild(avatarElement);
    messageElement.appendChild(content);
    messageElement.appendChild(timestampElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to display typing indicator
function updateTypingStatus(data) {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.textContent = `${data.username} is typing...`;
    typingIndicator.style.display = data.isTyping ? 'block' : 'none';
}

// Function to display notifications
function displayNotification(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('notification');
    notificationElement.innerHTML = `<em>${notification}</em>`;
    document.getElementById('chat-messages').appendChild(notificationElement);
}

// Function to update the user list
function updateUserList(users) {
    const userListContainer = document.getElementById('user-list');
    userListContainer.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('user');
        userElement.textContent = user.username;
        const avatarElement = document.createElement('img');
        avatarElement.src = user.avatar;
        avatarElement.classList.add('avatar');
        userElement.appendChild(avatarElement);
        userListContainer.appendChild(userElement);
    });
}

// Show typing indicator
function showTyping() {
    if (!username) return;
    const messageData = { type: 'typing', username, room: 'default', isTyping: true };
    socket.emit('typing', messageData);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        const messageData = { type: 'typing', username, room: 'default', isTyping: false };
        socket.emit('typing', messageData);
    }, typingTimeoutDuration);
}

// Add a file to the chat
function addFile(username, file, type, avatar, timestamp) {
    const chatMessages = document.getElementById('chat-messages');
    const fileElement = document.createElement('div');
    fileElement.classList.add('message', type);

    const avatarElement = document.createElement('img');
    avatarElement.classList.add('avatar');
    avatarElement.src = avatar || 'default-avatar.png';

    const content = document.createElement('div');
    content.classList.add('content');

    const fileLink = document.createElement('a');
    fileLink.href = file.url;
    fileLink.textContent = file.name;
    fileLink.setAttribute('download', file.name);
    content.appendChild(fileLink);

    const timestampElement = document.createElement('div');
    timestampElement.classList.add('timestamp');
    timestampElement.textContent = timestamp;

    fileElement.appendChild(avatarElement);
    fileElement.appendChild(content);
    fileElement.appendChild(timestampElement);
    chatMessages.appendChild(fileElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send file
document.getElementById('file-input').addEventListener('change', function(event) {
    if (!username) {
        alert('Please set your username first.');
        return;
    }
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const timestamp = new Date().toLocaleTimeString();
            const fileData = { type: 'file', username, room: 'default', file: { name: file.name, url: e.target.result }, avatar: userAvatar, timestamp };
            socket.emit('file', fileData);
            addFile(username, { name: file.name, url: e.target.result }, 'sent', userAvatar, timestamp);
        };
        reader.readAsDataURL(file);
    }
});

// Add input event listener to message input
document.getElementById('message-input').addEventListener('input', showTyping);

// Add keypress event listener to message input to send message on Enter key press
document.getElementById('message-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Update status text and initialize username input on page load
document.getElementById('status').innerText = username ? `Online as ${username}` : 'Online';
if (username) {
    document.getElementById('username-input').style.display = 'none';
    document.querySelector('button[onclick="setUsername()"]').style.display = 'none';
}

// Initialize avatar on page load
setAvatar();
