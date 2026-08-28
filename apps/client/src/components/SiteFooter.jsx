import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories.js';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <div className="site-footer__brand">Vuln Shop</div>
          <p className="muted" style={{ maxWidth: '30ch' }}>
            좋은 것만 골라 담는 데스크 셋업 편집샵. 키보드부터 조명까지, 매일 쓰는 물건을 신중하게.
          </p>
        </div>

        <div>
          <h4>고객센터</h4>
          <ul>
            <li>1544-0000 (평일 10:00–18:00)</li>
            <li>점심 12:30–13:30 / 주말·공휴일 휴무</li>
            <li><Link to="/faq">자주 묻는 질문</Link></li>
            <li><Link to="/qna">Q&amp;A 문의</Link></li>
          </ul>
        </div>

        <div>
          <h4>쇼핑</h4>
          <ul>
            <li><Link to="/products">전체 상품</Link></li>
            {CATEGORIES.map((c) => (
              <li key={c.slug}><Link to={`/products?category=${c.slug}`}>{c.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4>혜택 · 소식</h4>
          <ul>
            <li><Link to="/events">이벤트</Link></li>
            <li><Link to="/coupons">쿠폰</Link></li>
            <li><Link to="/notices">공지사항</Link></li>
          </ul>
        </div>

        <div>
          <h4>이용안내</h4>
          <ul>
            <li><Link to="/notices">이용약관</Link></li>
            <li><Link to="/notices">개인정보 처리방침</Link></li>
            <li><Link to="/orders">주문 내역</Link></li>
          </ul>
        </div>
      </div>

      <div className="site-footer__legal">
        (주)불랩 · 대표 홍길동 · 사업자등록번호 000-00-00000 · 통신판매업신고 제0000-서울-00000호<br />
        서울특별시 어딘가로 000, 0층 · 개인정보보호책임자 홍길동
        <br /><br />
        © {new Date().getFullYear()} Vuln Shop. 본 사이트는 보안 학습을 위해 의도적으로 취약하게 제작된
        데모이며, 실제 상거래를 제공하지 않습니다.
      </div>
    </footer>
  );
}
