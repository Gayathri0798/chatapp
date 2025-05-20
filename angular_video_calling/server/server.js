import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import { createServer } from 'https';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import fs from 'fs';

const app = express();

const options = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
}; 

const server = createServer(options, app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Optional: serve static frontend

// ==========================
// MySQL connection
// ==========================
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Rithanya@14',
  database: 'video_call_app'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL connected!');
});

// ==========================
// REST APIs
// ==========================

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(sql, [username, password], (err) => {
    if (err) return res.status(500).json({ error: 'Registration failed' });
    res.status(200).json({ message: 'User registered successfully' });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT id, username FROM users WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length > 0) {
      res.status(200).json(results[0]);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});

app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const sql = 'SELECT id, username FROM users WHERE id != ?';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json(results);
  });
});

// ==========================
// Socket.IO - WebRTC Signaling + Call Logic
// ==========================

const connectedUsers = {}; // Map: userId => socket.id

io.on('connection', socket => {
  console.log(`🔌 New socket connected: ${socket.id}`);

  socket.on('register-user', userId => {
    connectedUsers[userId] = socket.id;
    console.log(`✅ Registered user ${userId} with socket ${socket.id}`);
  });

  socket.on('call-user', ({ fromUserId, toUserId, type }) => {
    const toSocketId = connectedUsers[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit('call-notification', { fromUserId, type });
    }
  });

  socket.on('start-video-call', ({ fromUserId, toUserId }) => {
    const toSocketId = connectedUsers[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit('incoming-video-call', { fromUserId });
    }
  });

  // WebRTC signaling
  socket.on('offer', ({ toUserId, offer }) => {
    const toSocketId = connectedUsers[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit('offer', { fromUserId: socket.id, offer });
    }
  });

  socket.on('answer', ({ toUserId, answer }) => {
    const toSocketId = connectedUsers[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit('answer', { fromUserId: socket.id, answer });
    }
  });

  socket.on('candidate', ({ toUserId, candidate }) => {
    const toSocketId = connectedUsers[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit('candidate', { fromUserId: socket.id, candidate });
    }
  });

  socket.on('end-call', toUserId => {
    const toSocketId = connectedUsers[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit('call-ended');
    }
  });

  socket.on('disconnect', () => {
    const userId = Object.keys(connectedUsers).find(id => connectedUsers[id] === socket.id);
    if (userId) {
      delete connectedUsers[userId];
      console.log(`❌ User ${userId} disconnected`);
    } else {
      console.log(`❌ Unknown socket disconnected: ${socket.id}`);
    }
  });
});

// ==========================
// Start Server
// ==========================

server.listen(443, () => {
  console.log('🚀 HTTPS server running at https://localhost:443');
});
