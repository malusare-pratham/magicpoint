import React, { useEffect, useState } from "react";
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
    if (!token) return;

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
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    navigate("/");
  };

  const isAuthenticated = Boolean(localStorage.getItem("authToken"));

  return (
    <div className="pg-root-combined">
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <Hero />
      <MainPageContent/>
      <Footer/>
    </div>
  );
};

export default DashboardPage;

//old



