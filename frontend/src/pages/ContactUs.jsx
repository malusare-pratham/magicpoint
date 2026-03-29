import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import './ContactUs.css';

const ContactUs = () => {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem('authToken'));
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/');
  };

  useEffect(() => {
    document.title = "Contact Us | Tripspotgo Customer Support";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Contact Tripspotgo customer support. We are here to help you with your memberships, billing issues, and partner inquiries.";

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = "Contact Tripspotgo, Tripspotgo help, customer support Tripspotgo, tripspotgo email, tripspotgo phone number";
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => setSubmitted(true), 1000);
  };

  return (
    <div className="pg-root-combined">
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <div className="seo-page-container pt-20 pb-16">
        <header className="seo-header text-center py-12">
          <h1 className="text-4xl font-bold text-gray-800">Get in Touch</h1>
          <p className="mt-4 text-gray-600 max-w-xl mx-auto text-lg">
            Have questions about your membership or want to partner with us? We'd love to hear from you.
          </p>
        </header>

        <div className="contact-wrapper max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="contact-info-card bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
            <p className="mb-10 text-blue-100 line-height-relaxed">
              Fill up the form and our team will get back to you within 24 hours. We are dedicated to providing the best support.
            </p>
            
            <div className="info-row flex items-center mb-8">
              <Phone className="mr-4 text-blue-200" size={24} />
              <span className="text-lg">+91 98765 43210</span>
            </div>
            <div className="info-row flex items-center mb-8">
              <Mail className="mr-4 text-blue-200" size={24} />
              <span className="text-lg">support@tripspotgo.com</span>
            </div>
            <div className="info-row flex items-center">
              <MapPin className="mr-4 text-blue-200" size={24} />
              <span className="text-lg">Tripspotgo HQ, Main Street, Panchgani, Maharashtra 412805</span>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            {submitted ? (
              <div className="success-state text-center py-16">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Message Sent!</h3>
                <p className="text-gray-600">Thank you for contacting Tripspotgo. We will respond shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="form-group flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                  />
                </div>
                <div className="form-group flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                  />
                </div>
                <div className="form-group flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-2">Your Message</label>
                  <textarea 
                    className="form-input px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                    placeholder="How can we help you?"
                    required
                    value={formState.message}
                    onChange={(e) => setFormState({...formState, message: e.target.value})}
                  ></textarea>
                </div>
                <button type="submit" className="submit-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors mt-2">
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactUs;
