import http from 'http';
import { Server } from 'socket.io';
 
// Create an HTTP server
const server = http.createServer();
const io = new Server(server);
 
// Store connected users and their socket IDs
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