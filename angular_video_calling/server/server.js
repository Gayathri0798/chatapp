import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import fs from 'fs';
import https from 'https';

const app = express();
const options = {
  key: fs.readFileSync('cert/server.key'),
  cert: fs.readFileSync('cert/server.cert')
};
const server = createServer(options,app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(bodyParser.json());

// MySQL connection
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

// Register API
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(sql, [username, password], (err) => {
    if (err) return res.status(500).json({ error: 'Registration failed' });
    res.status(200).json({ message: 'User registered successfully' });
  });
});

// Login API
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

// Get all users except current user
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const sql = 'SELECT id, username FROM users WHERE id != ?';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json(results);
  });
});

// ==========================
// Socket.IO handling
// ==========================

const connectedUsers = {}; // Maps userId => socketId

// io.on('connection', (socket) => {
//   console.log(`🔌 Socket connected: ${socket.id}`);

//   // Register user after login
//   socket.on('register-user', (userId) => {
//     connectedUsers[userId] = socket.id;
//     console.log(`✅ User ${userId} registered with socket ${socket.id}`);
//   });

//   // Call request (video/audio)
//   socket.on('call-user', ({ fromUserId, toUserId, type }) => {
//     const toSocketId = connectedUsers[toUserId];
//     if (toSocketId) {
//       io.to(toSocketId).emit('call-notification', { fromUserId, type });
//       console.log(`📞 Call notification sent from ${fromUserId} to ${toUserId}`);
//     } else {
//       console.log(`⚠️ User ${toUserId} not connected`);
//     }
//   });

//   // Start video call
//   socket.on('start-video-call', ({ fromUserId, toUserId }) => {
//     const toSocketId = connectedUsers[toUserId];
//     const fromSocketId = connectedUsers[fromUserId];

//     if (toSocketId) {
//       io.to(toSocketId).emit('incoming-video-call', { fromUserId });
//       console.log(`📹 Incoming call from ${fromUserId} to ${toUserId}`);
//     } else {
//       console.log(`⚠️ Callee ${toUserId} not connected`);
//     }

//     if (fromSocketId) {
//       io.to(fromSocketId).emit('video-call-started', { toUserId });
//     }
//   });

//   // Signaling messages (WebRTC)
//   socket.on('signal', ({ toUserId, data }) => {
//     const toSocketId = connectedUsers[toUserId];
//     if (toSocketId) {
//       io.to(toSocketId).emit('signal', data);
//     }
//   });

//   // End call
//   socket.on('end-call', (toUserId) => {
//     const toSocketId = connectedUsers[toUserId];
//     if (toSocketId) {
//       io.to(toSocketId).emit('call-ended');
//     }
//   });

//   // Handle disconnect
//   socket.on('disconnect', () => {
//     const userId = Object.keys(connectedUsers).find(
//       key => connectedUsers[key] === socket.id
//     );
//     if (userId) {
//       delete connectedUsers[userId];
//       console.log(`❌ User ${userId} disconnected`);
//     } else {
//       console.log(`❌ Unknown socket disconnected: ${socket.id}`);
//     }
//   });
// });
io.on('connection', socket => {
  socket.on('offer', ({ toUserId, offer }) => {
    io.to(toUserId).emit('offer', { fromUserId: socket.id, offer });
  });

  socket.on('answer', ({ toUserId, answer }) => {
    io.to(toUserId).emit('answer', answer);
  });

  socket.on('candidate', ({ toUserId, candidate }) => {
    io.to(toUserId).emit('candidate', candidate);
  });

  socket.on('response', ({ toUserId, response }) => {
    io.to(toUserId).emit('response', { fromUserId: socket.id, response });
  });

  // Store user socket.id mapping logic as needed
});


server.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
