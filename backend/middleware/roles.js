function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role || 'user';
    if (roles.length === 0 || roles.includes(role)) return next();
    res.status(403);
    return next(new Error('Forbidden'));
  };
}

module.exports = { requireRole };
