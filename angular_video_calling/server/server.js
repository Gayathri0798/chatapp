// import http from 'http';
// import { Server } from 'socket.io';
 
// // Create an HTTP server
// const server = http.createServer();
// const io = new Server(server);
 
// // Store connected users and their socket IDs
// let users = {};
 
// // When a client connects
// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);
 
//   // Register the user by storing their socket ID
//   socket.on('register', (userId) => {
//    users[userId] = socket.id;
//     socket.userId = userId;
//     console.log(`${userId} registered with socket ID: ${socket.id}`);
//   });
 
//   socket.on('offer', (data) => {
//     const { sdp, type, targetId } = data;  // Destructure 'sdp', 'type' and 'targetId'
//     const targetSocketId = users[targetId];
//     if (targetSocketId) {
//       io.to(targetSocketId).emit('offer', { sdp, type, senderId: socket.id });  // Emit sdp, type, and senderId
//     } else {
//       console.log('User not found:', targetId);
//     }
//   });
 
//   // Handle receiving an answer (from User B)
//   socket.on('answer', (data) => {
//     const { answer, targetId } = data;
//     const targetSocketId = users[targetId];
//     if (targetSocketId) {
//       io.to(targetSocketId).emit('answer', { answer, senderId: socket.id });
//     } else {
//       console.log('User not found:', targetId);
//     }
//   });
 
//   // Handle ICE candidates
//   socket.on('ice-candidate', (data) => {
//     const { candidate, targetId } = data;
//     const targetSocketId = users[targetId];
//     if (targetSocketId) {
//       io.to(targetSocketId).emit('ice-candidate', candidate);
//     } else {
//       console.log('User not found:', targetId);
//     }
//   });
 
//   // Handle user disconnection
//   socket.on('disconnect', () => {
//     for (const [userId, socketId] of Object.entries(users)) {
//       if (socketId === socket.id) {
//         delete users[userId];
//         console.log(`${userId} disconnected`);
//         break;
//       }
//     }
//   });
// });
 
// // Start server on port 3000
// server.listen(3000, () => {
//   console.log('Signaling server is running on http://localhost:3000');
// });
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

let users = {};
 
// When a client connects
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
 
  // Register the user by storing their socket ID
  socket.on('register', (userId) => {
    users[userId] = socket.id;
    socket.userId = userId;
    console.log(`${userId} registered with socket ID: ${socket.id}`);
  });
 
  socket.on('offer', (data) => {
    const { sdp, type, targetId } = data;  // Destructure 'sdp', 'type' and 'targetId'
    const targetSocketId = users[targetId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('offer', { sdp, type, senderId: socket.id });  // Emit sdp, type, and senderId
    } else {
      console.log('User not found:', targetId);
    }
  });
 
  // Handle receiving an answer (from User B)
  socket.on('answer', (data) => {
    const { answer, targetId } = data;
    const targetSocketId = users[targetId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('answer', { answer, senderId: socket.id });
    } else {
      console.log('User not found:', targetId);
    }
  });
 
  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    const { candidate, targetId } = data;
    const targetSocketId = users[targetId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', candidate);
    } else {
      console.log('User not found:', targetId);
    }
  });
 
  // Handle user disconnection
  socket.on('disconnect', () => {
    for (const [userId, socketId] of Object.entries(users)) {
      if (socketId === socket.id) {
        delete users[userId];
        console.log(`${userId} disconnected`);
        break;
      }
    }
  });
});
 
// Start server on port 3000
server.listen(3000, () => {
  console.log('Signaling server is running on http://localhost:3000');
});