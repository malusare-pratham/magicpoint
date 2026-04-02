import React from "react";
import "./Hero.css";

function Hero({ showMembershipBox = false, validUntilLabel = "", remainingTime = "" }) {
  return (
    <section className="magic-hero">
      <div className="hero-svg-bg"></div>
      
      <div className="hero-inner">
        <div className="text-content">
          <div className="limited-offer-tag">
             <i className="fa-solid fa-fire"></i> LIMITED TIME OFFER
          </div>
          <h1 className="hero-title">
            Explore <span className="city-name">Panchgani & Mahabaleshwar</span>
          </h1>
          
                              <div className="offer-highlight-box">
            <div className="discount-main">
              GET FLAT <span className="big-percent">10%</span> OFF
            </div>
            <p className="offer-sub">ON HOTELS • FOOD • ACTIVITIES • SHOPS</p>
            {showMembershipBox && (
              <div className="hero-membership-footer hero-membership-footer--inside">
                <div className="hero-footer-info">
                  <i className="fa-regular fa-calendar-check"></i> VALID UNTIL {validUntilLabel || "Not Available"}
                </div>
                <div className="hero-timer-box">
                  <i className="fa-solid fa-clock"></i> REMAINING: {remainingTime || "00hr-00m-00s"}
                </div>
              </div>
            )}
          </div>
          {showMembershipBox && (
            <div className="hero-membership-footer hero-membership-footer--outside">
              <div className="hero-footer-info">
                <i className="fa-regular fa-calendar-check"></i> VALID UNTIL {validUntilLabel || "Not Available"}
              </div>
              <div className="hero-timer-box">
                <i className="fa-solid fa-clock"></i> REMAINING: {remainingTime || "00hr-00m-00s"}
              </div>
            </div>
          )}
        </div>

        <div className="search-wrapper">
          <div className="single-search-bar">
            <i className="fa-solid fa-magnifying-glass search-icon-fa"></i>
            <input type="text" placeholder="Search for hotels, food..." />
            <button className="get-deals-btn">Get Deals</button>
          </div>
        </div>

        <div className="hero-stats">
            <span><i className="fa-solid fa-check-double"></i> 500+ Local Partners</span>
            <span><i className="fa-solid fa-lock"></i> 100% Secure OTP</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;


