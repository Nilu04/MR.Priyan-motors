// server.js - Backend API server
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-change-this';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
if (!fs.existsSync('./uploads/bikes')) {
    fs.mkdirSync('./uploads/bikes');
}
if (!fs.existsSync('./uploads/logos')) {
    fs.mkdirSync('./uploads/logos');
}
if (!fs.existsSync('./uploads/profiles')) {
    fs.mkdirSync('./uploads/profiles');
}

// Database setup
const db = new sqlite3.Database('./database.db');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        profile_picture TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Bikes table
    db.run(`CREATE TABLE IF NOT EXISTS bikes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        price_num INTEGER NOT NULL,
        year TEXT NOT NULL,
        km TEXT NOT NULL,
        location TEXT NOT NULL,
        brand TEXT NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Sold bikes table
    db.run(`CREATE TABLE IF NOT EXISTS sold (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sold_price TEXT NOT NULL,
        sold_price_num INTEGER NOT NULL,
        month_year TEXT NOT NULL,
        buyer TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Insert default admin if not exists
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', hashedPassword]);
    
    // Insert default logo setting
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, ['website_logo', 'https://placehold.co/400x400/1E3A8A/white?text=PM']);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type || 'bikes';
        if (type === 'logo') cb(null, './uploads/logos');
        else if (type === 'profile') cb(null, './uploads/profiles');
        else cb(null, './uploads/bikes');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============= AUTH MIDDLEWARE =============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// ============= AUTH ROUTES =============
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                profile_picture: user.profile_picture
            }
        });
    });
});

app.post('/api/register', authenticateToken, (req, res) => {
    const { username, password } = req.body;
    
    if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Only admin can create new users' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.json({ message: 'User created successfully', id: this.lastID });
    });
});

app.post('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update password' });
            }
            res.json({ message: 'Password changed successfully' });
        });
    });
});

app.post('/api/change-username', authenticateToken, (req, res) => {
    const { newUsername } = req.body;
    const userId = req.user.id;
    
    db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Username already exists or invalid' });
        }
        const newToken = jwt.sign({ id: userId, username: newUsername }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Username changed successfully', token: newToken, username: newUsername });
    });
});

app.post('/api/upload-profile-picture', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [imageUrl, req.user.id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update profile picture' });
        }
        res.json({ imageUrl });
    });
});

// ============= BIKE ROUTES =============
app.get('/api/bikes', (req, res) => {
    db.all('SELECT * FROM bikes ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/bikes', authenticateToken, upload.single('image'), (req, res) => {
    const { name, price, price_num, year, km, location, brand } = req.body;
    let image = req.body.image || null;
    
    if (req.file) {
        image = `/uploads/bikes/${req.file.filename}`;
    }
    
    db.run(`INSERT INTO bikes (name, price, price_num, year, km, location, brand, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, price, price_num, year, km, location, brand, image],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Bike added successfully' });
        }
    );
});

app.put('/api/bikes/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, price, price_num, year, km, location, brand } = req.body;
    let image = req.body.image;
    
    if (req.file) {
        image = `/uploads/bikes/${req.file.filename}`;
    }
    
    const updateQuery = image ? 
        `UPDATE bikes SET name=?, price=?, price_num=?, year=?, km=?, location=?, brand=?, image=? WHERE id=?` :
        `UPDATE bikes SET name=?, price=?, price_num=?, year=?, km=?, location=?, brand=? WHERE id=?`;
    
    const params = image ? 
        [name, price, price_num, year, km, location, brand, image, id] :
        [name, price, price_num, year, km, location, brand, id];
    
    db.run(updateQuery, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Bike updated successfully' });
    });
});

app.delete('/api/bikes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM bikes WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Bike deleted successfully' });
    });
});

// ============= SOLD BIKES ROUTES =============
app.get('/api/sold', (req, res) => {
    db.all('SELECT * FROM sold ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/sold', authenticateToken, (req, res) => {
    const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
    
    db.run(`INSERT INTO sold (name, sold_price, sold_price_num, month_year, buyer) 
            VALUES (?, ?, ?, ?, ?)`,
        [name, sold_price, sold_price_num, month_year, buyer],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Sold entry added successfully' });
        }
    );
});

app.put('/api/sold/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
    
    db.run(`UPDATE sold SET name=?, sold_price=?, sold_price_num=?, month_year=?, buyer=? WHERE id=?`,
        [name, sold_price, sold_price_num, month_year, buyer, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Sold entry updated successfully' });
        }
    );
});

app.delete('/api/sold/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM sold WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Sold entry deleted successfully' });
    });
});

// ============= SETTINGS ROUTES =============
app.get('/api/settings/:key', (req, res) => {
    const { key } = req.params;
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({ key, value: row.value });
    });
});

app.post('/api/settings/logo', authenticateToken, upload.single('logo'), (req, res) => {
    let logoUrl = req.body.logoUrl;
    
    if (req.file) {
        logoUrl = `/uploads/logos/${req.file.filename}`;
    }
    
    db.run(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        ['website_logo', logoUrl],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ logoUrl });
        }
    );
});

app.get('/api/settings/logo', (req, res) => {
    db.get('SELECT value FROM settings WHERE key = ?', ['website_logo'], (err, row) => {
        if (err || !row) {
            return res.json({ logoUrl: 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
        }
        res.json({ logoUrl: row.value });
    });
});

// Verify token endpoint
app.get('/api/verify-token', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});