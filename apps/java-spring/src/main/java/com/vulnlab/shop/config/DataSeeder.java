package com.vulnlab.shop.config;

import com.vulnlab.shop.entity.*;
import com.vulnlab.shop.repository.*;
import com.vulnlab.shop.security.Roles;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Path UPLOAD_DIR = Paths.get("uploads");

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final FaqRepository faqRepository;
    private final NoticeRepository noticeRepository;
    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final EventRepository eventRepository;
    private final ProductLikeRepository productLikeRepository;
    private final CouponRepository couponRepository;
    private final QuestionRepository questionRepository;
    private final LoginLogRepository loginLogRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final ShipmentRepository shipmentRepository;
    private final UserCouponRepository userCouponRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public DataSeeder(ProductRepository productRepository, UserRepository userRepository,
                      FaqRepository faqRepository, NoticeRepository noticeRepository,
                      ReviewRepository reviewRepository, OrderRepository orderRepository,
                      OrderItemRepository orderItemRepository, EventRepository eventRepository,
                      ProductLikeRepository productLikeRepository, CouponRepository couponRepository,
                      QuestionRepository questionRepository, LoginLogRepository loginLogRepository,
                      PointTransactionRepository pointTransactionRepository,
                      ShipmentRepository shipmentRepository, UserCouponRepository userCouponRepository) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.faqRepository = faqRepository;
        this.noticeRepository = noticeRepository;
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.eventRepository = eventRepository;
        this.productLikeRepository = productLikeRepository;
        this.couponRepository = couponRepository;
        this.questionRepository = questionRepository;
        this.loginLogRepository = loginLogRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.shipmentRepository = shipmentRepository;
        this.userCouponRepository = userCouponRepository;
    }

    // 결정적 순환 선택 헬퍼 + 대량 더미 생성용 공용 데이터
    private static <T> T pick(List<T> arr, int i) {
        return arr.get(((i % arr.size()) + arr.size()) % arr.size());
    }
    private static final List<String> SURNAMES = List.of("김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "전", "홍");
    private static final List<String> GIVEN = List.of("민준", "서연", "도윤", "하은", "시우", "지우", "예준", "수아", "주원", "지민", "건우", "유진", "현우", "채원", "지호", "다은", "우진", "서윤", "선우", "예은");
    private static final List<String> CITIES = List.of("서울특별시 강남구", "서울특별시 마포구", "부산광역시 해운대구", "대구광역시 수성구", "인천광역시 연수구", "광주광역시 서구", "대전광역시 유성구", "경기도 성남시 분당구", "경기도 수원시 영통구", "강원특별자치도 춘천시");
    private static final List<String> ROADS = List.of("테헤란로", "월드컵북로", "센텀중앙로", "달구벌대로", "컨벤시아대로", "상무중앙로", "대학로", "판교역로", "광교중앙로", "중앙로");
    private static final List<String> BRANDS = List.of("Basiclab", "Urban", "Maison");
    private static final List<String> GENDERS = List.of("공용", "남성", "여성");
    private static final List<String> COLORS = List.of("화이트", "블랙", "그레이", "네이비", "베이지", "카키", "브라운", "아이보리", "차콜", "인디고");

    @Override
    public void run(String... args) throws IOException {
        seedUsers();
        seedProducts();
        seedFaqs();
        seedQuestions();
        seedNotices();
        seedEvents();
        seedReviews();
        seedOrders();
        seedLikes();
        seedCoupons();
        seedLoginLogs();
        seedRewards();
        seedShippingAndSharing();
    }

    // 주문 공유 토큰 + 배송지 스냅샷 + 시연용 배송/쿠폰 (멱등)
    private void seedShippingAndSharing() {
        for (Order o : orderRepository.findAll()) {
            boolean dirty = false;
            if (o.getShareToken() == null) {
                o.setShareToken(Base64.getEncoder().encodeToString(String.valueOf(o.getId()).getBytes()));
                dirty = true;
            }
            if (o.getShipName() == null) {
                userRepository.findById(o.getUserId()).ifPresent(u -> {
                    o.setShipName(u.getName());
                    o.setShipPhone(u.getPhone());
                    o.setShipPostcode(u.getPostcode());
                    o.setShipAddress(u.getAddress());
                    o.setShipAddressDetail(u.getAddressDetail());
                });
                dirty = true;
            }
            if (dirty) orderRepository.save(o);
        }

        if (shipmentRepository.count() == 0) {
            List<Order> paid = orderRepository.findAll().stream()
                    .filter(o -> "paid".equals(o.getStatus()))
                    .sorted((a, b) -> a.getId().compareTo(b.getId()))
                    .limit(8).toList();
            String[] statuses = {"shipped", "delivered", "preparing"};
            for (int i = 0; i < paid.size(); i++) {
                Shipment s = shipmentRepository.save(new Shipment(paid.get(i).getId(), "CJ대한통운", statuses[i % statuses.length]));
                s.setTrackingNo(String.valueOf(1000000000L + s.getId()));
                shipmentRepository.save(s);
            }
        }

        // user1에게 미사용 WELCOME5000 쿠폰 지급 — VULN-036 재현용
        Long user1Id = userRepository.findByUsername("user1").map(User::getId).orElse(null);
        Long welcomeId = couponRepository.findByCode("WELCOME5000").stream().findFirst().map(Coupon::getId).orElse(null);
        if (user1Id != null && welcomeId != null) {
            boolean owned = userCouponRepository.findByUserIdOrderByIdDesc(user1Id).stream()
                    .anyMatch(uc -> welcomeId.equals(uc.getCouponId()));
            if (!owned) {
                userCouponRepository.save(new UserCoupon(user1Id, welcomeId));
            }
        }
    }

    // 추천 코드 backfill + 데모 사용자 포인트 적립(멱등)
    private void seedRewards() {
        for (User u : userRepository.findAll()) {
            if (u.getReferralCode() == null) {
                u.setReferralCode("REF" + u.getUsername().toUpperCase());
                userRepository.save(u);
            }
        }
        if (pointTransactionRepository.count() == 0) {
            for (String uname : new String[]{"user1", "user2", "user3"}) {
                userRepository.findByUsername(uname).ifPresent(u -> {
                    u.setPoints(3000);
                    userRepository.save(u);
                    pointTransactionRepository.save(new PointTransaction(u.getId(), 3000, "가입 축하 적립", null));
                });
            }
        }
    }

    private void seedCoupons() {
        if (couponRepository.count() > 0) {
            return;
        }
        couponRepository.save(coupon("WELCOME5000", "신규 가입 웰컴 쿠폰",
                "첫 구매 시 즉시 사용 가능한 5,000원 할인 쿠폰입니다.", "amount", 5000, 0, null));
        couponRepository.save(coupon("SUMMER10", "여름맞이 10% 할인",
                "3만원 이상 구매 시 10% 할인. 여름 데일리 웨어를 준비하세요.", "percent", 10, 30000, "2026-09-30T23:59:59Z"));
        couponRepository.save(coupon("FREESHIP3000", "무료배송 쿠폰",
                "배송비 3,000원 할인 쿠폰입니다.", "amount", 3000, 0, null));
        // 대량 더미 쿠폰 생성(정액/정률 순환, 고유 코드)
        for (int n = 0; n < 57; n++) {
            boolean isPercent = n % 2 == 0;
            String code = String.format("PROMO%04d", n + 1);
            int value = isPercent ? 5 + (n % 3) * 5 : (1 + n % 5) * 1000;
            String title = isPercent ? value + "% 할인 쿠폰" : value + "원 할인 쿠폰";
            Coupon c = coupon(code, title, "기간 한정 프로모션 쿠폰입니다.", isPercent ? "percent" : "amount", value, (n % 3) * 10000, null);
            if (n % 9 == 0) c.setActive(false);
            couponRepository.save(c);
        }
    }

    private Coupon coupon(String code, String title, String description, String discountType,
                          int discountValue, int minOrderAmount, String expiresAt) {
        Coupon c = new Coupon();
        c.setCode(code);
        c.setTitle(title);
        c.setDescription(description);
        c.setDiscountType(discountType);
        c.setDiscountValue(discountValue);
        c.setMinOrderAmount(minOrderAmount);
        c.setActive(true);
        c.setExpiresAt(expiresAt);
        return c;
    }

    private void seedLikes() {
        if (productLikeRepository.count() > 0) {
            return;
        }
        Long user1Id = userRepository.findByUsername("user1").map(User::getId).orElse(null);
        Long user2Id = userRepository.findByUsername("user2").map(User::getId).orElse(null);
        Long user3Id = userRepository.findByUsername("user3").map(User::getId).orElse(null);
        List<Product> products = productRepository.findAll();
        if (user1Id == null || user2Id == null || user3Id == null || products.size() < 16) {
            return;
        }
        // 인덱스는 seedProducts 순서 기준: 0=티셔츠, 4=슬랙스, 8=토트백, 9=크로스백, 14=목걸이
        int[][] likes = {
                {0, 0}, {0, 4}, {0, 8},   // user1
                {1, 0}, {1, 9}, {1, 14},  // user2
                {2, 0}, {2, 4},           // user3
        };
        Long[] userIds = {user1Id, user2Id, user3Id};
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (int[] like : likes) {
            Long uid = userIds[like[0]];
            Long pid = products.get(like[1]).getId();
            if (seen.add(uid + ":" + pid)) {
                productLikeRepository.save(new ProductLike(uid, pid));
            }
        }
        // 대량 더미 좋아요 생성(상품 × 사용자 순환)
        List<Long> lkUsers = userRepository.findAll().stream().filter(u -> Roles.USER.equals(u.getRole())).map(User::getId).toList();
        int made = 0;
        for (int pi = 0; pi < products.size() && made < 90; pi++) {
            int likesPerProduct = 1 + (pi % 3);
            for (int k = 0; k < likesPerProduct && made < 90; k++) {
                Long uid = pick(lkUsers, pi * 3 + k);
                Long pid = products.get(pi).getId();
                if (seen.add(uid + ":" + pid)) {
                    productLikeRepository.save(new ProductLike(uid, pid));
                    made++;
                }
            }
        }
    }

    private void seedUsers() {
        seedUser("9u4a", "9u4a", Roles.SYSTEM_ADMIN, "최고관리자", "010-1234-5678",
                "Vulnlab Shop 시스템의 총괄 관리자 계정입니다.", "10014", "경기도 성남시 분당구 데모로 63", "9층");
        seedUser("admin", "admin", Roles.ADMIN, "상점관리자", "010-5678-1234",
                "상품 관리 및 고객 문의 처리를 전담하는 상점 관리자 계정입니다.", "10001", "서울특별시 강남구 테스트로 12", "302호");
        seedUser("user1", "user1", Roles.USER, "김철수", "010-1111-2222",
                "새로운 테크 기기에 관심이 많은 얼리어답터 김철수입니다.", "10002", "서울특별시 마포구 샘플길 34", "101동 203호");
        seedUser("user2", "user2", Roles.USER, "이영희", "010-3333-4444",
                "깔끔하고 세련된 데스크테리어를 좋아하는 이영희입니다.", "10003", "서울특별시 종로구 데모대로 56", "2층");
        seedUser("user3", "user3", Roles.USER, "박민수", "010-5555-6666",
                "가성비 좋고 성능 확실한 스마트 오피스 제품을 선호하는 박민수입니다.", "10005", "서울특별시 영등포구 더미길 90", "반지하 B01호");

        // 대량 더미 사용자(user4..user60)
        for (int n = 4; n <= 60; n++) {
            String username = "user" + n;
            String name = pick(SURNAMES, n) + pick(GIVEN, n * 3);
            String phone = String.format("010-%04d-%04d", 1000 + (n * 7) % 9000, 1000 + (n * 13) % 9000);
            String address = pick(CITIES, n) + " " + pick(ROADS, n) + " " + (10 + n % 90);
            seedUser(username, username, Roles.USER, name, phone, name + "의 데모 계정입니다.",
                    String.valueOf(10000 + n), address, (100 + n % 900) + "호");
        }
    }

    private void seedUser(String username, String rawPassword, String role, String name, String phone,
                          String bio, String postcode, String address, String addressDetail) {
        Optional<User> opt = userRepository.findByUsername(username);
        User user;
        if (opt.isPresent()) {
            user = opt.get();
        } else {
            user = new User();
            user.setUsername(username);
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
        }
        user.setRole(role);
        user.setName(name);
        user.setPhone(phone);
        user.setBio(bio);
        user.setPostcode(postcode);
        user.setAddress(address);
        user.setAddressDetail(addressDetail);
        user.setActive(true);
        userRepository.save(user);
    }

    private void seedProducts() throws IOException {
        if (productRepository.count() > 0) {
            return;
        }
        String top = seedImage("apparel-top.svg");
        String bottom = seedImage("apparel-bottom.svg");
        String bag = seedImage("apparel-bag.svg");
        String hat = seedImage("apparel-hat.svg");
        String acc = seedImage("apparel-acc.svg");
        List<Product> seed = new ArrayList<>(List.of(
                // 상의 (top)
                product("베이식 크루넥 티셔츠", "매일 입기 좋은 20수 싱글 코튼 크루넥 티셔츠입니다. 적당한 두께감과 부드러운 촉감으로 사계절 데일리로 활용하기 좋습니다.", "19000",
                        top, "top", "Basiclab", "TOP-001", "공용", "화이트", "코튼", 120, "사이즈", "S,M,L,XL"),
                product("옥스포드 셔츠", "단정한 클래식 핏의 옥스포드 코튼 셔츠. 출근룩부터 캐주얼까지 폭넓게 매치할 수 있는 스카이블루 컬러입니다.", "39000",
                        top, "top", "Basiclab", "TOP-002", "남성", "스카이블루", "코튼", 64, "사이즈", "S,M,L,XL"),
                product("오버핏 맨투맨", "기모 없이도 포근한 헤비 코튼 오버핏 맨투맨입니다. 넉넉한 실루엣으로 편안하게 즐기는 그레이 컬러.", "45000",
                        top, "top", "Urban", "TOP-003", "공용", "그레이", "코튼", 48, "사이즈", "M,L,XL"),
                product("울 니트 가디건", "보온성 좋은 울 혼방 니트 가디건. 부드러운 아이보리 톤으로 이너와 아우터 어디에나 잘 어울립니다.", "59000",
                        top, "top", "Maison", "TOP-004", "여성", "아이보리", "울", 30, "사이즈", "S,M,L"),
                // 바지 (bottom)
                product("와이드 슬랙스", "군더더기 없는 드레이프가 매력적인 와이드 슬랙스. 신축성 있는 폴리 혼방으로 활동성까지 챙겼습니다.", "49000",
                        bottom, "bottom", "Basiclab", "BOT-001", "여성", "블랙", "폴리에스터", 52, "사이즈", "S,M,L"),
                product("스트레이트 데님", "적당한 두께의 논워싱 인디고 데님. 유행을 타지 않는 스트레이트 핏으로 오래 입기 좋습니다.", "55000",
                        bottom, "bottom", "Urban", "BOT-002", "남성", "인디고", "데님", 40, "사이즈", "28,30,32,34"),
                product("코튼 조거팬츠", "허리 밴딩과 발목 조임으로 편안한 코튼 조거팬츠. 카키 컬러로 캐주얼 무드를 완성합니다.", "39000",
                        bottom, "bottom", "Urban", "BOT-003", "공용", "카키", "코튼", 0, "사이즈", "M,L,XL"),
                product("치노 팬츠", "깔끔한 세미 슬림 핏의 베이지 치노 팬츠. 셔츠와 매치하면 단정한 오피스룩이 완성됩니다.", "42000",
                        bottom, "bottom", "Basiclab", "BOT-004", "남성", "베이지", "코튼", 58, "사이즈", "30,32,34"),
                // 가방 (bag)
                product("캔버스 토트백", "데일리로 부담 없는 대용량 캔버스 토트백. 노트북과 A4 서류가 넉넉히 들어갑니다.", "29000",
                        bag, "bag", "Maison", "BAG-001", "공용", "아이보리", "캔버스", 90, "색상", "Ivory,Black"),
                product("레더 크로스백", "유러피안 무드의 소가죽 크로스백. 데일리부터 나들이까지 어울리는 브라운 컬러입니다.", "89000",
                        bag, "bag", "Maison", "BAG-002", "여성", "브라운", "레더", 22, "색상", "Brown,Black"),
                product("나일론 백팩", "가볍고 견고한 나일론 백팩. 15인치 노트북 수납과 다양한 포켓으로 실용성이 뛰어납니다.", "69000",
                        bag, "bag", "Urban", "BAG-003", "공용", "블랙", "나일론", 44, "색상", "Black,Navy"),
                // 모자 (hat)
                product("코튼 볼캡", "기본에 충실한 코튼 볼캡. 조절 스트랩으로 누구나 편하게 착용할 수 있는 블랙 컬러입니다.", "25000",
                        hat, "hat", "Basiclab", "HAT-001", "공용", "블랙", "코튼", 110, "사이즈", "Free"),
                product("버킷햇", "자외선 차단과 스타일을 동시에. 부드러운 베이지 코튼 버킷햇입니다.", "27000",
                        hat, "hat", "Urban", "HAT-002", "여성", "베이지", "코튼", 6, "사이즈", "Free"),
                product("니트 비니", "겨울 필수 아이템, 신축성 좋은 아크릴 니트 비니. 어떤 코디에도 잘 어울리는 차콜 컬러.", "22000",
                        hat, "hat", "Urban", "HAT-003", "공용", "차콜", "아크릴", 70, "사이즈", "Free"),
                // 액세서리 (acc)
                product("실버 체인 목걸이", "변색에 강한 스테인리스 소재의 데일리 체인 목걸이. 심플한 실버 톤으로 포인트를 더합니다.", "35000",
                        acc, "acc", "Maison", "ACC-001", "여성", "실버", "스테인리스", 80, "색상", "Silver,Gold"),
                product("가죽 벨트", "견고한 소가죽 벨트. 캐주얼과 슬랙스 모두에 어울리는 브라운 컬러입니다.", "32000",
                        acc, "acc", "Basiclab", "ACC-002", "남성", "브라운", "레더", 55, "사이즈", "M,L,XL")
        ));
        // 대량 더미 상품 생성(카테고리 순환으로 60종까지)
        record Cat(String slug, String img, String prefix, List<String> items, String opt, List<String> mats, int start) {}
        List<Cat> cats = List.of(
                new Cat("top", top, "TOP", List.of("크루넥 티셔츠", "헨리넥 티셔츠", "피케 폴로", "스트라이프 셔츠", "린넨 셔츠", "후드 집업", "라운드 니트", "카라 니트"), "S,M,L,XL", List.of("코튼", "린넨", "울", "폴리에스터"), 4),
                new Cat("bottom", bottom, "BOT", List.of("테이퍼드 슬랙스", "와이드 데님", "슬림 치노", "카고 팬츠", "트랙 팬츠", "숏 팬츠", "코듀로이 팬츠"), "28,30,32,34", List.of("코튼", "데님", "폴리에스터", "코듀로이"), 4),
                new Cat("bag", bag, "BAG", List.of("에코 토트백", "미니 크로스백", "데일리 백팩", "메신저백", "더플백", "웨이스트백"), "Free", List.of("캔버스", "나일론", "레더", "폴리에스터"), 3),
                new Cat("hat", hat, "HAT", List.of("볼캡", "버킷햇", "니트 비니", "베레모", "스트로우햇"), "Free", List.of("코튼", "아크릴", "울", "스트로우"), 3),
                new Cat("acc", acc, "ACC", List.of("체인 목걸이", "가죽 벨트", "실버 링", "머플러", "양말 세트", "선글라스"), "Free", List.of("스테인리스", "레더", "실버", "아크릴"), 2)
        );
        int[] seq = new int[cats.size()];
        for (int i = 0; i < cats.size(); i++) seq[i] = cats.get(i).start();
        for (int n = 0; seed.size() < 60; n++) {
            int ci = n % cats.size();
            Cat c = cats.get(ci);
            seq[ci]++;
            String item = pick(c.items(), n);
            int price = 15000 + ((n * 3137) % 80) * 1000;
            int stock = (n % 11 == 0) ? 0 : 20 + (n * 7) % 130;
            String optName = c.slug().equals("bag") || c.slug().equals("hat") || c.slug().equals("acc") ? "옵션" : "사이즈";
            seed.add(product(
                    pick(BRANDS, n) + " " + item,
                    item + " 상품입니다. 데일리로 활용하기 좋은 " + pick(c.mats(), n) + " 소재의 " + pick(COLORS, n) + " 컬러 아이템입니다.",
                    String.valueOf(price), c.img(), c.slug(), pick(BRANDS, n),
                    String.format("%s-%03d", c.prefix(), seq[ci]),
                    pick(GENDERS, n), pick(COLORS, n), pick(c.mats(), n), stock, optName, c.opt()));
        }
        productRepository.saveAll(seed);
    }

    private void seedFaqs() {
        if (faqRepository.count() > 0) {
            return;
        }
        Long adminId = userRepository.findByUsername("admin").map(User::getId).orElse(1L);
        String adminUsername = "admin";
        Long systemAdminId = userRepository.findByUsername("9u4a").map(User::getId).orElse(1L);
        String systemAdminUsername = "9u4a";

        List<Faq> faqs = new ArrayList<>(List.of(
                faq("배송 기간은 얼마나 걸리나요?",
                    "결제 완료 후 서울 및 수도권 지역은 대개 영업일 기준 1~2일 내에 배송되며, 도서산간 지역은 2~4일 정도 소요될 수 있습니다. 택배사 사정에 따라 다소 변동될 수 있습니다.",
                    adminId, adminUsername),
                faq("반품 및 교환 신청 방법과 규정이 궁금합니다.",
                    "상품 수령 후 7일 이내에 구매 확정을 하지 않으신 상태에서 신청 가능합니다. 단, 상품이 훼손되었거나 포장을 개봉하여 가치가 훼손된 경우에는 교환/반품이 어려울 수 있습니다. 마이페이지의 주문 목록에서 신청하시거나 고객센터에 문의해 주세요.",
                    adminId, adminUsername),
                faq("비회원도 상품 구매가 가능한가요?",
                    "저희 쇼핑몰은 회원제 서비스로 운영되고 있으며, 비회원 구매는 지원하지 않습니다. 이메일과 간단한 정보 입력만으로 10초 만에 간편히 가입하여 쇼핑을 즐기실 수 있습니다.",
                    adminId, adminUsername),
                faq("결제 가능한 수단에는 어떤 것들이 있나요?",
                    "토스페이먼츠 안전 결제를 통해 신용카드 결제 및 계좌이체, 토스페이, 삼성페이 등 다양한 간편결제 수단을 완벽하게 이용하실 수 있습니다.",
                    systemAdminId, systemAdminUsername),
                faq("개인정보 보호 및 보안 관련 정책이 어떻게 되나요?",
                    "저희는 회원님의 모든 패스워드를 최신 암호화 알고리즘(BCrypt)으로 처리하여 철저하게 보호하고 있으며, 결제 정보 등 주요 데이터 역시 안전한 보안 프레임워크를 통해 철저하게 관리되고 있으니 안심하셔도 됩니다.",
                    systemAdminId, systemAdminUsername)
        ));
        // 대량 더미 FAQ 생성(주제 순환)
        List<String[]> topics = List.of(
                new String[]{"배송", "배송비는 얼마인가요", "3만원 이상 구매 시 무료이며, 미만은 3,000원이 부과됩니다."},
                new String[]{"배송", "해외 배송도 되나요", "현재는 국내 배송만 지원하고 있으며 해외 배송은 준비 중입니다."},
                new String[]{"교환/반품", "단순 변심 반품 시 배송비는", "단순 변심의 경우 왕복 배송비가 고객 부담으로 발생합니다."},
                new String[]{"교환/반품", "교환은 몇 번까지 가능한가요", "동일 상품 기준 1회 교환이 가능하며 재고 상황에 따라 다를 수 있습니다."},
                new String[]{"결제", "무통장 입금도 가능한가요", "토스페이먼츠 계좌이체로 대체되며 가상계좌 입금이 지원됩니다."},
                new String[]{"결제", "해외 카드로 결제되나요", "일부 해외 발급 카드는 결제가 제한될 수 있습니다."},
                new String[]{"회원", "아이디를 변경할 수 있나요", "아이디는 변경이 불가하며 탈퇴 후 재가입이 필요합니다."},
                new String[]{"회원", "휴면 계정은 어떻게 되나요", "1년 이상 미접속 시 휴면 전환되며 재로그인으로 해제됩니다."},
                new String[]{"쿠폰", "쿠폰은 중복 사용되나요", "주문당 1장의 쿠폰만 적용 가능합니다."},
                new String[]{"상품", "재입고 알림을 받고 싶어요", "품절 상품 상세에서 재입고 알림을 신청할 수 있습니다."}
        );
        Long[] authors = {adminId, systemAdminId};
        String[] authorNames = {adminUsername, systemAdminUsername};
        for (int n = 0; faqs.size() < 60; n++) {
            String[] t = pick(topics, n);
            int round = n / topics.size() + 1;
            int a = n % 2;
            faqs.add(faq("[" + t[0] + "] " + t[1] + "? (" + round + ")", t[2], authors[a], authorNames[a]));
        }
        faqRepository.saveAll(faqs);
    }

    private void seedQuestions() {
        if (questionRepository.count() > 0) {
            return;
        }
        Long user1 = userRepository.findByUsername("user1").map(User::getId).orElse(1L);
        Long user2 = userRepository.findByUsername("user2").map(User::getId).orElse(1L);

        Question answered = question(user1, "user1", "주문한 상품 배송이 언제 시작되나요?",
                "어제 결제를 완료했는데 아직 배송 시작 알림이 없어서 문의드립니다.", false);
        answered.setAnswer("안녕하세요. 결제 확인 후 영업일 기준 1일 내 순차 출고되고 있으며, 오늘 중 출고 예정입니다. 이용에 불편을 드려 죄송합니다.");
        answered.setAnsweredBy("admin");
        answered.setAnsweredAt(java.time.LocalDateTime.now());

        List<Question> questions = new ArrayList<>(List.of(
                answered,
                question(user2, "user2", "사이즈 교환도 가능한가요?",
                        "M 사이즈를 주문했는데 L로 교환하고 싶습니다. 절차가 궁금합니다.", false),
                question(user1, "user1", "(비밀글) 결제 영수증 재발급 문의",
                        "세금계산서 처리 때문에 영수증 재발급이 필요합니다. 계정 정보 확인 부탁드립니다.", true)
        ));
        // 대량 더미 Q&A 생성(답변완료/미답변/비밀글 순환)
        List<User> qUsers = userRepository.findAll().stream().filter(u -> Roles.USER.equals(u.getRole())).toList();
        List<String> qTitles = List.of("배송 조회는 어디서 하나요", "주문 취소하고 싶어요", "색상 문의드립니다", "재입고 예정일이 궁금해요", "쿠폰 적용이 안돼요", "사이즈 추천 부탁드려요", "영수증 발급 요청", "주소 변경 가능한가요", "적립금은 어떻게 쓰나요", "상품 상세 사이즈표 문의");
        for (int n = 0; n < 57 && !qUsers.isEmpty(); n++) {
            User u = pick(qUsers, n);
            boolean secret = n % 7 == 0;
            Question q = question(u.getId(), u.getUsername(), pick(qTitles, n) + " (" + (n + 1) + ")", "문의 내용입니다. 확인 후 안내 부탁드립니다.", secret);
            if (n % 3 == 0) {
                q.setAnswer("안녕하세요. 문의 주신 내용 확인하여 순차적으로 안내드리고 있습니다. 감사합니다.");
                q.setAnsweredBy("admin");
                q.setAnsweredAt(java.time.LocalDateTime.now());
            }
            questions.add(q);
        }
        questionRepository.saveAll(questions);
    }

    private Question question(Long userId, String username, String title, String body, boolean secret) {
        Question q = new Question();
        q.setUserId(userId);
        q.setUsername(username);
        q.setTitle(title);
        q.setBody(body);
        q.setSecret(secret);
        return q;
    }

    private Faq faq(String question, String answer, Long userId, String authorUsername) {
        Faq f = new Faq();
        f.setQuestion(question);
        f.setAnswer(answer);
        f.setUserId(userId);
        f.setAuthorUsername(authorUsername);
        return f;
    }

    private void seedNotices() {
        if (noticeRepository.count() > 0) {
            return;
        }
        List<Notice> notices = new ArrayList<>(List.of(
                notice("[공지] 신규 회원 가입 환영 적립금 웰컴 이벤트 안내",
                       "안녕하세요. Vulnlab Shop에 오신 것을 진심으로 환영합니다!\n\n현재 신규 가입하신 모든 회원님들께 첫 구매 시 즉시 사용 가능한 풍성한 웰컴 할인 혜택을 제공하고 있습니다. 마이페이지에서 가입 직후 확인해 보세요.\n앞으로도 더 합리적이고 프리미엄한 오피스 가젯과 테크 액세서리들로 보답하겠습니다.\n감사합니다."),
                notice("[공지] 개인정보 처리방침 일부 개정 예정 공지",
                       "안녕하세요. Vulnlab Shop입니다.\n\n회원 여러분의 소중한 개인정보를 보다 투명하게 보호하고, 최신 법률 요건을 충족하기 위해 개인정보 처리방침이 일부 개정될 예정입니다.\n\n- 주요 개정 사유: 신규 간편결제 연동에 따른 수탁업체 리스트 현행화\n- 적용 일자: 2026년 9월 1일\n\n상세한 개정 대조표는 공지사항 첨부 혹은 약관 페이지를 참고 바라며, 관련 문의는 당사 고객지원 센터로 전달 주시면 성심껏 답변 드리겠습니다."),
                notice("[점검] 토스페이먼츠 결제 시스템 정기 보안 점검 안내",
                       "안정적이고 강력한 결제 보안 환경을 제공하기 위해 PG 결제 시스템의 정기 정밀 정검이 아래와 같이 예정되어 있습니다.\n\n- 점검 시간: 2026년 8월 30일(일요일) 새벽 02:00 ~ 04:00 (약 2시간)\n- 작업 영향: 점검 시간 동안 간헐적으로 신용카드 및 토스페이 결제 승인 오류 또는 결제 지연이 발생할 수 있습니다.\n\n사용자 여러분의 너른 양해를 부탁드리며, 점검 시간 전에 필요한 주문을 완료해 주시면 더욱 매끄러운 이용이 가능합니다. 감사합니다."),
                notice("[안내] 하절기 기상 악화(태풍)로 인한 일부 지역 배송 지연 안내",
                       "최근 한반도를 통과하는 강력한 하절기 태풍의 영향으로 인하여, 남부 지방 및 제주/도서 지역으로의 택배 배송 배차가 일부 지연되고 있습니다.\n\n- 지연 예상 지역: 부산, 울산, 경남, 전남 전체 및 제주 특별자치도\n- 예상 지연 일수: 기존 배송일보다 약 1~2영업일 지연 예상\n\n상품을 기다리시는 고객님들께 심려를 끼쳐드려 대단히 죄송하며, 기상 특보가 해제되는 대로 신속하고 안전하게 배송이 재개될 수 있도록 물류팀에서 최선을 다하겠습니다.")
        ));
        // 대량 더미 공지 생성(카테고리 순환)
        List<String[]> kinds = List.of(
                new String[]{"공지", "신규 입점 브랜드 안내"}, new String[]{"이벤트", "주간 특가 상품 안내"},
                new String[]{"점검", "시스템 정기 점검 안내"}, new String[]{"안내", "배송 정책 변경 안내"},
                new String[]{"공지", "고객센터 운영시간 변경"});
        for (int n = 0; notices.size() < 60; n++) {
            String[] k = pick(kinds, n);
            notices.add(notice("[" + k[0] + "] " + k[1] + " (" + (n + 1) + ")",
                    "안녕하세요. Vulnlab Shop입니다.\n\n" + k[1] + " 관련하여 안내드립니다. 자세한 내용은 본문을 확인해 주세요.\n\n감사합니다."));
        }
        noticeRepository.saveAll(notices);
    }

    private Notice notice(String title, String body) {
        Notice n = new Notice();
        n.setTitle(title);
        n.setBody(body);
        return n;
    }

    private void seedEvents() {
        if (eventRepository.count() > 0) {
            return;
        }
        List<Event> events = new ArrayList<>(List.of(
                event("여름 데스크 셋업 페어",
                      "<h3 style=\"margin-top:0\">인기 아이템 최대 30% 할인</h3><p>키보드 · 모니터 · 조명까지, 지금 가장 많이 담는 데스크 셋업 아이템을 한정 수량 특가로 준비했습니다.</p><p><strong>8월 한정 · 재고 소진 시 조기 종료</strong></p>",
                      "/products"),
                event("신규 회원 웰컴 쿠폰",
                      "<p>지금 가입하면 <strong>첫 구매 5,000원 즉시 할인</strong> 쿠폰을 드려요.</p><p>가입 후 마이페이지에서 바로 확인하실 수 있습니다.</p>",
                      "/signup"),
                event("무료배송 위크",
                      "<p>이번 주 모든 주문 <strong>무료배송</strong> — 별도 쿠폰 없이 자동 적용됩니다.</p>",
                      "/products")
        ));
        // 큐레이트 3건에 노출기간 부여 → 이 3건만 팝업으로 뜬다(더미는 기간 없음 → 팝업 제외)
        for (Event e : events) {
            e.setStartsAt("2026-08-01T00:00:00Z");
            e.setEndsAt("2026-12-31T23:59:59Z");
        }
        // 대량 더미 이벤트 생성(활성/비활성 순환)
        List<String> eTitles = List.of("가을 신상 프리뷰", "주말 타임세일", "브랜드 위크", "리뷰 이벤트", "친구 초대 혜택", "멤버십 더블 적립", "시즌 오프 클리어런스", "단독 특가전");
        for (int n = 0; events.size() < 60; n++) {
            String title = pick(eTitles, n) + " (" + (n + 1) + ")";
            Event e = event(title, "<h3 style=\"margin-top:0\">" + title + "</h3><p>지금 참여하고 다양한 혜택을 받아보세요. 기간 한정으로 진행됩니다.</p>", "/products");
            if (n % 5 == 0) e.setActive(false);
            events.add(e);
        }
        eventRepository.saveAll(events);
    }

    private Event event(String title, String body, String linkUrl) {
        Event e = new Event();
        e.setTitle(title);
        e.setBody(body);
        e.setLinkUrl(linkUrl);
        e.setActive(true);
        return e;
    }

    private void seedReviews() {
        if (reviewRepository.count() > 0) {
            return;
        }
        Long user1Id = userRepository.findByUsername("user1").map(User::getId).orElse(null);
        Long user2Id = userRepository.findByUsername("user2").map(User::getId).orElse(null);
        Long user3Id = userRepository.findByUsername("user3").map(User::getId).orElse(null);

        if (user1Id != null && user2Id != null && user3Id != null) {
            List<Product> products = productRepository.findAll();
            if (products.size() >= 10) {
                Long p1 = products.get(0).getId();
                Long p2 = products.get(1).getId();
                Long p3 = products.get(2).getId();
                Long p4 = products.get(3).getId();
                Long p5 = products.get(4).getId();
                Long p6 = products.get(5).getId();
                Long p7 = products.get(6).getId();

                List<Review> reviews = List.of(
                        review(p1, user1Id, 5, "기본 티셔츠는 이게 국룰이네요. 비침 없고 목 늘어남도 없어서 색깔별로 재구매했습니다. 세탁 후에도 핏이 그대로예요."),
                        review(p1, user2Id, 4, "촉감이 부드럽고 도톰해서 좋아요. 다만 화이트는 생각보다 살짝 크게 나와서 한 사이즈 작게 주문하시길 추천합니다."),
                        review(p2, user3Id, 5, "옥스포드 원단이 탄탄하고 다림질도 잘 먹습니다. 스카이블루 색감이 화면보다 실물이 더 예뻐요. 출근용으로 딱입니다."),
                        review(p3, user1Id, 5, "오버핏이라 편하게 걸치기 좋고 도톰해서 지금 날씨에 적당합니다. 그레이 톤이 무난해서 아무 하의에나 잘 어울려요."),
                        review(p3, user2Id, 3, "핏이랑 두께는 만족스러운데 기모가 아니라 한겨울엔 조금 춥겠네요. 간절기용으로는 아주 좋습니다."),
                        review(p4, user3Id, 4, "울 혼방이라 따뜻하고 보풀도 아직 없습니다. 아이보리 색이 은은해서 데일리로 자주 손이 가요."),
                        review(p5, user2Id, 5, "슬랙스 드레이프가 예쁘게 떨어지고 신축성이 있어서 하루 종일 편했습니다. 블랙은 실패가 없네요."),
                        review(p6, user1Id, 5, "논워싱 인디고라 처음엔 뻣뻣하지만 입을수록 길들여집니다. 스트레이트 핏이 군더더기 없어 오래 입을 것 같아요."),
                        review(p7, user3Id, 5, "조거팬츠 밴딩이 편하고 카키 색이 코디하기 좋습니다. 집에서도 밖에서도 자주 입게 되네요.")
                );
                // 데모용: user2가 상품1에 남긴 후기(인덱스 1)를 비밀글로 표시
                List<Review> curated = new ArrayList<>(reviews);
                curated.get(1).setSecret(true);

                // 대량 더미 후기 생성(상품 전반 × 사용자 순환)
                List<Long> rvUsers = userRepository.findAll().stream().filter(u -> Roles.USER.equals(u.getRole())).map(User::getId).toList();
                List<String> body = List.of(
                        "가격 대비 만족스러워요. 재구매 의사 있습니다.",
                        "핏과 색감이 화면과 동일해서 좋았어요.",
                        "배송이 빠르고 포장도 깔끔했습니다.",
                        "무난하게 데일리로 입기 좋네요.",
                        "소재가 생각보다 도톰하고 튼튼합니다.",
                        "사이즈가 살짝 커서 한 치수 작게 추천해요.");
                int made = 0;
                for (int pi = 0; pi < products.size() && made < 90; pi++) {
                    int perProduct = 1 + (pi % 2);
                    for (int k = 0; k < perProduct && made < 90; k++) {
                        Long uid = pick(rvUsers, pi * 2 + k + 3);
                        int rating = 3 + ((pi + k) % 3);
                        curated.add(review(products.get(pi).getId(), uid, rating, pick(body, pi + k)));
                        made++;
                    }
                }
                reviewRepository.saveAll(curated);
            }
        }
    }

    private Review review(Long productId, Long userId, int rating, String body) {
        Review r = new Review();
        r.setProductId(productId);
        r.setUserId(userId);
        r.setRating(rating);
        r.setBody(body);
        return r;
    }

    private void seedOrders() {
        if (orderRepository.count() > 0) {
            return;
        }
        Long user1Id = userRepository.findByUsername("user1").map(User::getId).orElse(null);
        Long user2Id = userRepository.findByUsername("user2").map(User::getId).orElse(null);
        Long user3Id = userRepository.findByUsername("user3").map(User::getId).orElse(null);

        if (user1Id != null && user2Id != null && user3Id != null) {
            List<Product> products = productRepository.findAll();
            if (products.size() >= 10) {
                Product tee = products.get(0);      // 크루넥 티셔츠
                Product shirt = products.get(1);     // 옥스포드 셔츠
                Product slacks = products.get(4);    // 와이드 슬랙스
                Product tote = products.get(8);      // 캔버스 토트백
                Product cap = products.get(11);      // 코튼 볼캡
                Product necklace = products.get(14); // 실버 체인 목걸이

                // Order 1 (user1) - Paid  (티셔츠 + 옥스포드 셔츠)
                Order o1 = order(user1Id, "paid", new BigDecimal("58000"), "toss_seed_order_1", "toss_seed_payment_key_1");
                orderRepository.save(o1);
                orderItemRepository.save(orderItem(o1.getId(), tee.getId(), 1, tee.getPrice(), "M"));
                orderItemRepository.save(orderItem(o1.getId(), shirt.getId(), 1, shirt.getPrice(), "L"));

                // Order 2 (user2) - Paid  (와이드 슬랙스)
                Order o2 = order(user2Id, "paid", new BigDecimal("49000"), "toss_seed_order_2", "toss_seed_payment_key_2");
                orderRepository.save(o2);
                orderItemRepository.save(orderItem(o2.getId(), slacks.getId(), 1, slacks.getPrice(), "M"));

                // Order 3 (user3) - Pending  (토트백 + 볼캡)
                Order o3 = order(user3Id, "pending", new BigDecimal("54000"), "toss_seed_order_3", null);
                orderRepository.save(o3);
                orderItemRepository.save(orderItem(o3.getId(), tote.getId(), 1, tote.getPrice(), "Ivory"));
                orderItemRepository.save(orderItem(o3.getId(), cap.getId(), 1, cap.getPrice(), "Free"));

                // Order 4 (user1) - Paid  (실버 체인 목걸이)
                Order o4 = order(user1Id, "paid", new BigDecimal("35000"), "toss_seed_order_4", "toss_seed_payment_key_4");
                orderRepository.save(o4);
                orderItemRepository.save(orderItem(o4.getId(), necklace.getId(), 1, necklace.getPrice(), "Silver"));

                // 대량 더미 주문 생성(사용자 × 상품 순환, 상태 혼합)
                List<Long> odUsers = userRepository.findAll().stream().filter(u -> Roles.USER.equals(u.getRole())).map(User::getId).toList();
                for (int n = 5; n <= 60; n++) {
                    Long uid = pick(odUsers, n);
                    String status = n % 4 == 0 ? "pending" : "paid";
                    int lineCount = 1 + (n % 2);
                    List<Product> lines = new ArrayList<>();
                    BigDecimal total = BigDecimal.ZERO;
                    int[] qtys = new int[lineCount];
                    for (int k = 0; k < lineCount; k++) {
                        Product p = pick(products, n * 2 + k);
                        int qty = 1 + (n % 2);
                        lines.add(p);
                        qtys[k] = qty;
                        total = total.add(p.getPrice().multiply(BigDecimal.valueOf(qty)));
                    }
                    String paymentKey = status.equals("paid") ? "toss_seed_payment_key_" + n : null;
                    Order o = order(uid, status, total, "toss_seed_order_" + n, paymentKey);
                    orderRepository.save(o);
                    for (int k = 0; k < lines.size(); k++) {
                        Product p = lines.get(k);
                        String opt = p.getOptionValues() == null ? null : p.getOptionValues().split(",")[0];
                        orderItemRepository.save(orderItem(o.getId(), p.getId(), qtys[k], p.getPrice(), opt));
                    }
                }
            }
        }
    }

    private Order order(Long userId, String status, BigDecimal totalAmount, String tossOrderId, String tossPaymentKey) {
        Order o = new Order();
        o.setUserId(userId);
        o.setStatus(status);
        o.setTotalAmount(totalAmount);
        o.setTossOrderId(tossOrderId);
        o.setTossPaymentKey(tossPaymentKey);
        return o;
    }

    private OrderItem orderItem(Long orderId, Long productId, int quantity, BigDecimal unitPrice, String optionValue) {
        OrderItem oi = new OrderItem();
        oi.setOrderId(orderId);
        oi.setProductId(productId);
        oi.setQuantity(quantity);
        oi.setUnitPrice(unitPrice);
        oi.setOptionValue(optionValue);
        return oi;
    }

    private void seedLoginLogs() {
        if (loginLogRepository.count() > 0) {
            return;
        }
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) {
            return;
        }
        List<String> uas = List.of(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1",
                "Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36");
        List<LoginLog> logs = new ArrayList<>();
        for (int n = 0; n < 80; n++) {
            User u = pick(users, n);
            boolean success = n % 5 != 0;
            String ip = "203.0." + (n % 256) + "." + ((n * 7) % 256);
            LoginLog log = new LoginLog(u.getId(), u.getUsername(), ip, pick(uas, n), success);
            log.setAt(java.time.LocalDateTime.now().minusHours(n * 3L));
            logs.add(log);
        }
        loginLogRepository.saveAll(logs);
    }

    private String seedImage(String filename) throws IOException {
        Files.createDirectories(UPLOAD_DIR);
        Path dest = UPLOAD_DIR.resolve(filename);
        if (!Files.exists(dest)) {
            try (var in = new ClassPathResource("seed-images/" + filename).getInputStream()) {
                Files.copy(in, dest);
            }
        }
        return filename;
    }

    private Product product(String name, String description, String price, String imageUrl, String category,
                             String brand, String sku, String gender, String color, String material,
                             int stock, String optionName, String optionValues) {
        Product p = new Product();
        p.setName(name);
        p.setDescription(description);
        p.setPrice(new BigDecimal(price));
        p.setImageUrl(imageUrl);
        p.setCategory(category);
        p.setBrand(brand);
        p.setSku(sku);
        p.setGender(gender);
        p.setColor(color);
        p.setMaterial(material);
        p.setStock(stock);
        p.setOptionName(optionName);
        p.setOptionValues(optionValues);
        return p;
    }
}
