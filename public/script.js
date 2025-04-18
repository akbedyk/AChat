const socket = io();
let currentUser = null;
let selectedUser = null;
let userNumber = Math.floor(Math.random() * 1000);

// Цветовая палитра (светлые и темные мягкие тона)
const colorPalette = [
    '#f0f0f0', // Светло-серый
    '#e6e6fa', // Лавандовый
    '#f5f5dc', // Бежевый
    '#d3d3d3', // Серый
    '#2f4f4f', // Темно-сланцевый
    '#4682b4', // Стальной синий
    '#556b2f', // Темно-оливковый
    '#708090'  // Сланцево-серый
];
let selectedColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

// Установка случайного цвета фона для начального меню
document.getElementById('auth').style.background = selectedColor;
document.getElementById('chat-area').style.background = selectedColor;

const PASSWORD_LENGTH = 8

// Generate random password
function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < PASSWORD_LENGTH; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Set default username and password
document.getElementById('username').value = `User${userNumber}`;
document.getElementById('password').value = generatePassword();

function joinChat() {
    const username = document.getElementById('username').value || `User${userNumber}`;
    const password = document.getElementById('password').value;
    socket.emit('join', { username, password, color: selectedColor });
    document.getElementById('auth').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
    currentUser = username;
    startTimeTracking();
}

function startTimeTracking() {
    setInterval(() => {
        if (currentUser) {
            socket.emit('updateTime', { username: currentUser });
        }
    }, 10000); // Каждые 10 секунд
}

// "typing..." indicator
let typingTimer;
let isTyping = false;

document.getElementById('message-input').oninput = () => {
    if (isTyping) return;
    if (selectedUser) {
        socket.emit('typing', { to: selectedUser });
        isTyping = true;
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit('stopTyping', { to: selectedUser });
        isTyping = false;
    }, 1000);
};

function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    if (message && selectedUser) {
        socket.emit('privateMessage', { to: selectedUser, message });
        appendMessage(`You to ${selectedUser}: ${message}`, 'sent');
        input.value = '';
    }
}

// Append message to chat
function appendMessage(text, type) {
    const messages = document.getElementById('messages');
    const child = messages.lastChild

    if (type !== 'info') {
        const lastInfo = Array.from(messages.children).find(el => el.className === 'info');
        if (lastInfo) {
            lastInfo.remove();
            console.log('Remove info msg type:' + lastInfo.textContent)
        }
    }

    const div = document.createElement('div');
    div.textContent = text;
    div.style.color = type === 'sent' ? 'blue' : 'black';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function updateColorPicker() {
    const colorOptions = document.getElementById('color-options');
    colorOptions.innerHTML = '';
    colorPalette.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-option';
        div.style.background = color;
        if (color === selectedColor) div.classList.add('selected');
        div.onclick = () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            div.classList.add('selected');
            selectedColor = color;
            document.getElementById('chat-area').style.background = color;
        };
        colorOptions.appendChild(div);
    });
}

// Show profile
document.getElementById('profile-btn').onclick = () => {
    document.getElementById('profile').style.display = 'block';
    document.getElementById('profile-username').value = currentUser;
    document.getElementById('profile-password').value = generatePassword();
    updateColorPicker();
    socket.emit('getStats', { username: currentUser });
};

function updateProfile() {
    const newUsername = document.getElementById('profile-username').value;
    const newPassword = document.getElementById('profile-password').value;
    socket.emit('updateProfile', { username: currentUser, newUsername, newPassword, color: selectedColor });
    currentUser = newUsername;
    closeProfile();
}

function closeProfile() {
    document.getElementById('profile').style.display = 'none';
}

function logout() {
    socket.emit('logout', { username: currentUser });
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('auth').style.display = 'block';
    document.getElementById('username').value = `User${userNumber}`;
    document.getElementById('password').value = generatePassword();
    selectedColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    document.getElementById('auth').style.background = selectedColor;
    document.getElementById('chat-area').style.background = selectedColor;
    currentUser = null;
    selectedUser = null;
    closeProfile()
}

// ************************ Soket.io Events ************************

socket.on('error', ({ message }) => {
    console.error(`${message}`);
});

// Receive user color
socket.on('userColor', ({ color }) => {
    selectedColor = color;
    document.getElementById('chat-area').style.background = color;
    updateColorPicker();
});

// Update user list
socket.on('userList', users => {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '<h3>Users</h3>';
    Object.keys(users).forEach(username => {
        if (username !== currentUser) {
            const userDiv = document.createElement('div');
            userDiv.className = 'user';
            userDiv.textContent = username;
            userDiv.onclick = () => {
                selectedUser = username;
                document.getElementById('messages').innerHTML = '';
                appendMessage(`Chatting with ${username}`, 'info');
                socket.emit('loadHistory', { withUser: username });
            };
            userList.appendChild(userDiv);
        }
    });
});

// add "typing..." indicator
socket.on('typing', ({ from }) => {
    if (from === selectedUser) {
        appendMessage(`${from} is typing...`, 'info');
    }
});

// clear "typing..." indicator
socket.on('stopTyping', ({ from }) => {
    if (from === selectedUser) {
        const lastInfo = Array.from(document.getElementById('messages').children)
            .find(el => el.className === 'info');
        if (lastInfo) lastInfo.remove();
    }
});

// Receive private message
socket.on('privateMessage', ({ from, message }) => {
    if (from === selectedUser || from === currentUser) {
        appendMessage(`${from}: ${message}`, 'received');
    } else {
        new Notification(`New message from ${from}`, { body: message });
        const audio = new Audio('notification.mp3');
        audio.play();
    }
});

// Receive history
socket.on('history', messages => {
    messages.forEach(msg => {
        const type = msg.from === currentUser ? 'sent' : 'received';
        appendMessage(`${msg.from}: ${msg.message}`, type);
    });
});

// Statistic update
socket.on('stats', ({ messagesSent, timeSpent }) => {
    document.getElementById('messages-sent').textContent = messagesSent;
    document.getElementById('time-spent').textContent = timeSpent;
});