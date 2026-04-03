import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Steps from './components/steps/Steps'; 
import Benefits from './components/benefits/Benefits'; 
import Categories from './components/categories/Categories'; 
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login'; 
import ForgotPassword from './pages/ForgotPassword'; 
import BillPage from './pages/BillPage'; 
import VerifyOTP from './pages/VerifyOTP'; 
import Confirmation from './pages/Confirmation'; 
import Footer from './components/Footer/Footer'; 
import MainContent from './components/MainContent/MainContent'; 
import Dashboard from './pages/DashboardPage'; 
import Restaurant from './components/singlepage/RestaurantPage'; 

// --- नवीन RestaurantPagelist कंपोनंट Import केला ---
import RestaurantPagelist from './components/singlepage/RestaurantPagelist';
import StoresPagelist from './components/singlepage/StoresPagelist';

// नवीन Advertisement कंपोनंट Import केला
import Advertisement from './components/addvertisment/addvertisment';

// --- Transaction Page Import ---
import TransactionPage from './components/transaction/TransactionPage'; 

// --- Admin Portal Components ---
import AdminLogin from './AdminPortal/AdminLogin';
import AdminDashboard from './AdminPortal/AdminDashboard';

// --- Partner Portal Components ---
import PartnerLogin from './PartnerPortal/PartnerLogin';
import PartnerDashboard from './PartnerPortal/PartnerDashboard';

// --- नवीन Info कंपोनंट Import ---
import Info from './AdminPortal/info';


// SEO Routing Imports
import CitySeoPage from './pages/seo/city/CitySeoPage';
import RestaurantSeoPage from './pages/seo/restaurant/RestaurantSeoPage';
import ActivitySeoPage from './pages/seo/activity/ActivitySeoPage';
import HotelSeoPage from './pages/seo/hotel/HotelSeoPage';
import ShopsSeoPage from './pages/seo/shops/ShopsSeoPage';
import VillasSeoPage from './pages/seo/villas/VillasSeoPage';
import BlogSeoPage from './pages/seo/blog/BlogSeoPage';

import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Blog from './pages/Blog';

const AppLayout = () => {
  const location = useLocation();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    if (!API_BASE_URL) return;

    const sendHeartbeat = () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      fetch(`${API_BASE_URL}/api/auth/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    };

    const sendLogout = () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true
      }).catch(() => {});
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 30000);
    window.addEventListener('beforeunload', sendLogout);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendLogout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', sendLogout);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [API_BASE_URL]);
  
  const hideHeaderFooter = 
    location.pathname === '/upload-bill' || 
    location.pathname === '/verify-otp' || 
    location.pathname === '/confirmation' ||
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' || 
    location.pathname === '/DashboardPage' || 
    location.pathname === '/signup' ||
    location.pathname === '/restaurant' ||
    location.pathname === '/restaurant-list' || 
    location.pathname === '/stores-list' ||
    location.pathname === '/transaction-history' || 
    location.pathname === '/admin-login' ||
    location.pathname === '/admin-dashboard' ||
    location.pathname === '/admin/dashboard' ||
    location.pathname === '/partner-login' ||   
    location.pathname === '/admin/info' || 
    location.pathname === '/partner-dashboard' ||
    location.pathname === '/partner/dashboard';  

  return (
    <div className="app-container">
      {/* {!hideHeaderFooter && <Navbar />} */}
      
      <main style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/upload-bill" element={<BillPage />} /> 
          <Route path="/verify-otp" element={<VerifyOTP />} /> 
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/DashboardPage" element={<Dashboard />} />
          <Route path="/restaurant" element={<Restaurant />} />
          
          {/* SEO Routes */}
          <Route path="/restaurant/:slug" element={<RestaurantSeoPage />} />
          <Route path="/restaurants" element={<RestaurantSeoPage />} />
          <Route path="/activity/:slug" element={<ActivitySeoPage />} />
          <Route path="/activity" element={<ActivitySeoPage />} />
          <Route path="/hotel/:slug" element={<HotelSeoPage />} />
          <Route path="/hotel" element={<HotelSeoPage />} />
          <Route path="/shops/:slug" element={<ShopsSeoPage />} />
          <Route path="/shops" element={<ShopsSeoPage />} />
          <Route path="/villas/:slug" element={<VillasSeoPage />} />
          <Route path="/villas" element={<VillasSeoPage />} />
          <Route path="/:citySlug" element={<CitySeoPage />} />
          <Route path="/blog/:slug" element={<BlogSeoPage />} />

          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/blog" element={<Blog />} />
          
          {/* नवीन RestaurantPagelist रूट */}
          <Route path="/restaurant-list" element={<RestaurantPagelist />} />
          <Route path="/stores-list" element={<StoresPagelist />} />

          {/* --- नवीन Admin Info रूट अ‍ॅड केला --- */}
          <Route path="/admin/info" element={<Info />} />
          
          <Route path="/transaction-history" element={<TransactionPage />} />

          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          <Route path="/partner-login" element={<PartnerLogin />} />
          <Route path="/partner-dashboard" element={<PartnerDashboard />} />
          <Route path="/partner/dashboard" element={<PartnerDashboard />} />
        </Routes>
      </main>

      {/* {!hideHeaderFooter && <Footer />} */}
    </div>
  );
};

const HomePage = () => {
  return (
    <div>
      <Navbar fixed />
      <div style={{ paddingTop: '70px' }}>
        <Hero />
        <MainContent/>
        {/* --- इथे तुझा जाहिरात कंपोनंट टाकला आहे --- */}
        <Advertisement />
        <Categories /> 
        <Benefits />
        <Footer />
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
