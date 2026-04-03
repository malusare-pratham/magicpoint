import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, QrCode, CreditCard, CheckCircle2, Users, ArrowRight } from 'lucide-react';
import './Signup.css';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
const FORCE_FREE_MEMBERSHIP = true;

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
    const [membershipPlans, setMembershipPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [plansError, setPlansError] = useState('');
    const [activePlanId, setActivePlanId] = useState('');
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
        if (FORCE_FREE_MEMBERSHIP) {
            setPlansLoading(false);
            setMembershipPlans([]);
            return;
        }
        let isMounted = true;
        const loadPlans = async () => {
            try {
                setPlansLoading(true);
                setPlansError('');
                const res = await axios.get(`${API_BASE_URL}/api/memberships`, { timeout: 10000 });
                const list = Array.isArray(res?.data?.data) ? res.data.data : [];
                const normalized = list
                    .map((plan) => ({
                        id: plan._id,
                        title: String(plan.title || '').trim(),
                        price: Number(plan.price || 0),
                        billingCycle: String(plan.billingCycle || '').trim(),
                        durationHours: Number(plan.durationHours || 48),
                        features: Array.isArray(plan.features) ? plan.features : [],
                        badge: String(plan.badge || '').trim(),
                        ctaText: String(plan.ctaText || '').trim(),
                        sortOrder: Number(plan.sortOrder || 0),
                        isActive: plan.isActive !== false
                    }))
                    .filter((plan) => plan.title)
                    .sort((a, b) => a.sortOrder - b.sortOrder);

                if (!isMounted) return;
                setMembershipPlans(normalized);
                if (!activePlanId && normalized.length) {
                    setActivePlanId('');
                }
            } catch (_error) {
                if (isMounted) {
                    setPlansError('Unable to load membership plans right now.');
                    setMembershipPlans([]);
                }
            } finally {
                if (isMounted) setPlansLoading(false);
            }
        };

        loadPlans();
        return () => {
            isMounted = false;
        };
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

        const hasPlans = !FORCE_FREE_MEMBERSHIP && membershipPlans.length > 0;
        if (hasPlans && !activePlanId) {
            setErrorMessage('Please select a membership plan first.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setErrorMessage('Password and confirm password do not match.');
            return;
        }

        const selectedPlan = membershipPlans.find((plan) => plan.id === activePlanId);
        if (hasPlans && !selectedPlan) {
            setErrorMessage('Selected membership plan is unavailable. Please try again.');
            return;
        }

        const payload = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            mobile: formData.mobile.trim(),
            password: formData.password,
            membershipPlan: hasPlans ? selectedPlan.title : 'Free Plan'
        };

        setIsSubmitting(true);
        try {
            if (!hasPlans) {
                const registerResponse = await axios.post(`${API_BASE_URL}/api/auth/signup`, payload, { timeout: 15000 });
                localStorage.setItem('authToken', registerResponse.data.token);
                localStorage.setItem('authUser', JSON.stringify(registerResponse.data.user));
                setStatusMessage('Registration completed successfully.');
                navigate('/DashboardPage', { replace: true });
                return;
            }

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
                    color: selectedPlan.title.toLowerCase().includes('family') ? '#22c55e' : '#3b82f6'
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
        if (!activePlanId || !registrationRef.current) return;

        registrationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightRegistration(true);

        const timer = setTimeout(() => {
            setHighlightRegistration(false);
        }, 1600);

        return () => clearTimeout(timer);
    }, [activePlanId]);

    const handlePlanSelect = (planId) => {
        setActivePlanId(planId);
        setTimeout(() => {
            if (!registrationRef.current) return;
            registrationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setHighlightRegistration(true);
            const timer = setTimeout(() => {
                setHighlightRegistration(false);
            }, 1600);
            return () => clearTimeout(timer);
        }, 0);
    };

    const selectedPlan = membershipPlans.find((plan) => plan.id === activePlanId);
    const hasPlans = !FORCE_FREE_MEMBERSHIP && membershipPlans.length > 0;
    const getPlanTone = (plan, index) => {
        const title = String(plan?.title || '').toLowerCase();
        if (title.includes('family')) return { tone: 'green', icon: Users, badgeClass: 'green-badge', selectedClass: 'selected-family', visualClass: 'family-bg', buttonClass: 'green-btn' };
        if (title.includes('single')) return { tone: 'blue', icon: User, badgeClass: '', selectedClass: 'selected-single', visualClass: 'single-bg', buttonClass: 'blue-btn' };
        const fallback = index % 2 === 0 ? 'blue' : 'green';
        return {
            tone: fallback,
            icon: fallback === 'green' ? Users : User,
            badgeClass: fallback === 'green' ? 'green-badge' : '',
            selectedClass: fallback === 'green' ? 'selected-family' : 'selected-single',
            visualClass: fallback === 'green' ? 'family-bg' : 'single-bg',
            buttonClass: fallback === 'green' ? 'green-btn' : 'blue-btn'
        };
    };

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
                    <h2>Create Your Free Account</h2>
                    <p>Sign up to unlock 500+ partner discounts</p>
                </div>

                {/* Plans Section (Same as before — untouched) */}
                {hasPlans && (
                <div className={`plans-display-container ${membershipPlans.length === 1 ? 'single-plan-center' : ''}`}>
                    {plansLoading ? (
                        <p>Loading membership plans...</p>
                    ) : plansError ? (
                        <p style={{ color: '#dc2626' }}>{plansError}</p>
                    ) : membershipPlans.length === 0 ? (
                        <p>No active membership plans available.</p>
                    ) : (
                        membershipPlans.map((plan, index) => {
                            const tone = getPlanTone(plan, index);
                            const Icon = tone.icon;
                            const isSelected = plan.id === activePlanId;
                            const cycleLabel = plan.billingCycle ? `/${plan.billingCycle}` : '';
                            const badgeText = plan.badge || '';
                            const buttonText = plan.ctaText || `Select ${plan.title}`;
                            return (
                                <div
                                    key={plan.id}
                                    ref={index === 0 ? singlePlanRef : null}
                                    tabIndex={-1}
                                    className={`premium-plan-card ${isSelected ? tone.selectedClass : ''} ${!activePlanId ? 'default-point-out' : ''}`}
                                    onClick={() => handlePlanSelect(plan.id)}
                                >
                                    {badgeText ? (
                                        <div className={`plan-badge-top ${tone.badgeClass}`}>{badgeText}</div>
                                    ) : null}
                                    <div className={`plan-visual ${tone.visualClass}`}>
                                        <Icon size={30} />
                                    </div>
                                    <h3>{plan.title}</h3>
                                    <div className="plan-cost">₹{plan.price}<span>{cycleLabel}</span></div>

                                    <ul className="plan-features">
                                        {plan.features.map((feature, idx) => (
                                            <li key={`${plan.id}-feature-${idx}`}>
                                                <CheckCircle2 size={16}/> {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <button className={`select-plan-btn ${tone.buttonClass}`} onClick={() => handlePlanSelect(plan.id)}>
                                        {isSelected ? 'Selected' : buttonText}
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
                )}

                {/* Registration Form */}
                {!plansLoading && (!hasPlans || (activePlanId && selectedPlan)) && (
                    <div
                        ref={registrationRef}
                        className={`registration-section-fade-in ${highlightRegistration ? 'registration-point-out' : ''}`}
                    >
                        <div className="section-divider">
                            <span>Register for Tripspotgo</span>
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
                            {hasPlans && (
                            <div className={`payment-info-box ${selectedPlan.title.toLowerCase().includes('family') ? 'green-soft' : 'blue-soft'}`}>
                                <p className="pay-tag">Secure UPI Payment</p>
                                <div className="qr-wrapper">
                                    <QrCode size={120} color={selectedPlan.title.toLowerCase().includes('family') ? '#22c55e' : '#3b82f6'} />
                                    <p className="pay-amount">Pay ₹{selectedPlan.price}</p>
                                </div>
                                <div className="payment-icons">
                                    <CreditCard size={18}/> Trusted Payment Gateways
                                </div>
                            </div>
                            )}

                            {errorMessage && <p style={{ color: '#dc2626', marginTop: '10px' }}>{errorMessage}</p>}
                            {statusMessage && <p style={{ color: '#059669', marginTop: '10px' }}>{statusMessage}</p>}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`final-submit-btn ${hasPlans && selectedPlan.title.toLowerCase().includes('family') ? 'bg-green' : 'bg-blue'}`}
                            >
                                {isSubmitting
                                    ? (hasPlans ? 'Processing Payment...' : 'Submitting...')
                                    : (hasPlans ? 'Complete Registration & Pay' : 'Complete Registration')}
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

