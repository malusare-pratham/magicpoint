import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Hero.css";

const CITY_OPTIONS = [
  { label: "Panchgani", value: "Panchgani", lat: 17.9237, lng: 73.8007 },
  { label: "Mahabaleshwar", value: "Mahabaleshwar", lat: 17.9237, lng: 73.6586 },
];
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY || "";

const toRad = (value) => (Number(value) * Math.PI) / 180;
const haversineKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const pickLocationLabel = (entry) => {
  if (!entry) return "";
  const city =
    entry.city ||
    entry.town ||
    entry.village ||
    entry.suburb ||
    entry.district ||
    entry.county;
  const state = entry.state || entry.region;
  if (city && state && city !== state) return `${city}, ${state}`;
  return city || state || entry.country || "";
};

function Hero() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  useEffect(() => {
    const savedCity = localStorage.getItem("tsg_selected_city");
    const savedUseGps = localStorage.getItem("tsg_use_gps");
    const savedCoords = localStorage.getItem("tsg_user_coords");
    if (savedCity) {
      setSelectedCity(savedCity);
      setLocationQuery(savedCity);
    }
    if (savedUseGps === "true" && savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords);
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          if (!GEOAPIFY_KEY) {
            setLocationQuery("Current location");
          } else {
            const fetchSaved = async () => {
              try {
                const res = await fetch(
                  `https://api.geoapify.com/v1/geocode/reverse?lat=${parsed.lat}&lon=${parsed.lng}&format=json&apiKey=${GEOAPIFY_KEY}`
                );
                const data = await res.json();
                const label = pickLocationLabel(data?.results?.[0]);
                if (label) setLocationQuery(label);
              } catch (_error) {
                setLocationQuery("Current location");
              }
            };
            fetchSaved();
          }
        }
      } catch (_error) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth <= 600);
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
      if (mobileDropdownRef.current && mobileDropdownRef.current.contains(event.target)) return;
      setLocationOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCityChange = (value) => {
    setSelectedCity(value);
    setLocationQuery(value);
    localStorage.setItem("tsg_selected_city", value);
    localStorage.setItem("tsg_use_gps", "false");
    const match = CITY_OPTIONS.find((city) => city.value === value);
    if (match) {
      const coords = { lat: match.lat, lng: match.lng };
      localStorage.setItem("tsg_user_coords", JSON.stringify(coords));
      window.dispatchEvent(
        new CustomEvent("tsg-location-change", { detail: { city: value, coords, useGps: false } })
      );
    }
    setLocationOpen(false);
    setLocationError("");
  };

  const handleAutoDetect = () => {
    if (!navigator?.geolocation) {
      setLocationError("Location not supported on this device.");
      return;
    }
    setLocating(true);
    setLocationError("");
    if (!GEOAPIFY_KEY) {
      setLocationError("Missing Geoapify API key.");
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocationError("Unable to detect location.");
          setLocating(false);
          return;
        }
        const current = { lat: latitude, lng: longitude };
        const ranked = CITY_OPTIONS.map((city) => ({
          ...city,
          distance: haversineKm(current, city),
        })).sort((a, b) => a.distance - b.distance);
        const nearest = ranked[0];

        const updateLocationLabel = async () => {
          if (!GEOAPIFY_KEY) return;
          try {
            const res = await fetch(
              `https://api.geoapify.com/v1/geocode/reverse?lat=${current.lat}&lon=${current.lng}&format=json&apiKey=${GEOAPIFY_KEY}`
            );
            const data = await res.json();
            const label = pickLocationLabel(data?.results?.[0]);
            if (label) setLocationQuery(label);
          } catch (_error) {
            // fallback handled below
          }
        };

        if (nearest && nearest.distance <= 80) {
          localStorage.setItem("tsg_use_gps", "true");
          const coords = { lat: current.lat, lng: current.lng };
          localStorage.setItem("tsg_user_coords", JSON.stringify(coords));
          setSelectedCity(nearest.value);
          setLocationQuery(nearest.value);
          localStorage.setItem("tsg_selected_city", nearest.value);
          window.dispatchEvent(
            new CustomEvent("tsg-location-change", { detail: { city: nearest.value, coords, useGps: true } })
          );
          setLocationOpen(false);
        } else {
          localStorage.setItem("tsg_use_gps", "true");
          const coords = { lat: current.lat, lng: current.lng };
          localStorage.setItem("tsg_user_coords", JSON.stringify(coords));
          window.dispatchEvent(
            new CustomEvent("tsg-location-change", { detail: { coords, useGps: true } })
          );
          setLocationQuery("Current location");
          setLocationError("Out of service area. Please select manually.");
        }
        updateLocationLabel();
        setLocating(false);
      },
      () => {
        setLocationError("Location permission denied.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  };

  const handleSearch = () => {
    const query = String(searchQuery || '').trim();
    navigate(`/restaurant-list${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  };

  const locationPanel = (
    <div className={`hero-location-panel ${isMobile ? "hero-location-panel--mobile" : ""}`}>
      <button
        type="button"
        className="hero-detect-btn"
        onClick={handleAutoDetect}
        disabled={locating}
      >
        {locating ? "Detecting..." : "Auto-detect current location"}
      </button>
      <div className="hero-location-label">POPULAR LOCALITIES</div>
      <div className="hero-location-list">
        {CITY_OPTIONS.filter((city) =>
          String(city.label).toLowerCase().includes(
            (locationQuery.trim().toLowerCase() === "current location" ? "" : locationQuery.trim().toLowerCase())
          )
        ).map((city) => (
          <button
            type="button"
            key={city.value}
            className="hero-location-item"
            onClick={() => handleCityChange(city.value)}
          >
            {city.label}
          </button>
        ))}
        {CITY_OPTIONS.filter((city) =>
          String(city.label).toLowerCase().includes(
            (locationQuery.trim().toLowerCase() === "current location" ? "" : locationQuery.trim().toLowerCase())
          )
        ).length === 0 && (
          <div className="hero-location-empty">No locations found</div>
        )}
      </div>
      {locationError && <div className="hero-location-error">{locationError}</div>}
    </div>
  );

  return (
    <section className="magic-hero">
      <div className="hero-svg-bg"></div>
      
      <div className="hero-inner">
        <div className="hero-mobile-location" ref={mobileDropdownRef}>
          <i className="fa-solid fa-location-dot hero-mobile-location-icon" aria-hidden="true"></i>
          <button
            type="button"
            className="hero-mobile-location-trigger"
            onClick={() => setLocationOpen((prev) => !prev)}
          >
            {locationQuery || selectedCity || "Select Location"}
          </button>
          {isMobile && locationOpen && locationPanel}
        </div>
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
            
          </div>
          
        </div>

        <div className="search-wrapper">
          <form
            className="single-search-bar hero-search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            <div className="hero-location-select" ref={dropdownRef}>
              <i className="fa-solid fa-location-dot hero-location-icon" aria-hidden="true"></i>
              <input
                type="text"
                className="hero-location-input"
                placeholder="Search Location"
                value={locationQuery}
                onFocus={() => setLocationOpen(true)}
                onChange={(e) => {
                  setLocationQuery(e.target.value);
                  setLocationOpen(true);
                }}
              />
              <span className={`hero-location-caret ${locationOpen ? "open" : ""}`} aria-hidden="true"></span>
              {!isMobile && locationOpen && locationPanel}
            </div>
            <span className="hero-search-divider"></span>
            <i className="fa-solid fa-magnifying-glass search-icon-fa"></i>
            <input
              type="text"
              placeholder="Search for places, cuisines, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <button className="get-deals-btn" type="submit">
              Get Deals
            </button>
          </form>
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




