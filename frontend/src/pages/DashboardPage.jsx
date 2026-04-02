import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import MainPageContent from "../components/Mainpage/MainPageContent";
import Footer from "../components/Footer/Footer";
import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/Hero/Hero";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [remainingTime, setRemainingTime] = useState("48hr-00m-00s");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("authUser");
      return saved ? JSON.parse(saved) : null;
    } catch (_error) {
      return null;
    }
  });


  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response?.data?.user) {
          localStorage.setItem("authUser", JSON.stringify(response.data.user));
          setUser(response.data.user);
        }
      } catch (_error) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  const membershipPlan = user?.membershipPlan || "Single Plan";
  const isFreePlan = /free/i.test(membershipPlan);
  const membershipExpiresAtMs = useMemo(() => {
    const parseMs = (value) => {
      if (!value) return null;
      const ms = new Date(value).getTime();
      return Number.isNaN(ms) ? null : ms;
    };

    const expiresAtMs = parseMs(user?.membershipExpiresAt);
    if (expiresAtMs) return expiresAtMs;

    const activatedAtMs = parseMs(user?.membershipActivatedAt);
    if (activatedAtMs) return activatedAtMs + 48 * 60 * 60 * 1000;

    const createdAtMs = parseMs(user?.createdAt);
    if (createdAtMs) return createdAtMs + 48 * 60 * 60 * 1000;

    return null;
  }, [user?.membershipExpiresAt, user?.membershipActivatedAt, user?.createdAt]);

  useEffect(() => {
    if (!membershipExpiresAtMs) {
      setRemainingTime("00hr-00m-00s");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diffMs = membershipExpiresAtMs - now.getTime();

      if (diffMs <= 0) {
        setRemainingTime("00hr-00m-00s");
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const hh = String(hours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      const ss = String(seconds).padStart(2, "0");
      setRemainingTime(`${hh}hr-${mm}m-${ss}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [membershipExpiresAtMs]);

  const validUntilLabel =
    membershipExpiresAtMs
      ? new Date(membershipExpiresAtMs).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      : "Not Available";

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    navigate("/");
  };

  return (
    <div className="pg-root-combined">
      <Navbar isAuthenticated onLogout={handleLogout} />

      {isFreePlan ? (
        <Hero showMembershipBox validUntilLabel={validUntilLabel} remainingTime={remainingTime} />
      ) : (
        <section className="mg-hero-combined">
          <div className="mg-hero-svg-bg"></div>
          
          <div className="mg-hero-inner">
            <div className="mg-hero-content">
              <div className="mg-membership-card-combined">
                 <div className="mg-card-header">
                    <span className="mg-premium-badge">
                      <i className="fa-solid fa-crown"></i> PREMIUM
                    </span>
                    <span className="mg-active-status">
                      <span className="mg-dot-pulse"></span> ACTIVE MEMBERSHIP
                    </span>
                 </div>
                 
                 <div className="mg-card-body">
                    <span className="mg-plan-text">{membershipPlan.toUpperCase()}</span>
                    <span className="mg-divider">|</span>
                    <span className="mg-price-main">₹50</span>
                    <span className="mg-price-sub">/ 2 days</span>
                 </div>
                 
                 <div className="mg-card-footer">
                    <div className="mg-footer-info">
                      <i className="fa-regular fa-calendar-check"></i> VALID UNTIL {validUntilLabel}
                    </div>
                    <div className="mg-timer-box">
                      <i className="fa-solid fa-clock"></i> REMAINING: {remainingTime}
                    </div>
                 </div>
              </div>
            </div>

            <div className="mg-search-wrapper">
              <div className="mg-search-bar">
                <i className="fa-solid fa-magnifying-glass mg-search-icon"></i>
                <input type="text" placeholder="Search hotels, food, strawberries..." />
                <button className="mg-search-btn">Get Deals</button> 
              </div>
            </div>

            <div className="mg-hero-stats">
                <span><i className="fa-solid fa-bolt"></i> Instant Discounts</span>
                <span><i className="fa-solid fa-shield-halved"></i> 100% Verified</span>
            </div>
          </div>

          <div className="mg-hero-curve">
             <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 100L1440 100L1440 0C1440 0 1080 80 720 80C360 80 0 0 0 0L0 100Z" fill="#ffffff"/>
             </svg>
          </div>
        </section>
      )}
      <MainPageContent/>
      <Footer/>
    </div>
  );
};

export default DashboardPage;

//old

