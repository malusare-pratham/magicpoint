import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { ChevronRight, Calendar, User } from 'lucide-react';
import './Blog.css';

const Blog = () => {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem('authToken'));

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/');
  };

  useEffect(() => {
    document.title = "Tripspotgo Blog | Travel Tips & Top Deals";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Read the Tripspotgo blog for the latest travel tips, restaurant reviews, hidden gems in Maharashtra, and maximizing your savings.";

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = "Tripspotgo blog, travel guide, panchgani travel tips, mahabaleshwar sightseeing, food reviews, local deals blog";
  }, []);

  const blogPosts = [
    {
      id: 1,
      title: "10 Must-Visit Cafes in Mahabaleshwar for 2024",
      excerpt: "Discover the coziest cafes with breathtaking valley views. Plus, learn how to get 20% off your bill with Tripspotgo.",
      date: "Oct 12, 2024",
      author: "Priya Sharma",
      category: "Food & Dining",
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 2,
      title: "How to Maximize Your Weekend Trip Savings",
      excerpt: "Traveling on a budget doesn't mean compromising on quality. Here is our insider guide to using the Tripspotgo membership optimally.",
      date: "Oct 05, 2024",
      author: "Rahul Verma",
      category: "Travel Hacks",
      image: "https://images.unsplash.com/photo-1526772662000-2f88f1feb01c?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 3,
      title: "Top Adventure Activities in Panchgani",
      excerpt: "From paragliding to go-karting, explore the adrenaline rush in Panchgani at half the regular price.",
      date: "Sep 28, 2024",
      author: "Amit Patel",
      category: "Activities",
      image: "https://images.unsplash.com/photo-1533587851505-d119e1319b7f?auto=format&fit=crop&w=600&q=80"
    }
  ];

  return (
    <div className="pg-root-combined bg-gray-50">
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <div className="seo-page-container pt-20 pb-16">
        <header className="seo-header text-center py-16 bg-white border-b border-gray-200">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Tripspotgo <span className="text-blue-600">Blog</span></h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your daily dose of travel inspiration, food reviews, and smart savings strategies.
          </p>
        </header>

        <div className="blog-grid max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map(post => (
            <article key={post.id} className="blog-card bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow flex flex-col border border-gray-100">
              <div className="blog-image-wrapper h-56 overflow-hidden relative">
                <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                  {post.category}
                </div>
                <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
              </div>
              <div className="blog-content p-6 flex flex-col flex-grow">
                <div className="blog-meta flex items-center text-sm text-gray-500 mb-3 gap-4">
                  <span className="flex items-center"><Calendar size={14} className="mr-1" /> {post.date}</span>
                  <span className="flex items-center"><User size={14} className="mr-1" /> {post.author}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-3 leading-tight">{post.title}</h2>
                <p className="text-gray-600 mb-6 flex-grow">{post.excerpt}</p>
                <button className="read-more-btn flex items-center text-blue-600 font-semibold hover:text-blue-800 transition-colors mt-auto">
                  Read Article <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </article>
          ))}
        </div>
        
        <div className="newsletter-section max-w-4xl mx-auto mt-8 bg-blue-50 rounded-2xl p-8 md:p-12 text-center border border-blue-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Subscribe to our Newsletter</h3>
          <p className="text-gray-600 mb-6">Get the latest local deals and travel guides delivered straight to your inbox.</p>
          <form className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email address" className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" required />
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Blog;
