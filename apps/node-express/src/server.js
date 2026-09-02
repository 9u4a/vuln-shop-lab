require('dotenv').config();
require('express-async-errors');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const profileRoutes = require('./routes/profile');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const faqRoutes = require('./routes/faqs');
const noticeRoutes = require('./routes/notices');
const eventRoutes = require('./routes/events');
const activityRoutes = require('./routes/activity');
const likeRoutes = require('./routes/likes');
const couponRoutes = require('./routes/coupons');
const giftCardRoutes = require('./routes/giftcards');
const recentlyViewedRoutes = require('./routes/recently-viewed');
const shippingAddressRoutes = require('./routes/shipping-addresses');
const notificationRoutes = require('./routes/notifications');
const qnaRoutes = require('./routes/qna');
const addressRoutes = require('./routes/addresses');
const pointRoutes = require('./routes/points');
const returnRoutes = require('./routes/returns');
const referralRoutes = require('./routes/referral');
const restockRoutes = require('./routes/restock');
const cartRoutes = require('./routes/cart');
const shipmentRoutes = require('./routes/shipments');
const { initMongo } = require('./mongo');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

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
    cookie: { sameSite: 'none', secure: true },
  })
);

app.use('/uploads', express.static(uploadDir));

// OpenAPI 문서 (내비게이션에 링크되지 않음, URL 직접 접근으로만 도달).
app.get('/api-docs/node/openapi.json', (req, res) => res.json(openapiSpec));
app.get('/api-docs/node', (req, res, next) => {
  if (req.path === '/api-docs/node') return res.redirect(302, '/api-docs/node/');
  next();
});
app.use(
  '/api-docs/node',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'Vuln Shop API — node-express',
    swaggerOptions: { withCredentials: true, displayRequestDuration: true, persistAuthorization: true },
  })
);

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
app.use('/api/events', eventRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/giftcards', giftCardRoutes);
app.use('/api/recently-viewed', recentlyViewedRoutes);
app.use('/api/shipping-addresses', shippingAddressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/qna', qnaRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/restock', restockRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/shipments', shipmentRoutes);

initMongo().catch((err) => console.error('mongo init failed:', err.message));

// 라우트 밖에서 발생한 미포착 오류로 프로세스가 죽지 않도록 로깅만 하고 유지한다.
// (라우트 내부의 async 오류는 express-async-errors가 기본 에러 핸들러로 전달 — VULN-007 유지)
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});

app.listen(PORT, () => {
  console.log(`node-express vulnerable shop API running on http://localhost:${PORT}`);
});
