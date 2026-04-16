import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import api from '../../services/api';
const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("in the submit")
    // const validationErrors = validateForm();
    // if (Object.keys(validationErrors).length > 0) {
    //   setErrors(validationErrors);
    //   setLoading(false);
    //   return;
    // }

    try {
      const { name, email, password, userType } = formData;

      // 2. Create a clean payload object for the backend
      const payload = {
        name: name,
        email: email,
        password: password,
        // Map userType from the frontend state to 'role' expected by the backend
        role: userType
      };
      const response = await api.post("/auth/signup", payload);
      console.log(response);


      // Store user data
      // const userData = {
      //   name: formData.name,
      //   email: formData.email,
      //   userType: formData.userType,
      //   token: 'simulated_token'
      // };


      // localStorage.setItem('user', JSON.stringify(userData));
      // localStorage.setItem('auth_token', 'simulated_token');

      // Redirect based on user type
      navigate('/login');
      // if (formData.userType === 'student') {
      //   navigate('/student/dashboard');
      // } else {
      //   navigate('/educator/dashboard');
      // }

    } catch (error) {
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    console.log('Google register clicked');
    // Implement Google OAuth here
  };

  const createRipple = (e) => {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.7);
      transform: scale(0);
      animation: ripple 0.6s linear;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
    `;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-shine"></div>
          <div className="auth-particles">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
          </div>

          <div className="auth-card-content">
            <div className="auth-header">
              <div className="auth-logo">
                <div className="auth-logo-gradient">Q</div>
                <div className="auth-logo-text">
                  Quizzo<span>AI</span>
                </div>
              </div>

              <h1 className="auth-title">Create Account</h1>
              <p className="auth-subtitle">Start your journey with AI-powered quizzes</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className={`form-group ${errors.name ? 'input-error' : ''}`}>
                <label className="form-label">
                  <i className="fas fa-user"></i>
                  Full Name
                </label>
                <div className="form-input">
                  <i className="fas fa-user form-input-icon"></i>
                  <input
                    type="text"
                    name="name"
                    className="form-input-field"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                {errors.name && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.name}
                  </div>
                )}
              </div>

              <div className={`form-group ${errors.email ? 'input-error' : ''}`}>
                <label className="form-label">
                  <i className="fas fa-envelope"></i>
                  Email
                </label>
                <div className="form-input">
                  <i className="fas fa-envelope form-input-icon"></i>
                  <input
                    type="email"
                    name="email"
                    className="form-input-field"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                {errors.email && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.email}
                  </div>
                )}
              </div>

              <div className={`form-group ${errors.password ? 'input-error' : ''}`}>
                <label className="form-label">
                  <i className="fas fa-lock"></i>
                  Password
                </label>
                <div className="form-input">
                  <i className="fas fa-lock form-input-icon"></i>
                  <input
                    type="password"
                    name="password"
                    className="form-input-field"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                {errors.password && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.password}
                  </div>
                )}
              </div>

              <div className={`form-group ${errors.confirmPassword ? 'input-error' : ''}`}>
                <label className="form-label">
                  <i className="fas fa-lock"></i>
                  Confirm Password
                </label>
                <div className="form-input">
                  <i className="fas fa-lock form-input-icon"></i>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-input-field"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
                {errors.confirmPassword && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-user-tag"></i>
                  Account Type
                </label>
                <div className="user-type-selector">
                  <label className="user-type-option">
                    <input
                      type="radio"
                      name="userType"
                      value="student"
                      checked={formData.userType === 'student'}
                      onChange={handleChange}
                    />
                    <div className="user-type-content">
                      <span className="user-type-icon">🎓</span>
                      <span className="user-type-text">Student</span>
                    </div>
                  </label>

                  <label className="user-type-option">
                    <input
                      type="radio"
                      name="userType"
                      value="educator"
                      checked={formData.userType === 'educator'}
                      onChange={handleChange}
                    />
                    <div className="user-type-content">
                      <span className="user-type-icon">👨‍🏫</span>
                      <span className="user-type-text">Educator</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className={`terms-checkbox ${errors.terms ? 'input-error' : ''}`}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                />
                <label htmlFor="terms" className="terms-text">
                  I agree to the{' '}
                  <Link to="/terms">Terms</Link> &{' '}
                  <Link to="/privacy">Privacy</Link>
                </label>
                {errors.terms && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.terms}
                  </div>
                )}
              </div>

              {errors.general && (
                <div className="form-error" style={{ marginTop: '8px' }}>
                  <i className="fas fa-exclamation-triangle"></i>
                  {errors.general}
                </div>
              )}

              <div className="auth-buttons">
                <button
                  type="submit"
                  className="btn-auth btn-auth-primary"
                  onClick={createRipple}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-plus"></i>
                      Sign Up
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-auth btn-auth-secondary"
                  onClick={handleGoogleRegister}
                  onMouseDown={createRipple}
                >
                  <i className="fab fa-google btn-auth-icon"></i>
                  Google
                </button>
              </div>
            </form>

            <div className="auth-divider">
              <span className="auth-divider-text">Already have an account?</span>
            </div>

            <div className="auth-footer">
              <p className="auth-switch">
                Sign in to your account{' '}
                <Link to="/login" className="auth-link">here</Link>
              </p>

              <Link to="/" className="auth-back">
                <i className="fas fa-arrow-left"></i>
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
