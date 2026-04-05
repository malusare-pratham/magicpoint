import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar({ isAuthenticated = false, onLogout, showMobileMenu = true, fixed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const showTransactionMenu = isAuthenticated;
  const openTransactionHistory = () => {
    navigate("/transaction-history");
    setMenuOpen(false);
  };
  const toggleMobileMenu = () => {
    setMenuOpen((prev) => !prev);
  };
  const handleMenuLogout = () => {
    setMenuOpen(false);
    handleAuthAction();
  };

  const handleLogoClick = () => {
    if (isAuthenticated) {
      if (location.pathname === "/DashboardPage") {
        window.location.reload();
        return;
      }
      navigate("/DashboardPage");
      return;
    }
    navigate("/");
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      if (onLogout) onLogout();
      return;
    }
    navigate("/login");
  };

  return (
    <nav className={`magic-navbar ${fixed ? "magic-navbar-fixed" : ""}`}>
      <div className="nav-container">
        <div className="nav-left">
          <div className="brand-lockup" onClick={handleLogoClick} role="button" tabIndex={0} onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleLogoClick();
          }}>
            <h2 className="logo">
              TripspotGo
            </h2>
          </div>
          <span className="tagline">Discover. Redeem. Experience.</span>
        </div>

        <div className="nav-right-section">
          <div className={`menu-pill ${isAuthenticated ? "dashboard-pill" : ""}`}>
            {isAuthenticated ? (
              <>
                <ul className="nav-links">
                  <li onClick={() => navigate('/about-us')} style={{ cursor: "pointer" }}>About us</li>
                  <li onClick={() => navigate('/contact-us')} style={{ cursor: "pointer" }}>Contact us</li>
                  <li onClick={() => navigate('/blog')} style={{ cursor: "pointer" }}>Blog</li>
                  {showTransactionMenu && (
                    <li onClick={openTransactionHistory} style={{ cursor: "pointer" }}>
                      Payment History
                    </li>
                  )}
                </ul>

                <button className="signin-btn" onClick={handleAuthAction}>
                  Logout
                </button>
                {showTransactionMenu && (
                  <button
                    type="button"
                    className="mobile-transaction-btn"
                    onClick={openTransactionHistory}
                    aria-label="Open transaction history"
                    title="Payment History"
                  >
                    <i className="fa-solid fa-receipt tx-receipt-icon"></i>
                  </button>
                )}
                {showMobileMenu && (
                  <button
                    type="button"
                    className="mobile-menu-lines-btn"
                    onClick={toggleMobileMenu}
                    aria-label="Open menu options"
                    title="Menu"
                  >
                    <span className="mobile-tx-lines" aria-hidden="true">
                      <span className="line line-1"></span>
                      <span className="line line-2"></span>
                      <span className="line line-3"></span>
                    </span>
                  </button>
                )}

                {showMobileMenu && menuOpen && (
                  <div className="premium-dropdown">
                    <button type="button" onClick={() => { navigate('/about-us'); setMenuOpen(false); }}>About us</button>
                    <button type="button" onClick={() => { navigate('/contact-us'); setMenuOpen(false); }}>Contact us</button>
                    <button type="button" onClick={() => { navigate('/blog'); setMenuOpen(false); }}>Blog</button>
                    {showTransactionMenu && (
                      <button type="button" onClick={openTransactionHistory}>
                        Payment History
                      </button>
                    )}
                    <button type="button" onClick={handleMenuLogout}>
                      Logout
                    </button>
                  </div> 
                )}
              </>
            ) : (
              <>
                <ul className="nav-links">
                  <li onClick={() => navigate('/about-us')} style={{ cursor: "pointer" }}>About us</li>
                  <li onClick={() => navigate('/contact-us')} style={{ cursor: "pointer" }}>Contact us</li>
                  <li onClick={() => navigate('/blog')} style={{ cursor: "pointer" }}>Blog</li>
                  {showTransactionMenu && (
                    <li onClick={openTransactionHistory} style={{ cursor: "pointer" }}>
                      Payment History
                    </li>
                  )}
                </ul>
                <button className="signin-btn" onClick={handleAuthAction}>
                  Sign In/Up
                </button>
                {showMobileMenu && (
                  <button
                    type="button"
                    className="mobile-menu-lines-btn"
                    onClick={toggleMobileMenu}
                    aria-label="Open menu options"
                    title="Menu"
                  >
                    <span className="mobile-tx-lines" aria-hidden="true">
                      <span className="line line-1"></span>
                      <span className="line line-2"></span>
                      <span className="line line-3"></span>
                    </span>
                  </button>
                )}
                {showMobileMenu && menuOpen && (
                  <div className="premium-dropdown">
                    <button type="button" onClick={() => { navigate('/about-us'); setMenuOpen(false); }}>About us</button>
                    <button type="button" onClick={() => { navigate('/contact-us'); setMenuOpen(false); }}>Contact us</button>
                    <button type="button" onClick={() => { navigate('/blog'); setMenuOpen(false); }}>Blog</button>
                    <button type="button" onClick={handleAuthAction}>
                      Sign In/Up
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
