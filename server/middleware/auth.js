import jwt from 'jsonwebtoken';

// ─── Fail fast if JWT_SECRET is missing ───
export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Generate a strong secret and set it in .env');
}



export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ─── Multi-role requireRole middleware ───
// Usage: requireRole('admin', 'coadmin', 'manager')
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const isSuper = userRole === 'superadmin';
    const hasRole = roles.includes(userRole);

    // SuperAdmin always passes
    if (isSuper || hasRole) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  };
};

// ─── Returns the team admin ID for a user ───
// For SuperAdmin: null (all teams)
// For Admin: user.id (they ARE the team root)
// For Co-Admin, Manager, Viewer, Surveyor: user.admin_id || user.id
export const getTeamAdminId = (user) => {
  if (!user) return null;
  if (user.role === 'superadmin') return null;
  if (user.role === 'admin') return user.id;
  return user.admin_id || user.id;
};

// ─── Checks if caller can manage a target user ───
export const canManageUser = (caller, targetUser) => {
  if (!caller || !targetUser) return false;
  if (caller.role === 'superadmin') return true;

  const callerTeamId = getTeamAdminId(caller);
  const targetTeamId = targetUser.role === 'admin' ? targetUser.id : (targetUser.admin_id || targetUser.id);

  if (['admin', 'coadmin', 'manager'].includes(caller.role)) {
    return targetTeamId === callerTeamId || targetUser.id === caller.id;
  }

  return false;
};

