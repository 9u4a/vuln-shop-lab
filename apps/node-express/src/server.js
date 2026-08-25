require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const { seedFlagsFromEnv } = require('./flags');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get('/api/session', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

const seededFlagCount = seedFlagsFromEnv();
console.log(`Seeded ${seededFlagCount} flag(s) from environment`);

app.listen(PORT, () => {
  console.log(`node-express vulnerable shop API running on http://localhost:${PORT}`);
});
