function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
