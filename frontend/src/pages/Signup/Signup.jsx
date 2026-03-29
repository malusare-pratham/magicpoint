import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, QrCode, CreditCard, CheckCircle2, Users, ArrowRight } from 'lucide-react';
import './Signup.css';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

const loadRazorpayCheckoutScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const postWithFallback = async (primaryUrl, fallbackUrl, payload, options) => {
    try {
        return await axios.post(primaryUrl, payload, options);
    } catch (error) {
        if (error?.response?.status === 404 && fallbackUrl) {
            return axios.post(fallbackUrl, payload, options);
        }
        throw error;
    }
};

const getApiErrorMessage = (error, fallbackMessage, apiBaseUrl) => {
    if (error?.response?.status === 401) {
        return 'Payment authentication failed. Please verify Razorpay keys on Render (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) and redeploy backend.';
    }

    return error?.response?.data?.message ||
        (error?.request
            ? `Unable to reach server (${apiBaseUrl}). Check Render deployment, CORS_ORIGINS, and VITE_API_BASE_URL.`
            : fallbackMessage);
};

function Signup() {
    const navigate = useNavigate();
    const singlePlanRef = useRef(null);
    const [activePlan, setActivePlan] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', email: '', mobile: '', password: '', confirmPassword: '' 
    });
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [highlightRegistration, setHighlightRegistration] = useState(false);
    const registrationRef = useRef(null);

    useEffect(() => {
        // Warm up backend on page open to reduce first submit latency (Render cold start).
        axios.get(`${API_BASE_URL}/health`, { timeout: 8000 }).catch(() => {});
    }, []);

    useEffect(() => {
        singlePlanRef.current?.focus();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBack = () => {
        window.history.back();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setStatusMessage('');

        if (!activePlan) {
            setErrorMessage('Please select a membership plan first.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setErrorMessage('Password and confirm password do not match.');
            return;
        }

        const payload = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            mobile: formData.mobile.trim(),
            password: formData.password,
            membershipPlan: activePlan === 'single' ? 'Single Plan' : 'Family Plan'
        };

        setIsSubmitting(true);
        try {
            const orderResponse = await postWithFallback(
                `${API_BASE_URL}/api/auth/signup/create-order`,
                `${API_BASE_URL}/api/auth/create-order`,
                payload,
                { timeout: 15000 }
            );

            const order = orderResponse?.data?.order;
            const keyId = orderResponse?.data?.keyId || RAZORPAY_KEY_ID;

            if (!order?.id || !keyId) {
                setErrorMessage('Unable to initialize payment. Please try again.');
                setIsSubmitting(false);
                return;
            }

            const isScriptLoaded = await loadRazorpayCheckoutScript();
            if (!isScriptLoaded || !window.Razorpay) {
                setErrorMessage('Payment SDK could not be loaded. Please try again.');
                setIsSubmitting(false);
                return;
            }

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'Tripspotgo',
                description: `${payload.membershipPlan} Membership`,
                order_id: order.id,
                prefill: {
                    name: payload.name,
                    email: payload.email,
                    contact: payload.mobile
                },
                notes: {
                    membershipPlan: payload.membershipPlan
                },
                handler: async (paymentResult) => {
                    try {
                        const verifyResponse = await postWithFallback(
                            `${API_BASE_URL}/api/auth/signup/verify-payment`,
                            `${API_BASE_URL}/api/auth/verify-payment`,
                            {
                                ...paymentResult,
                                registrationData: payload
                            },
                            { timeout: 15000 }
                        );

                        localStorage.setItem('authToken', verifyResponse.data.token);
                        localStorage.setItem('authUser', JSON.stringify(verifyResponse.data.user));
                        setStatusMessage('Registration and payment completed successfully.');
                        navigate('/DashboardPage', { replace: true });
                    } catch (verifyError) {
                        const verifyMessage = getApiErrorMessage(
                            verifyError,
                            'Payment verification failed. Please contact support.',
                            API_BASE_URL
                        );
                        setErrorMessage(verifyMessage);
                    } finally {
                        setIsSubmitting(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setErrorMessage('Payment was cancelled.');
                        setIsSubmitting(false);
                    }
                },
                theme: {
                    color: activePlan === 'single' ? '#3b82f6' : '#22c55e'
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', (event) => {
                const failedMessage = event?.error?.description || 'Payment failed. Please try again.';
                setErrorMessage(failedMessage);
                setIsSubmitting(false);
            });
            razorpay.open();
        } catch (error) {
            const message = getApiErrorMessage(error, 'Signup failed. Please try again.', API_BASE_URL);
            setErrorMessage(message);
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!activePlan || !registrationRef.current) return;

        registrationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightRegistration(true);

        const timer = setTimeout(() => {
            setHighlightRegistration(false);
        }, 1600);

        return () => clearTimeout(timer);
    }, [activePlan]);

    return (
        <div className="auth-wrapper signup-scope">
            <div className="signup-card-shell">
                {/* Back Button */}
                <button className="back-btn" onClick={handleBack}>← Back</button>

                <div className="auth-card signup-card">

                <div className="auth-header">
                    <div className="brand-logo">
                        Trip<span>spot</span>
                    </div>
                    <h2>Exclusive Membership</h2>
                    <p>Select a plan to unlock 500+ partner discounts</p>
                </div>

                {/* Plans Section (Same as before — untouched) */}
                <div className="plans-display-container">

                    {/* Single Plan */}
                    <div
                        ref={singlePlanRef}
                        tabIndex={-1}
                        className={`premium-plan-card ${activePlan === 'single' ? 'selected-single' : ''} ${!activePlan ? 'default-point-out' : ''}`}
                        onClick={() => setActivePlan('single')}
                    >
                        <div className="plan-badge-top">Popular</div>
                        <div className="plan-visual single-bg">
                            <User size={30} />
                        </div>
                        <h3>Single Plan</h3>
                        <div className="plan-cost">₹50<span>/2 day</span></div>

                        <ul className="plan-features">
                            <li><CheckCircle2 size={16}/> 10% discount at 500+ partners</li>
                            <li><CheckCircle2 size={16}/> Valid for 2 Days (48 Hours)</li>
                            <li><CheckCircle2 size={16}/> Unlimited redemptions</li>
                            <li><CheckCircle2 size={16}/> Secure OTP verification</li>
                            <li><CheckCircle2 size={16}/> Single user access</li>
                        </ul>

                        <button className="select-plan-btn blue-btn" onClick={() => setActivePlan('single')}>
                            {activePlan === 'single' ? 'Selected' : 'Select Single Plan'} 
                            <ArrowRight size={18} />
                        </button>
                    </div>

                    {/* Family Plan */}
                    <div
                        className={`premium-plan-card ${activePlan === 'family' ? 'selected-family' : ''} ${!activePlan ? 'default-point-out' : ''}`}
                        onClick={() => setActivePlan('family')}
                    >
                        <div className="plan-badge-top green-badge">Best Value</div>
                        <div className="plan-visual family-bg">
                            <Users size={30} />
                        </div>
                        <h3>Family Plan</h3>
                        <div className="plan-cost">₹99<span>/2 day</span></div>

                        <ul className="plan-features">
                            <li><CheckCircle2 size={16}/> 10% discount at 500+ partners</li>
                            <li><CheckCircle2 size={16}/> Valid for 2 Days (48 Hours)</li>
                            <li><CheckCircle2 size={16}/> Unlimited redemptions</li>
                            <li><CheckCircle2 size={16}/> Secure OTP verification</li>
                            <li><CheckCircle2 size={16}/> Up to 4 family members</li>
                            <li><CheckCircle2 size={16}/> Shared discount history</li>
                        </ul>

                        <button className="select-plan-btn green-btn" onClick={() => setActivePlan('family')}>
                            {activePlan === 'family' ? 'Selected' : 'Select Family Plan'} 
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Registration Form */}
                {activePlan && (
                    <div
                        ref={registrationRef}
                        className={`registration-section-fade-in ${highlightRegistration ? 'registration-point-out' : ''}`}
                    >
                        <div className="section-divider">
                            <span>Register for {activePlan === 'single' ? 'Single' : 'Family'} Membership</span>
                        </div>

                        <form className="auth-form" onSubmit={handleSubmit}>

                            <div className="input-group">
                                <User className="input-icon" size={20} />
                                <input type="text" name="name" placeholder="Full Name" required onChange={handleChange}/>
                            </div>

                            <div className="input-group">
                                <Mail className="input-icon" size={20} />
                                <input type="email" name="email" placeholder="Email Address" required onChange={handleChange}/>
                            </div>

                            <div className="input-group">
                                <Phone className="input-icon" size={20} />
                                <input type="number" name="mobile" placeholder="Mobile Number" required onChange={handleChange}/>
                            </div>

                            <div className="input-group">
                                <Lock className="input-icon" size={20} />
                                <input type="password" name="password" placeholder="Create Password" required onChange={handleChange}/>
                            </div>

                            {/* Confirm Password Added */}
                            <div className="input-group">
                                <Lock className="input-icon" size={20} />
                                <input type="password" name="confirmPassword" placeholder="Confirm Password" required onChange={handleChange}/>
                            </div>

                            {/* Payment Box */}
                            <div className={`payment-info-box ${activePlan === 'single' ? 'blue-soft' : 'green-soft'}`}>
                                <p className="pay-tag">Secure UPI Payment</p>
                                <div className="qr-wrapper">
                                    <QrCode size={120} color={activePlan === 'single' ? '#3b82f6' : '#22c55e'} />
                                    <p className="pay-amount">Pay ₹{activePlan === 'single' ? '50' : '99'}</p>
                                </div>
                                <div className="payment-icons">
                                    <CreditCard size={18}/> Trusted Payment Gateways
                                </div>
                            </div>

                            {errorMessage && <p style={{ color: '#dc2626', marginTop: '10px' }}>{errorMessage}</p>}
                            {statusMessage && <p style={{ color: '#059669', marginTop: '10px' }}>{statusMessage}</p>}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`final-submit-btn ${activePlan === 'single' ? 'bg-blue' : 'bg-green'}`}
                            >
                                {isSubmitting ? 'Processing Payment...' : 'Complete Registration & Pay'}
                            </button>
                        </form>
                    </div>
                )}

                    <p className="auth-footer">
                        Already a member? <a href="/login" className="signup-login-link">Login here</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Signup;

