import React from 'react'

const CTA = () => {
  return (
    <section className="section cta" id="contact">
      <div className="container">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Transform Your <span className="text-highlight">Quiz Experience</span>?</h2>
          <p className="cta-description">Join thousands of educators and organizations using MCQ-GPT</p>
          <div className="cta-buttons">
            <button className="btn btn-primary btn-large" id="ctaStartFree">
              <i className="fas fa-rocket"></i>
              <span>Start Free Trial</span>
            </button>
            <button className="btn btn-text btn-large" id="ctaDemo">
              <i className="fas fa-play-circle"></i>
              <span>Watch Demo</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTA
