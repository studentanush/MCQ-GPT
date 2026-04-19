import { useContext, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './Auth.css';
import api from '../../services/api';
import { ContextAPI } from '../../Context';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {loginBro} = useContext(ContextAPI);
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
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // const validationErrors = validateForm();
    // if (Object.keys(validationErrors).length > 0) {
    //   setErrors(validationErrors);
    //   setLoading(false);
    //   return;
    // }
    
    try {
      
      const response = await api.post("/auth/login", formData);
      console.log(response.data.message);

      const token = response.data.token;
      const userDetails  = {
          id:response?.data?.user._id,
          name:response?.data?.user.name,
          email:response?.data?.user.email,
          role:response?.data?.user.role,
          token:token,
      };
      console.log(userDetails)
      //localStorage.removeItem('user_info');
      loginBro(userDetails);
      // if(userDetails.role=='educator'){
      //     sessionStorage.setItem('edu_info',JSON.stringify(userDetails))
      // }else{
      //      sessionStorage.setItem('stu_info', JSON.stringify(userDetails));
      // }
     
        console.log("stored in local storage")
      // Store token if remember me is checked
      if (rememberMe) {
        
      } else {
        sessionStorage.setItem('auth_token', 'simulated_token');
      }
      
      // Redirect to target or dashboard
      const redirectTo = searchParams.get('redirect');
      if (redirectTo) {
        navigate(redirectTo);
      } else if (userDetails.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/educator/dashboard');
      }
      
      
    } catch (error) {
      setErrors({ general: 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
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
                  MCQ-GPT
                </div>
              </div>
              
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to continue to your dashboard</p>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form">
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
              
              <div className="form-options">
                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i>
                      Sign In
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  className="btn-auth btn-auth-secondary"
                  onClick={handleGoogleLogin}
                  onMouseDown={createRipple}
                >
                  <i className="fab fa-google btn-auth-icon"></i>
                  Google
                </button>
              </div>
            </form>
            
            <div className="auth-divider">
              <span className="auth-divider-text">New to MCQ-GPT?</span>
            </div>
            
            <div className="auth-footer">
              <p className="auth-switch">
                Don't have an account?{' '}
                <Link to="/register" className="auth-link">Create one now</Link>
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

export default Login;
