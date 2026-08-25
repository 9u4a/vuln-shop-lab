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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flags (
    vuln_id TEXT PRIMARY KEY,
    flag_value TEXT NOT NULL,
    captured_at TEXT
  );
`);

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (productCount === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)'
  );
  const seed = [
    ['Mechanical Keyboard', 'Hot-swappable mechanical keyboard.', 89.99, '/img/keyboard.png'],
    ['Wireless Mouse', 'Ergonomic wireless mouse.', 29.99, '/img/mouse.png'],
    ['4K Monitor', '27-inch 4K IPS monitor.', 349.99, '/img/monitor.png'],
    ['USB-C Hub', '7-in-1 USB-C hub.', 24.99, '/img/hub.png'],
    ['Desk Lamp', 'LED desk lamp with USB charging.', 19.99, '/img/lamp.png'],
  ];
  for (const row of seed) insert.run(...row);
}

module.exports = db;
