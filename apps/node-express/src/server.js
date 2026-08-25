require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const profileRoutes = require('./routes/profile');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const faqRoutes = require('./routes/faqs');
const noticeRoutes = require('./routes/notices');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
  })
);

app.use('/uploads', express.static(uploadDir));

app.get('/api/session', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/notices', noticeRoutes);

app.listen(PORT, () => {
  console.log(`node-express vulnerable shop API running on http://localhost:${PORT}`);
});
