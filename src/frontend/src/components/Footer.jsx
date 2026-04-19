import React from 'react'

const Features = () => {
  return (
    <section className="section section-1" id="section1">
      <div className="container">
        <div className="section-grid">
          <div className="section-content fade-in">
            <div className="section-badge">
              <i className="fas fa-hand-sparkles"></i>
              <span>Welcome to Future</span>
            </div>
            <h2 className="section-title">
              Welcome to <span className="text-highlight">MCQ-GPT</span>
            </h2>
            <p className="section-description">
              Your intelligent quiz companion that transforms learning and assessment 
              into an engaging experience. Powered by advanced AI to understand, 
              generate, and customize quizzes according to your needs.
            </p>
            <div className="feature-points">
              <div className="point">
                <i className="fas fa-robot"></i>
                <div>
                  <h4>AI-Powered Generation</h4>
                  <p>Smart algorithms create relevant questions automatically</p>
                </div>
              </div>
              <div className="point">
                <i className="fas fa-file-upload"></i>
                <div>
                  <h4>Document Processing</h4>
                  <p>Upload PDFs, DOCs, images, and more</p>
                </div>
              </div>
              <div className="point">
                <i className="fas fa-chart-line"></i>
                <div>
                  <h4>Advanced Analytics</h4>
                  <p>Detailed performance insights and tracking</p>
                </div>
              </div>
            </div>
          </div>
          <div className="section-visual fade-in" data-delay="200">
            <div className="visual-card">
              <div className="card-shimmer"></div>
              <div className="card-content">
                <div className="visual-icon">
                  <i className="fas fa-atom"></i>
                </div>
                <h3>Smart Quiz Generation</h3>
                <p>AI analyzes content and creates relevant questions in seconds</p>
                <div className="process-flow">
                  <div className="flow-step">
                    <div className="step-number">1</div>
                    <div className="step-text">
                      <h5>Upload Content</h5>
                      <p>Add study materials</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="step-number">2</div>
                    <div className="step-text">
                      <h5>AI Processing</h5>
                      <p>Smart analysis</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="step-number">3</div>
                    <div className="step-text">
                      <h5>Quiz Ready</h5>
                      <p>Instant generation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
