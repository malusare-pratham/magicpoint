import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { ShieldCheck, Map, Tag } from 'lucide-react';
import './AboutUs.css';

const AboutUs = () => {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem('authToken'));

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/');
  };

  useEffect(() => {
    document.title = "About Us | Tripspotgo - Premium Deals & Savings";
    
    // Update or create Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Learn about Tripspotgo. We provide the best local deals on restaurants, hotels, and activities in Mahabaleshwar, Panchgani, and beyond.";

    // Update or create Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = "Tripspotgo, about tripspotgo, local deals, restaurant discounts, hotel savings, panchgani deals, mahabaleshwar offers";
  }, []);

  return (
    <div className="pg-root-combined">
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <div className="seo-page-container pt-20">
        <header className="seo-header text-center py-12">
          <h1 className="text-4xl font-bold text-gray-800">About Tripspotgo</h1>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-lg">
            Your ultimate membership for uncovering the best local deals, hidden gems, and massive savings across premier destinations.
          </p>
        </header>
        
        <section className="seo-content max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="seo-card text-center p-6 bg-white rounded-xl shadow-md border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="icon-wrapper bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Verified Partners</h3>
            <p className="text-gray-600">Every restaurant and hotel we partner with is fully verified to ensure you get authentic premium experiences.</p>
          </div>
          <div className="seo-card text-center p-6 bg-white rounded-xl shadow-md border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="icon-wrapper bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <Tag size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Unbeatable Discounts</h3>
            <p className="text-gray-600">Our members enjoy flat discounts ranging from 10% to 50% on food, stays, and activities instantly at the counter.</p>
          </div>
          <div className="seo-card text-center p-6 bg-white rounded-xl shadow-md border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="icon-wrapper bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
              <Map size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Curated Destinations</h3>
            <p className="text-gray-600">Currently active in tourist hotspots like Panchgani and Mahabaleshwar, continuously expanding to make your trips better.</p>
          </div>
        </section>

        <section className="seo-mission max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            At Tripspotgo, we believe that traveling and enjoying local cuisines shouldn't come with an exorbitant price tag. 
            We bridge the gap between enthusiastic travelers and high-quality local businesses. By subscribing to our premium 
            memberships, our users save thousands on their trips while local businesses get the love and footfall they deserve. 
            It's a win-win built on trust and technology.
          </p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default AboutUs;
