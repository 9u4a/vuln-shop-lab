// 상품 카테고리 및 필터 값의 단일 출처.
// Home / Products / SiteFooter / 카테고리 메뉴가 모두 이 상수를 사용한다.

export const CATEGORIES = [
  { slug: 'top', label: '상의', emoji: '👕', desc: '티셔츠 · 셔츠 · 니트' },
  { slug: 'bottom', label: '바지', emoji: '👖', desc: '슬랙스 · 데님 · 조거' },
  { slug: 'bag', label: '가방', emoji: '👜', desc: '토트 · 크로스 · 백팩' },
  { slug: 'hat', label: '모자', emoji: '🧢', desc: '볼캡 · 버킷 · 비니' },
  { slug: 'acc', label: '액세서리', emoji: '💍', desc: '목걸이 · 벨트 · 소품' },
];

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.label]));

// 필터 후보값 — 시드 상품과 맞춘 고정 목록.
export const GENDERS = ['남성', '여성', '공용'];

export const COLORS = [
  '화이트', '블랙', '그레이', '차콜', '아이보리', '베이지',
  '네이비', '스카이블루', '인디고', '카키', '브라운', '실버',
];

export const MATERIALS = [
  '코튼', '데님', '울', '아크릴', '폴리에스터',
  '레더', '캔버스', '나일론', '스테인리스',
];

export const SORTS = [
  { value: '', label: '추천순' },
  { value: 'name', label: '이름순' },
  { value: 'price', label: '가격순' },
  { value: 'reviews', label: '후기순' },
  { value: 'likes', label: '좋아요순' },
];
