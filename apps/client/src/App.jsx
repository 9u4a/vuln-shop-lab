import { Routes, Route, Navigate } from 'react-router-dom';
import { BackendProvider } from './BackendContext.jsx';
import { CartProvider } from './CartContext.jsx';
import { SessionProvider } from './SessionContext.jsx';
import { ToastProvider } from './ToastContext.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import { ADMIN_ROLES } from './components/navLinks.js';
import RequireAuth from './RequireAuth.jsx';
import RequireRole from './RequireRole.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import MyPageLayout from './pages/mypage/MyPageLayout.jsx';
import MyPageProfile from './pages/mypage/MyPageProfile.jsx';
import MyPageLikes from './pages/mypage/MyPageLikes.jsx';
import MyPagePassword from './pages/mypage/MyPagePassword.jsx';
import Cart from './pages/Cart.jsx';
import CheckoutResult from './pages/CheckoutResult.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Faq from './pages/Faq.jsx';
import Qna from './pages/Qna.jsx';
import QnaDetail from './pages/QnaDetail.jsx';
import Notices from './pages/Notices.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import NoticeDetail from './pages/NoticeDetail.jsx';
import Coupons from './pages/Coupons.jsx';
import NotFound from './pages/NotFound.jsx';
import Forbidden from './pages/Forbidden.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminAccessLogs from './pages/admin/AdminAccessLogs.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminFaq from './pages/admin/AdminFaq.jsx';
import AdminNotices from './pages/admin/AdminNotices.jsx';
import AdminEvents from './pages/admin/AdminEvents.jsx';
import AdminCoupons from './pages/admin/AdminCoupons.jsx';

function Layout({ children }) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="content">{children}</main>
      <SiteFooter />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BackendProvider>
        <SessionProvider>
          <CartProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/qna" element={<Qna />} />
                <Route path="/qna/:id" element={<QnaDetail />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/notices/:id" element={<NoticeDetail />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/coupons" element={<Coupons />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout/success" element={<CheckoutResult success />} />
                <Route path="/checkout/fail" element={<CheckoutResult success={false} />} />

                <Route path="/mypage" element={<RequireAuth><MyPageLayout /></RequireAuth>}>
                  <Route index element={<MyPageProfile />} />
                  <Route path="likes" element={<MyPageLikes />} />
                  <Route path="password" element={<MyPagePassword />} />
                </Route>
                <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
                <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />

                <Route
                  path="/admin"
                  element={
                    <RequireRole roles={ADMIN_ROLES}>
                      <AdminLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<Navigate to="settings" replace />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="logs" element={<AdminAccessLogs />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="faq" element={<AdminFaq />} />
                  <Route path="notices" element={<AdminNotices />} />
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                </Route>

                <Route path="/forbidden" element={<Forbidden />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </CartProvider>
        </SessionProvider>
      </BackendProvider>
    </ToastProvider>
  );
}
