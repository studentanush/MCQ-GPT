import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom' // Added import
import '../q.css'

const Navbar = () => { // Removed openLoginModal and openSignupModal props
  // State to track mobile menu visibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // State to track if page is scrolled
  const [isScrolled, setIsScrolled] = useState(false)
  
  // Add scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    
    // Add scroll-padding to html for anchor links
    document.documentElement.style.scrollPaddingTop = '100px'
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.documentElement.style.scrollPaddingTop = ''
    }
  }, [])
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    // Prevent body scrolling when mobile menu is open
    if (!isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }
  
  // Close mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    document.body.style.overflow = 'auto'
  }
  
  // Handle smooth scroll for nav links (only for landing page)
  const handleNavClick = (e, targetId) => {
    e.preventDefault()
    closeMobileMenu() // Close mobile menu if open
    
    const element = document.getElementById(targetId)
    if (element) {
      // Account for fixed navbar height (80px)
      const navbarHeight = 80
      const elementPosition = element.offsetTop - navbarHeight
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="container">
        {/* Brand Logo with Gradient - Changed to Link */}
        <div className="nav-brand">
          <Link 
            to="/" 
            className="logo-link"
            onClick={closeMobileMenu}
          >
            <div className="logo-gradient">
              <i className="fas fa-brain logo-icon"></i>
            </div>
            <div className="brand-text">
              <span className="brand-name">MCQ</span>
              <span className="brand-tld">-GPT</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-menu">
          <div className="nav-links">
            {/* Home link - uses Link for page navigation */}
            <Link 
              to="/" 
              className="nav-link"
              onClick={closeMobileMenu}
            >
              <span className="link-text">Home</span>
              <div className="link-underline"></div>
            </Link>
            
            {/* Features link - stays as anchor for smooth scroll on landing page */}
            <a 
              href="#section1" 
              className="nav-link"
              onClick={(e) => handleNavClick(e, 'section1')}
            >
              <span className="link-text">Features</span>
              <div className="link-underline"></div>
            </a>
            
            {/* How it Works link - stays as anchor for smooth scroll on landing page */}
            <a 
              href="#how-it-works" 
              className="nav-link"
              onClick={(e) => handleNavClick(e, 'how-it-works')}
            >
              <span className="link-text">How it Works</span>
              <div className="link-underline"></div>
            </a>
            
            {/* Contact link - stays as anchor for smooth scroll on landing page */}
            <a 
              href="#contact" 
              className="nav-link"
              onClick={(e) => handleNavClick(e, 'contact')}
            >
              <span className="link-text">Contact</span>
              <div className="link-underline"></div>
            </a>
          </div>

          {/* Action Buttons - Updated to use Link components */}
          <div className="nav-actions">
            {/* Login Button - Changed to Link */}
            <Link 
              to="/login" 
              className="btn btn-text"
              onClick={closeMobileMenu}
            >
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
            
            {/* Get Started Button - Changed to Link */}
            <Link 
              to="/register" 
              className="btn btn-gradient"
              onClick={closeMobileMenu}
            >
              <i className="fas fa-rocket"></i>
              <span>Get Started</span>
            </Link>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className={`menu-toggle ${isMobileMenuOpen ? 'active' : ''}`} 
          aria-label="Toggle menu"
          onClick={toggleMobileMenu}
        >
          <span className="menu-line"></span>
          <span className="menu-line"></span>
          <span className="menu-line"></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu">
          <div className="mobile-header">
            <div className="mobile-brand">
              <Link 
                to="/" 
                className="logo-link"
                onClick={closeMobileMenu}
              >
                <div className="logo-gradient">
                  <i className="fas fa-brain logo-icon"></i>
                </div>
                <div className="brand-text">
                  <span className="brand-name">MCQ</span>
                  <span className="brand-tld">-GPT</span>
                </div>
              </Link>
            </div>
            <button 
              className="mobile-close" 
              onClick={closeMobileMenu}
              aria-label="Close menu"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="mobile-links">
            {/* Home link - uses Link */}
            <Link 
              to="/" 
              className="mobile-link"
              onClick={closeMobileMenu}
            >
              <i className="fas fa-home"></i>
              <span>Home</span>
            </Link>
            
            {/* Features link - stays as anchor for smooth scroll */}
            <a 
              href="#section1" 
              className="mobile-link"
              onClick={(e) => {
                handleNavClick(e, 'section1')
                closeMobileMenu()
              }}
            >
              <i className="fas fa-star"></i>
              <span>Features</span>
            </a>
            
            {/* How it Works link - stays as anchor for smooth scroll */}
            <a 
              href="#how-it-works" 
              className="mobile-link"
              onClick={(e) => {
                handleNavClick(e, 'how-it-works')
                closeMobileMenu()
              }}
            >
              <i className="fas fa-play-circle"></i>
              <span>How it Works</span>
            </a>
            
            {/* Contact link - stays as anchor for smooth scroll */}
            <a 
              href="#contact" 
              className="mobile-link"
              onClick={(e) => {
                handleNavClick(e, 'contact')
                closeMobileMenu()
              }}
            >
              <i className="fas fa-envelope"></i>
              <span>Contact</span>
            </a>
          </div>
          
          <div className="mobile-actions">
            {/* Login Button - Changed to Link */}
            <Link 
              to="/login" 
              className="btn btn-text btn-mobile"
              onClick={closeMobileMenu}
            >
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
            
            {/* Get Started Button - Changed to Link */}
            <Link 
              to="/register" 
              className="btn btn-gradient btn-mobile"
              onClick={closeMobileMenu}
            >
              <i className="fas fa-rocket"></i>
              <span>Get Started</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
