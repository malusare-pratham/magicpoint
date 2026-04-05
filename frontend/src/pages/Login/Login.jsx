import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, LogIn, ArrowRight, ArrowLeft, ChevronLeft, Phone, Eye, EyeOff } from 'lucide-react';
import './Login.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isForgot, setIsForgot] = useState(false);
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    
    const [formData, setFormData] = useState(() => {
        const fromState = location?.state?.mobile;
        const fromStorage = localStorage.getItem('pendingSignupMobile');
        const mobile = fromState || fromStorage || '';
        
        if (mobile) {
            localStorage.removeItem('pendingSignupMobile');
            return { mobile, password: '' };
        }
        return { mobile: '', password: '' };
    });
    const [errorMessage, setErrorMessage] = useState('');
    const redirectTo = location?.state?.redirectTo;
    const redirectState = location?.state?.redirectState;

    useEffect(() => {
        if (!API_BASE_URL) return;
        axios.get(`${API_BASE_URL}/health`, { timeout: 5000 }).catch(() => {});
    }, []);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        const mobile = formData.mobile.trim();
        if (!mobile || !formData.password) {
            setErrorMessage('Please enter mobile number and password.');
            return;
        }

        const payload = { mobile, password: formData.password };

        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, payload);
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('authUser', JSON.stringify(response.data.user));
            if (redirectTo) {
                navigate(redirectTo, { state: redirectState, replace: true });
            } else {
                navigate('/DashboardPage');
            }
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                (error?.request
                    ? `Unable to reach server (${API_BASE_URL}). Check Render deployment, CORS_ORIGINS, and VITE_API_BASE_URL.`
                    : 'Login failed. Please check credentials.');
            setErrorMessage(message);
        }
    };

    return (
        <div className="lgn-page-container">
            <button className="lgn-back-home-btn" onClick={() => navigate('/')}>
                <ChevronLeft size={20} />
                <span>Back to Home</span>
            </button>

            <div className="lgn-glass-card">
                <div className="lgn-header-section">
                    <div className="lgn-brand-logo">Trip<span>spot</span></div>
                    {!isForgot ? (
                        <p className="lgn-subtitle">Login to access your premium dashboard</p>
                    ) : (
                        <h2 className="lgn-title-purple">{step === 1 ? 'Reset Password' : 'New Password'}</h2>
                    )}
                </div>

                {!isForgot ? (
                    <form className="lgn-custom-form" onSubmit={handleLogin}>
                        <div className="lgn-input-wrapper">
                            <Phone className="lgn-field-icon" size={18} />
                            <input
                                type="number"
                                name="mobile"
                                className="lgn-main-input"
                                placeholder="Mobile Number"
                                value={formData.mobile}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="lgn-input-wrapper">
                            <Lock className="lgn-field-icon" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="lgn-main-input"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="lgn-toggle-visibility"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errorMessage && <p style={{ color: '#dc2626' }}>{errorMessage}</p>}
                        <div className="lgn-options">
                            <label className="lgn-checkbox-container">
                                <input type="checkbox" className="lgn-remember-checkbox" defaultChecked /> Remember me
                            </label>
                            <span className="lgn-forgot-link" onClick={() => setIsForgot(true)}>Forgot Password?</span>
                        </div>
                        <button type="submit" className="lgn-submit-btn">
                            <span>Login to Account</span>
                            <LogIn size={20} />
                        </button>
                    </form>
                ) : (
                    <div className="lgn-forgot-flow">
                        {step === 1 ? (
                            <div className="lgn-custom-form">
                                <div className="lgn-input-wrapper">
                                    <Phone className="lgn-field-icon" size={18} />
                                    <input type="number" className="lgn-main-input" placeholder="Registered Mobile" required />
                                </div>
                                <button type="button" className="lgn-submit-btn" onClick={() => setStep(2)}>
                                    Next Step <ArrowRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="lgn-custom-form">
                                <div className="lgn-input-wrapper">
                                    <Lock className="lgn-field-icon" size={18} />
                                    <input type="password" className="lgn-main-input" placeholder="New Password" required />
                                </div>
                                <div className="lgn-input-wrapper">
                                    <Lock className="lgn-field-icon" size={18} />
                                    <input type="password" className="lgn-main-input" placeholder="Confirm Password" required />
                                </div>
                                <button type="submit" className="lgn-submit-btn">Update Password</button>
                            </div>
                        )}
                        <div className="lgn-back-btn" onClick={() => { setIsForgot(false); setStep(1); }}>
                            <ArrowLeft size={16} /> Back to Login
                        </div>
                    </div>
                )}

                <div className="lgn-footer-area">
                    <p>Not a member yet? <a href="/signup" className="lgn-signup-link">Sign Up & Save <ArrowRight size={14} /></a></p>
                </div>
            </div>
        </div>
    );
}

export default Login;

