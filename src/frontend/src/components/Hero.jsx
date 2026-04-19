import React, { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { ContextAPI } from '../Context';
import '../q.css'

const Hero = () => {
  const navigate = useNavigate();
  const { loginBro } = useContext(ContextAPI);
  const [flippedTeacher, setFlippedTeacher] = useState(false)
  const [flippedStudent, setFlippedStudent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statsRef = useRef(null);
  const countersInitialized = useRef(false);  // Initialize animated counters
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !countersInitialized.current) {
            initAnimatedCounters()
            countersInitialized.current = true
            observer.disconnect()
          }
        })
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    if (statsRef.current) {
      observer.observe(statsRef.current)
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current)
      }
    }
  }, [])

  const initAnimatedCounters = () => {
    const counters = document.querySelectorAll('.stat-number')
    
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-count'))
      if (isNaN(target)) return
      
      const duration = 1800
      const frameDuration = 1000 / 60
      const totalFrames = Math.round(duration / frameDuration)
      const easeOut = (t) => t * (2 - t)
      
      let frame = 0
      const start = 0
      
      const counterInterval = setInterval(() => {
        frame++
        const progress = frame / totalFrames
        const easedProgress = easeOut(progress)
        const currentValue = Math.round(start + (target - start) * easedProgress)
        
        counter.textContent = currentValue.toLocaleString()
        
        if (frame === totalFrames) {
          clearInterval(counterInterval)
          counter.textContent = target.toLocaleString()
        }
      }, frameDuration)
    })
  }

  const toggleTeacherCard = (e) => {
    // Only flip if clicking on the card itself, not interactive elements
    if (e.target.closest('.no-flip') || 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'BUTTON') {
      return
    }
    setFlippedTeacher(!flippedTeacher)
  }

  const toggleStudentCard = (e) => {
    // Only flip if clicking on the card itself, not interactive elements
    if (e.target.closest('.no-flip') || 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'BUTTON') {
      return
    }
    setFlippedStudent(!flippedStudent)
  }

  const handleStartGenerating = (e) => {
    e.stopPropagation()
    setFlippedTeacher(true)
    console.log('Start Generating Tests clicked')
  }

  const handleStartLearning = (e) => {
    e.stopPropagation()
    setFlippedStudent(true)
    console.log('Start Learning clicked')
  }

  const handleAuthSubmit = async (e, type) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      setIsSubmitting(true);
      const res = await api.post('/auth/login', { email, password });
      
      const userDetails = {
        ...res.data.user,
        token: res.data.token,
        role: type === 'teacher' ? 'educator' : 'student'
      };

      loginBro(userDetails);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      
      if (type === 'teacher') {
        navigate('/educator/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    const quizCode = e.target.elements['quizCode'].value;
    if (quizCode.trim()) {
      navigate(`/attend-quiz/${quizCode}`);
    } else {
      toast.warn('Enter a valid room code');
    }
  };

  const handleSignUp = (type) => {
    navigate('/register', { state: { role: type } });
  };

  const handleBackClick = (e, type) => {
    e.stopPropagation()
    if (type === 'teacher') {
      setFlippedTeacher(false)
    } else {
      setFlippedStudent(false)
    }
  }

  return (
    <section className="hero" id="home">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="badge-animated">
              <div className="badge-shine"></div>
              <i className="fas fa-bolt"></i>
              <span>AI-Powered Quiz Platform</span>
            </div>
            
            <h1 className="hero-title">
              <span className="title-line">Welcome to</span>
              <span className="title-line">
                <span className="text-gradient tracking-expand">MCQ-GPT</span>
              </span>
            </h1>
            
            <p className="hero-subtitle">
              Transform learning with AI-generated quizzes. Upload documents, 
              chat with AI, and create engaging assessments instantly.
            </p>
            
            {/* Role Cards - IMPROVED SPACING */}
            <div className="role-cards-horizontal">
              {/* Teacher Card */}
              <div className={`flip-card ${flippedTeacher ? 'flipped' : ''}`} onClick={toggleTeacherCard}>
                <div className="flip-card-inner">
                  {/* FRONT SIDE - Teacher */}
                  <div className="flip-card-front">
                    <div className="card-content-compact">
                      <div className="card-header">
                        <div className="card-icon">
                          <i className="fas fa-chalkboard-teacher"></i>
                          <div className="icon-glow"></div>
                        </div>
                        <div className="card-badge">Educator</div>
                      </div>
                      <h3 className="card-title">For Teachers</h3>
                      <p className="card-desc">Create interactive quizzes, track progress, and engage students</p>
                      <div className="card-features-compact">
                        <span><i className="fas fa-play"></i> Live Sessions</span>
                        <span><i className="fas fa-chart-bar"></i> Analytics</span>
                        <span><i className="fas fa-users"></i> 50+ Students</span>
                      </div>
                      <div className="card-footer-compact">
                        <button className="btn btn-primary btn-front no-flip" onClick={handleStartGenerating}>
                          <i className="fas fa-magic"></i>
                          Start Generating Tests
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* BACK SIDE - Teacher Login */}
                  <div className="flip-card-back">
                    <div className="card-content-compact">
                      <div className="card-back-content">
                        <h3 className="card-title-back">Educator Access</h3>
                        <p className="card-desc-back">Create amazing quizzes for your students</p>
                        
                        <form className="login-form-compact no-flip" onSubmit={(e) => handleAuthSubmit(e, 'teacher')}>
                          <div className="input-group-compact">
                            <i className="fas fa-envelope"></i>
                            <input 
                              type="email" 
                              name="email" 
                              placeholder="Email Address" 
                              required 
                              className="no-flip"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="input-group-compact">
                            <i className="fas fa-lock"></i>
                            <input 
                              type="password" 
                              name="password" 
                              placeholder="Enter Password" 
                              required 
                              className="no-flip"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <button type="submit" className="btn btn-primary btn-block-compact no-flip" onClick={(e) => e.stopPropagation()}>
                            <i className="fas fa-sign-in-alt"></i>
                            Sign In to Dashboard
                          </button>
                        </form>
                        
                        <div className="divider-compact">
                          <span>New to MCQ-GPT?</span>
                        </div>
                        
                        <button className="btn btn-gradient btn-block-compact no-flip" onClick={() => handleSignUp('educator')}>
                          <i className="fas fa-user-plus"></i>
                          Create Educator Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-shine-effect"></div>
              </div>
              
              {/* Student Card */}
              <div className={`flip-card ${flippedStudent ? 'flipped' : ''}`} onClick={toggleStudentCard}>
                <div className="flip-card-inner">
                  {/* FRONT SIDE - Student */}
                  <div className="flip-card-front">
                    <div className="card-content-compact">
                      <div className="card-header">
                        <div className="card-icon">
                          <i className="fas fa-user-graduate"></i>
                          <div className="icon-glow"></div>
                        </div>
                        <div className="card-badge">Student</div>
                      </div>
                      <h3 className="card-title">For Students</h3>
                      <p className="card-desc">Master concepts with AI-generated quizzes and live competitions</p>
                      <div className="card-features-compact">
                        <span><i className="fas fa-history"></i> 20+ Years PYQs</span>
                        <span><i className="fas fa-brain"></i> AI Analysis</span>
                        <span><i className="fas fa-trophy"></i> Live Rank</span>
                      </div>
                      <div className="card-footer-compact">
                        <button className="btn btn-primary btn-front no-flip" onClick={handleStartLearning}>
                          <i className="fas fa-rocket"></i>
                          Start Learning Now
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* BACK SIDE - Student Login */}
                  <div className="flip-card-back">
                    <div className="card-content-compact">
                      <div className="card-back-content">
                        <h3 className="card-title-back">Student Access</h3>
                        <p className="card-desc-back">Join quizzes and accelerate your learning</p>
                        
                        {/* Quick Join Section */}
                        <div className="quick-join-compact no-flip">
                          <form onSubmit={handleQuickJoin}>
                            <div className="input-group-with-button">
                              <div className="input-group-compact">
                                <i className="fas fa-key"></i>
                                <input 
                                  type="text" 
                                  name="quizCode" 
                                  placeholder="Enter Quiz Code" 
                                  required 
                                  className="no-flip"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <button type="submit" className="btn btn-small no-flip" onClick={(e) => e.stopPropagation()}>
                                <i className="fas fa-arrow-right"></i>
                              </button>
                            </div>
                          </form>
                          <p className="quick-join-hint-compact">Enter code shared by your teacher</p>
                        </div>
                        
                        <div className="divider-compact">
                          <span>or login with credentials</span>
                        </div>
                        
                        <form className="login-form-compact no-flip" onSubmit={(e) => handleAuthSubmit(e, 'student')}>
                          <div className="input-group-compact">
                            <i className="fas fa-envelope"></i>
                            <input 
                              type="email" 
                              name="email" 
                              placeholder="Email Address" 
                              required 
                              className="no-flip"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="input-group-compact">
                            <i className="fas fa-lock"></i>
                            <input 
                              type="password" 
                              name="password" 
                              placeholder="Enter Password" 
                              required 
                              className="no-flip"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <button type="submit" className="btn btn-primary btn-block-compact no-flip" onClick={(e) => e.stopPropagation()}>
                            <i className="fas fa-sign-in-alt"></i>
                            Sign In to Learning
                          </button>
                        </form>
                        
                        <button className="btn btn-gradient btn-block-compact no-flip" onClick={() => handleSignUp('student')}>
                          <i className="fas fa-user-plus"></i>
                          Create Student Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-shine-effect"></div>
              </div>
            </div>
            
            {/* Hero Stats - MOVED LOWER WITH BETTER SPACING */}
            <div className="hero-stats-spaced" ref={statsRef}>
              <div className="stat-item">
                <div className="stat-number" data-count="10000">0</div>
                <div className="stat-label">Quizzes Created</div>
                <div className="stat-glow"></div>
              </div>
              <div className="stat-item">
                <div className="stat-number" data-count="50000">0</div>
                <div className="stat-label">Active Users</div>
                <div className="stat-glow"></div>
              </div>
              <div className="stat-item">
                <div className="stat-number" data-count="98">0</div>
                <div className="stat-label">Satisfaction Rate</div>
                <div className="stat-glow"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
