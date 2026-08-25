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
    brand TEXT,
    sku TEXT,
    stock INTEGER NOT NULL DEFAULT 100,
    option_name TEXT,
    option_values TEXT,
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
    unit_price REAL NOT NULL,
    option_value TEXT
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

for (const stmt of [
  'ALTER TABLE users ADD COLUMN bio TEXT',
  'ALTER TABLE users ADD COLUMN avatar_url TEXT',
  'ALTER TABLE products ADD COLUMN category TEXT',
  'ALTER TABLE products ADD COLUMN brand TEXT',
  'ALTER TABLE products ADD COLUMN sku TEXT',
  "ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 100",
  'ALTER TABLE products ADD COLUMN option_name TEXT',
  'ALTER TABLE products ADD COLUMN option_values TEXT',
  'ALTER TABLE order_items ADD COLUMN option_value TEXT',
]) {
  try {
    db.exec(stmt);
  } catch (err) {
    // column already exists on databases created before this migration
  }
}

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const seedImagesDir = path.join(__dirname, '..', 'seed-images');
function seedImage(filename) {
  const dest = path.join(uploadDir, filename);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(path.join(seedImagesDir, filename), dest);
  }
  return filename;
}

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (productCount === 0) {
  const insert = db.prepare(
    `INSERT INTO products
      (name, description, price, image_url, category, brand, sku, stock, option_name, option_values)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const seed = [
    ['Mechanical Keyboard', 'Hot-swappable mechanical keyboard.', 89.99, seedImage('keyboard.png'), 'accessories', 'Vulnlab', 'KEY-001', 42, 'Switch', 'Red,Blue,Brown'],
    ['Wireless Mouse', 'Ergonomic wireless mouse.', 29.99, seedImage('mouse.png'), 'accessories', 'Vulnlab', 'MOU-002', 87, 'Color', 'Black,White'],
    ['4K Monitor', '27-inch 4K IPS monitor.', 349.99, seedImage('monitor.png'), 'displays', 'Vulnlab', 'MON-003', 15, 'Stand', 'Standard,Adjustable'],
    ['USB-C Hub', '7-in-1 USB-C hub.', 24.99, seedImage('hub.png'), 'accessories', 'Vulnlab', 'HUB-004', 130, 'Color', 'Space Gray,Silver'],
    ['Desk Lamp', 'LED desk lamp with USB charging.', 19.99, seedImage('lamp.png'), 'office', 'Vulnlab', 'LMP-005', 60, 'Color', 'White,Black'],
  ];
  for (const row of seed) insert.run(...row);
}

module.exports = db;
