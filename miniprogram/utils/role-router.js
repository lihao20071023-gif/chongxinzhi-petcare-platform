const session = require('../services/session');

function routeForRole(role, doctorStatus) {
  if (role === 'pet_owner') return '/pages/owner/home/index';
  if (role === 'doctor') {
    return doctorStatus === 'approved'
      ? '/pages/doctor/home/index'
      : '/pages/doctor/hospital-bind/index';
  }
  // Admin is deliberately not routed inside the mini program.
  return '/pages/login/index';
}

function requireRole(allowedRoles) {
  const current = session.load();
  if (!current || !allowedRoles.includes(current.role)) {
    wx.reLaunch({ url: '/pages/login/index' });
    return null;
  }
  return current;
}

module.exports = { routeForRole, requireRole };
