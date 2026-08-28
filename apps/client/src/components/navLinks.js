export const ADMIN_ROLES = ['admin', 'system_admin'];

// `auth`: only when logged in. `admin`: only for admin roles.
export const NAV_LINKS = [
  { to: '/products', label: '상품' },
  { to: '/notices', label: '공지사항' },
  { to: '/faq', label: '자주 묻는 질문' },
  { to: '/orders', label: '주문 내역', auth: true },
  { to: '/admin', label: '관리자', admin: true },
];

export function visibleNavLinks(user) {
  return NAV_LINKS.filter((l) => {
    if (l.auth && !user) return false;
    if (l.admin && !(user && ADMIN_ROLES.includes(user.role))) return false;
    return true;
  });
}
