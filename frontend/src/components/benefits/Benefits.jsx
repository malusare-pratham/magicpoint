import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Benefits.css';
import { BadgePercent, ShieldCheck, CalendarDays, Users2 } from 'lucide-react'; 

const Benefits = () => {
    const navigate = useNavigate();
    const benefitsData = [
        {
            id: 1,
            title: "Guaranteed 10% Off",
            desc: "On every partner bill.",
            icon: <BadgePercent size={24} strokeWidth={2.5} />,
            colorClass: "bg-green"
        },
        {
            id: 2,
            title: "Secure OTP",
            desc: "Safe bill verification.",
            icon: <ShieldCheck size={24} strokeWidth={2.5} />,
            colorClass: "bg-blue"
        },
        {
            id: 3,
            title: "Valid 2 Days",
            desc: "Unlimited weekend usage.",
            icon: <CalendarDays size={24} strokeWidth={2.5} />,
            colorClass: "bg-yellow"
        },
        {
            id: 4,
            title: "Family Access",
            desc: "Share with your group.",
            icon: <Users2 size={24} strokeWidth={2.5} />,
            colorClass: "bg-purple"
        }
    ];

    const goToLogin = () => navigate('/login');

    return (
        <section className="benefits-container">
            <h2 className="benefits-title">Membership Benefits</h2>
            <div className="benefits-grid">
                {benefitsData.map((item) => (
                    <div className="benefit-card" key={item.id} onClick={goToLogin}>
                        <div className={`benefit-icon-box ${item.colorClass}`}>
                            {item.icon}
                        </div>
                        <div className="benefit-info">
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Benefits;
