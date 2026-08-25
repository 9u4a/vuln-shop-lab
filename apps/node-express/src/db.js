const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'app.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    bio TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    category TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount REAL NOT NULL,
    webhook_url TEXT,
    toss_order_id TEXT UNIQUE,
    toss_payment_key TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL
  );
`);

for (const stmt of [
  'ALTER TABLE users ADD COLUMN bio TEXT',
  'ALTER TABLE users ADD COLUMN avatar_url TEXT',
  'ALTER TABLE products ADD COLUMN category TEXT',
]) {
  try {
    db.exec(stmt);
  } catch (err) {
    // column already exists on databases created before this migration
  }
}

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (productCount === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)'
  );
  const seed = [
    ['Mechanical Keyboard', 'Hot-swappable mechanical keyboard.', 89.99, '/img/keyboard.png', 'accessories'],
    ['Wireless Mouse', 'Ergonomic wireless mouse.', 29.99, '/img/mouse.png', 'accessories'],
    ['4K Monitor', '27-inch 4K IPS monitor.', 349.99, '/img/monitor.png', 'displays'],
    ['USB-C Hub', '7-in-1 USB-C hub.', 24.99, '/img/hub.png', 'accessories'],
    ['Desk Lamp', 'LED desk lamp with USB charging.', 19.99, '/img/lamp.png', 'office'],
  ];
  for (const row of seed) insert.run(...row);
}

module.exports = db;
