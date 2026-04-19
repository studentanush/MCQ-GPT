import React from 'react'

const Workflow = () => {
  return (
    <section className="section workflow" id="how-it-works">
      <div className="container">
        <div className="section-header center">
          <h2 className="section-title">How <span className="text-highlight">MCQ-GPT</span> Works</h2>
          <p className="section-description">Four simple steps to create amazing quizzes</p>
        </div>
        <div className="workflow-steps">
          <div className="workflow-step slide-up" data-delay="100">
            <div className="step-number">1</div>
            <div className="step-icon">
              <i className="fas fa-comment-dots"></i>
            </div>
            <h3>Chat with AI</h3>
            <p>Describe your requirements to our AI assistant</p>
            <div className="step-connector"></div>
          </div>
          <div className="workflow-step slide-up" data-delay="200">
            <div className="step-number">2</div>
            <div className="step-icon">
              <i className="fas fa-edit"></i>
            </div>
            <h3>Customize</h3>
            <p>Edit and refine generated questions</p>
            <div className="step-connector"></div>
          </div>
          <div className="workflow-step slide-up" data-delay="300">
            <div className="step-number">3</div>
            <div className="step-icon">
              <i className="fas fa-broadcast-tower"></i>
            </div>
            <h3>Host Live</h3>
            <p>Share room code with participants</p>
            <div className="step-connector"></div>
          </div>
          <div className="workflow-step slide-up" data-delay="400">
            <div className="step-number">4</div>
            <div className="step-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <h3>Analyze</h3>
            <p>Get detailed performance insights</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Workflow
