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
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public DataSeeder(ProductRepository productRepository, UserRepository userRepository,
                      FaqRepository faqRepository, NoticeRepository noticeRepository,
                      ReviewRepository reviewRepository, OrderRepository orderRepository,
                      OrderItemRepository orderItemRepository) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.faqRepository = faqRepository;
        this.noticeRepository = noticeRepository;
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
    }

    @Override
    public void run(String... args) throws IOException {
        seedUsers();
        seedProducts();
        seedFaqs();
        seedNotices();
        seedReviews();
        seedOrders();
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
        userRepository.save(user);
    }

    private void seedProducts() throws IOException {
        if (productRepository.count() > 0) {
            return;
        }
        List<Product> seed = List.of(
                product("기계식 키보드", "핫스왑을 지원하며 RGB 백라이트가 장착된 고급형 기계식 키보드입니다. 기계식 스위치의 찰진 손맛과 알루미늄 프레임의 견고함을 느껴보세요.", "89000",
                        seedImage("keyboard.png"), "accessories", "Vulnlab", "KEY-001", 42, "스위치", "Red,Blue,Brown"),
                product("무선 마우스", "인체공학적 비대칭 마우스로 장시간 사용에도 손목 피로가 거의 없습니다. 정밀한 광학 센서와 무소음 클릭으로 어디서나 자유롭게 활용하세요.", "29000",
                        seedImage("mouse.png"), "accessories", "Vulnlab", "MOU-002", 87, "색상", "Black,White"),
                product("4K UHD 모니터", "27인치 눈부심 방지 4K IPS 모니터입니다. 전문가용 sRGB 100% 색표현 및 HDR 지원으로 게임, 그래픽 편집, 동영상 시청까지 완벽히 소화합니다.", "349000",
                        seedImage("monitor.png"), "displays", "Vulnlab", "MON-003", 15, "스탠드", "Standard,Adjustable"),
                product("USB-C 멀티허브", "7-in-1 초고속 전송 및 패스스루 충전을 지원하는 USB-C 멀티허브입니다. HDMI 4K 출력 및 SD/TF 카드 리더 탑재로 연결성이 극대화됩니다.", "24000",
                        seedImage("hub.png"), "accessories", "Vulnlab", "HUB-004", 130, "색상", "Space Gray,Silver"),
                product("스마트 LED 스탠드", "눈이 편안한 플리커프리 무단계 디밍 LED 스탠드입니다. 스마트 터치 센서와 USB 출력 포트로 스마트폰 충전까지 간편하게 처리해 보세요.", "19000",
                        seedImage("lamp.png"), "office", "Vulnlab", "LMP-005", 60, "색상", "White,Black"),
                product("알루미늄 콤팩트 키보드", "65% 배열의 극단적인 슬림 설계로 책상 위 공간을 혁신적으로 절약해 주는 블루투스 콤팩트 키보드입니다. 고급스러운 통알루미늄 하우징.", "129000",
                        seedImage("keyboard.png"), "accessories", "Vulnlab", "KEY-006", 25, "스위치", "Linear,Tactile,Clicky"),
                product("버티컬 무선 마우스", "손목 터널 증후군을 예방하기 위한 57도 각도의 프리미엄 버티컬 마우스입니다. 충전식 배터리로 반영구적 사용 가능.", "49000",
                        seedImage("mouse.png"), "accessories", "Vulnlab", "MOU-007", 35, "색상", "Gray,White"),
                product("포터블 보조 모니터", "C타입 케이블 하나로 바로 연결되는 15.6인치 초슬림 보조 모니터입니다. 재택근무, 외근, 캠핑지에서 손쉽게 듀얼 스크린 환경을 구축하세요.", "159000",
                        seedImage("monitor.png"), "displays", "Vulnlab", "MON-008", 18, "보호 케이스", "Basic,Leather"),
                product("PD 100W 질화갈륨 충전기", "차세대 GaN 질화갈륨 소재로 부피는 줄이고 효율은 높인 PD 100W 3포트 고속 충전기입니다. 노트북과 태블릿, 스마트폰을 동시 고속 충전합니다.", "39000",
                        seedImage("hub.png"), "accessories", "Vulnlab", "CHG-009", 150, "색상", "Black,White"),
                product("모니터 스크린 바 LED", "모니터 위에 거치하여 화면 반사 없이 책상 위만 밝혀주는 비대칭 광학 디자인 스크린바입니다. 눈부심을 차단하여 야간 작업에 최적입니다.", "34000",
                        seedImage("lamp.png"), "office", "Vulnlab", "LMP-010", 75, "작동 모드", "Manual,Auto Sensor")
        );
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

        List<Faq> faqs = List.of(
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
        );
        faqRepository.saveAll(faqs);
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
        List<Notice> notices = List.of(
                notice("[공지] 신규 회원 가입 환영 적립금 웰컴 이벤트 안내",
                       "안녕하세요. Vulnlab Shop에 오신 것을 진심으로 환영합니다!\n\n현재 신규 가입하신 모든 회원님들께 첫 구매 시 즉시 사용 가능한 풍성한 웰컴 할인 혜택을 제공하고 있습니다. 마이페이지에서 가입 직후 확인해 보세요.\n앞으로도 더 합리적이고 프리미엄한 오피스 가젯과 테크 액세서리들로 보답하겠습니다.\n감사합니다."),
                notice("[공지] 개인정보 처리방침 일부 개정 예정 공지",
                       "안녕하세요. Vulnlab Shop입니다.\n\n회원 여러분의 소중한 개인정보를 보다 투명하게 보호하고, 최신 법률 요건을 충족하기 위해 개인정보 처리방침이 일부 개정될 예정입니다.\n\n- 주요 개정 사유: 신규 간편결제 연동에 따른 수탁업체 리스트 현행화\n- 적용 일자: 2026년 9월 1일\n\n상세한 개정 대조표는 공지사항 첨부 혹은 약관 페이지를 참고 바라며, 관련 문의는 당사 고객지원 센터로 전달 주시면 성심껏 답변 드리겠습니다."),
                notice("[점검] 토스페이먼츠 결제 시스템 정기 보안 점검 안내",
                       "안정적이고 강력한 결제 보안 환경을 제공하기 위해 PG 결제 시스템의 정기 정밀 정검이 아래와 같이 예정되어 있습니다.\n\n- 점검 시간: 2026년 8월 30일(일요일) 새벽 02:00 ~ 04:00 (약 2시간)\n- 작업 영향: 점검 시간 동안 간헐적으로 신용카드 및 토스페이 결제 승인 오류 또는 결제 지연이 발생할 수 있습니다.\n\n사용자 여러분의 너른 양해를 부탁드리며, 점검 시간 전에 필요한 주문을 완료해 주시면 더욱 매끄러운 이용이 가능합니다. 감사합니다."),
                notice("[안내] 하절기 기상 악화(태풍)로 인한 일부 지역 배송 지연 안내",
                       "최근 한반도를 통과하는 강력한 하절기 태풍의 영향으로 인하여, 남부 지방 및 제주/도서 지역으로의 택배 배송 배차가 일부 지연되고 있습니다.\n\n- 지연 예상 지역: 부산, 울산, 경남, 전남 전체 및 제주 특별자치도\n- 예상 지연 일수: 기존 배송일보다 약 1~2영업일 지연 예상\n\n상품을 기다리시는 고객님들께 심려를 끼쳐드려 대단히 죄송하며, 기상 특보가 해제되는 대로 신속하고 안전하게 배송이 재개될 수 있도록 물류팀에서 최선을 다하겠습니다.")
        );
        noticeRepository.saveAll(notices);
    }

    private Notice notice(String title, String body) {
        Notice n = new Notice();
        n.setTitle(title);
        n.setBody(body);
        return n;
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
                        review(p1, user1Id, 5, "사무실에서 쓸 용도로 갈축을 구매했습니다. 키감이 너무 서걱거리지도 않고 정숙하면서도 치는 맛이 아주 쫄깃하네요. 키캡 품질도 훌륭합니다!"),
                        review(p1, user2Id, 4, "디자인이 심플하고 레트로한 감성이 마음에 드네요. 블루투스 페어링도 끊김없이 잘 됩니다. 다만 높이 조절 단계가 하나만 더 있었으면 완벽했을 것 같아요."),
                        review(p2, user3Id, 5, "마우스가 매우 가벼우며 충전이 정말 오래 갑니다. 하루종일 캐드 작업하는데 손목 통증이 많이 줄어들어서 아주 대만족스럽게 쓰고 있어요."),
                        review(p3, user1Id, 5, "4K 화질 선명도가 놀랍네요. 윈도우랑 맥OS 둘 다 가독성 훌륭하게 뽑아줍니다. 눈부심 방지도 잘 처리되어서 눈 피로도가 대폭 줄었습니다."),
                        review(p3, user2Id, 3, "디스플레이 자체의 색감과 해상도는 넘사벽 수준으로 좋습니다만, 번들 스탠드가 높낮이 조절이 힘들어 별도의 모니터암을 구매해서 거치했습니다."),
                        review(p4, user3Id, 4, "C타입 연결선 일체형이라 간편합니다. USB 3.0 포트 인식 잘 되고 HDMI 포트로 외부 모니터 송출 시 화질 저하가 없습니다. 풀 장착 시 발열은 살짝 있는 편입니다."),
                        review(p5, user2Id, 5, "독서할 때 밤에 방 불 끄고 이 스탠드 하나만 켜두어도 눈이 전혀 안 피로합니다. 타이머 기능이 있어서 켜두고 잠들기에도 제격이네요. 디자인도 고급스러워요."),
                        review(p6, user1Id, 5, "알루미늄 하우징 무게감이 주는 타건 안정감이 엄청납니다. 통울림이 거의 느껴지지 않아 키보드 매니아라면 충분히 돈값하는 끝판왕 모델이라고 생각합니다."),
                        review(p7, user3Id, 5, "사무직의 필수품입니다. 처음 쓸 때는 각도가 어색해서 조금 버벅거렸는데, 이틀 정도 적응하고 나니 기존 일반 마우스는 어색해서 다시 못 쓰겠습니다.")
                );
                reviewRepository.saveAll(reviews);
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
                Product p1 = products.get(0);
                Product p2 = products.get(1);
                Product p3 = products.get(2);
                Product p4 = products.get(3);
                Product p5 = products.get(4);
                Product p9 = products.get(8);

                // Order 1 (user1) - Paid
                Order o1 = order(user1Id, "paid", new BigDecimal("118000"), "toss_seed_order_1", "toss_seed_payment_key_1");
                orderRepository.save(o1);
                orderItemRepository.save(orderItem(o1.getId(), p1.getId(), 1, p1.getPrice(), "Brown"));
                orderItemRepository.save(orderItem(o1.getId(), p2.getId(), 1, p2.getPrice(), "Black"));

                // Order 2 (user2) - Paid
                Order o2 = order(user2Id, "paid", new BigDecimal("349000"), "toss_seed_order_2", "toss_seed_payment_key_2");
                orderRepository.save(o2);
                orderItemRepository.save(orderItem(o2.getId(), p3.getId(), 1, p3.getPrice(), "Adjustable"));

                // Order 3 (user3) - Pending
                Order o3 = order(user3Id, "pending", new BigDecimal("43000"), "toss_seed_order_3", null);
                orderRepository.save(o3);
                orderItemRepository.save(orderItem(o3.getId(), p5.getId(), 1, p5.getPrice(), "White"));
                orderItemRepository.save(orderItem(o3.getId(), p4.getId(), 1, p4.getPrice(), "Space Gray"));

                // Order 4 (user1) - Paid
                Order o4 = order(user1Id, "paid", new BigDecimal("39000"), "toss_seed_order_4", "toss_seed_payment_key_4");
                orderRepository.save(o4);
                orderItemRepository.save(orderItem(o4.getId(), p9.getId(), 1, p9.getPrice(), "Black"));
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
                             String brand, String sku, int stock, String optionName, String optionValues) {
        Product p = new Product();
        p.setName(name);
        p.setDescription(description);
        p.setPrice(new BigDecimal(price));
        p.setImageUrl(imageUrl);
        p.setCategory(category);
        p.setBrand(brand);
        p.setSku(sku);
        p.setStock(stock);
        p.setOptionName(optionName);
        p.setOptionValues(optionValues);
        return p;
    }
}
