     // routes/auth.js
     const express = require('express');
     const router = express.Router();
     const bcrypt = require('bcryptjs');
     const jwt = require('jsonwebtoken');
     const db = require('../db');
     router.post('/register', async (req, res) => {
         const { username, password } = req.body;
         const hashedPassword = await bcrypt.hash(password, 10);
         const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
         db.query(sql, [username, hashedPassword], (err, result) => {
             if (err) {
                 return res.status(500).json({ message: 'Error registering user' });
             }
             res.status(201).json({ message: 'User registered successfully' });
         });
     });
     router.post('/login', (req, res) => {
        const { username, password } = req.body;
        const sql = 'SELECT * FROM users WHERE username = ?';
        db.query(sql, [username], async (err, result) => {
            if (err || result.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const user = result[0];
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const token = jwt.sign({ userId: user.id }, 'your_secret_key');
            res.json({ token });
        });
    });