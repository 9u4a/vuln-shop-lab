export const ADMIN_ROLES = ['admin', 'system_admin'];

// 상단 메뉴 바(카테고리와 한 줄로 노출되는 쇼핑 링크).
export const NAV_LINKS = [
  { to: '/events', label: '이벤트' },
  { to: '/coupons', label: '쿠폰' },
  { to: '/notices', label: '공지사항' },
  { to: '/faq', label: '자주 묻는 질문' },
  { to: '/qna', label: 'Q&A' },
  { to: '/track', label: '배송조회' },
];

// 계정/관리 링크(상단 유틸 바 및 모바일 드로어).
export const ACCOUNT_LINKS = [
  { to: '/orders', label: '주문 내역', auth: true },
  { to: '/admin', label: '관리자', admin: true },
];

export function visibleLinks(links, user) {
  return links.filter((l) => {
    if (l.auth && !user) return false;
    if (l.admin && !(user && ADMIN_ROLES.includes(user.role))) return false;
    return true;
  });
}

// 하위 호환용.
export function visibleNavLinks(user) {
  return visibleLinks(NAV_LINKS, user);
}
