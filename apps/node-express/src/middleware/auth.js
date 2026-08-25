const ADMIN_ROLES = new Set(['admin', 'system_admin']);

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
  if (!ADMIN_ROLES.has(req.session.user.role)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

function requireSystemAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.session.user.role !== 'system_admin') {
    return res.status(403).json({ error: 'System admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireSystemAdmin };
