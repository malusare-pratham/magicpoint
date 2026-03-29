import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Categories.css';
import { Hotel, Utensils, Zap, ShoppingBag } from 'lucide-react'; 

const Categories = () => {
    const navigate = useNavigate();
    const categoriesData = [
        {
            id: 1,
            title: "Food & Dining",
            partners: "200+ Partners",
            icon: <Utensils size={30} strokeWidth={2.5} />,
            colorClass: "cat-green"
        },
        {
            id: 2,
            title: "Local Stores & Gift House",
            partners: "100+ Partners",
            icon: <ShoppingBag size={30} strokeWidth={2.5} />,
            colorClass: "cat-purple"
        },
        {
            id: 3,
            title: "Activities & Adventure",
            partners: "80+ Partners",
            icon: <Zap size={30} strokeWidth={2.5} />,
            colorClass: "cat-orange"
        },
        {
            id: 4,
            title: "Stay & Hotels",
            partners: "120+ Partners",
            icon: <Hotel size={30} strokeWidth={2.5} />,
            colorClass: "cat-blue"
        }
    ];

    return (
        <section className="categories-container">
            <h2 className="categories-title">Discount Categories</h2>
            <div className="categories-grid">
                {categoriesData.map((cat) => (
                    <div className={`category-card ${cat.colorClass}`} key={cat.id} onClick={() => navigate('/signup')}>
                        <div className="cat-icon-wrapper">
                            {cat.icon}
                        </div>
                        <h3>{cat.title}</h3>
                        <p>{cat.partners}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Categories;
