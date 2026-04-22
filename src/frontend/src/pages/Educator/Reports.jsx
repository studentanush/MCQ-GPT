import React, { useState, useEffect } from 'react';
import './Reports.css';
import api from '../../services/api';



const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Helper to get score level class
  const getScoreClass = (score) => {
    if (score >= 90) return 'score-excellent';
    if (score >= 75) return 'score-good';
    if (score >= 50) return 'score-average';
    return 'score-poor';
  };

  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [showReport, setShowReport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quizOptions, setQuizOptions] = useState([{ id: '', name: 'Select a quiz...' }]);
  const [fetchingQuizzes, setFetchingQuizzes] = useState(true);

  // Fetch educator's quizzes for dropdown
  useEffect(() => {
    const fetchQuizzes = async () => {
      const eduInfo = sessionStorage.getItem('edu_info');
      if (!eduInfo) { setFetchingQuizzes(false); return; }
      const { token } = JSON.parse(eduInfo);
      try {
        const res = await api.get("/quizzes/getUserQuizes");
        const opts = [{ id: '', name: 'Select a quiz...' }, ...res.data.map(q => ({ id: q._id, name: q.title }))];
        setQuizOptions(opts);
      } catch (err) {
        console.error('Error fetching quizzes for report:', err);
      } finally {
        setFetchingQuizzes(false);
      }
    };
    fetchQuizzes();
  }, []);

  const [topicOptions, setTopicOptions] = useState([{ id: 'all', name: 'All Topics' }]);

  const dateOptions = [
    { id: 'week', name: 'Last 7 days' },
    { id: 'month', name: 'Last 30 days' },
    { id: 'quarter', name: 'Last 3 months' },
    { id: 'year', name: 'Last year' },
    { id: 'custom', name: 'Custom range' },
  ];

  const [reportData, setReportData] = useState(null);

  const handleGenerateReport = async () => {
    if (!selectedQuiz) {
      alert('Please select a quiz to generate report');
      return;
    }

    setIsLoading(true);
    setShowReport(false);
    setReportData(null);

    try {
      const eduInfo = sessionStorage.getItem('edu_info');
      const token = eduInfo ? JSON.parse(eduInfo).token : null;

      const res = await api.get("/quizzes/educatorReport", {
        params: { quizID: selectedQuiz },
      });

      const data = res.data;

      // Shape the data for the report UI
      const shaped = {
        quizTitle: data.quizTitle,
        totalStudents: data.totalStudents,
        avgScore: data.avgScore,
        completionRate: data.totalStudents > 0 ? 100 : 0,
        avgTime: data.avgTime || '0m 0s',
        topPerformers: data.studentPerformance
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 3)
          .map((s, i) => ({ id: i + 1, name: s.studentName, score: s.percentage, rank: i + 1 })),
        studentPerformance: data.studentPerformance.map((s, i) => ({
          id: i + 1,
          name: s.studentName,
          score: s.percentage,
          correct: s.score,
          wrong: s.total - s.score,
          time: s.timeTaken || '—',
        })),
        questionAnalysis: data.questionAnalysis.map((q) => ({
          id: q.questionIndex,
          question: q.question,
          correctRate: q.correctRate,
          avgTime: '—',
          topic: q.topic,
        })),
        topicPerformance: data.topicPerformance || [],
        aiInsights:
          data.totalStudents === 0
            ? ['No students have attempted this quiz yet.']
            : [
                `${data.totalStudents} student(s) completed this quiz with an average score of ${data.avgScore}%.`,
                data.questionAnalysis.filter(q => q.correctRate < 60).length > 0
                  ? `Struggling questions: ${data.questionAnalysis.filter(q => q.correctRate < 60).map(q => 'Q' + q.questionIndex).join(', ')}. Consider revisiting these topics.`
                  : 'Students performed well across all questions!',
                data.avgScore >= 80
                  ? 'Great performance overall! 🎉'
                  : 'Consider scheduling a revision session for low-scoring topics.',
              ],
      };

      // Set topic options from the report data
      const uniqueTopics = ['all', ...new Set(shaped.questionAnalysis.map(q => q.topic))];
      setTopicOptions(uniqueTopics.map(t => ({ id: t, name: t === 'all' ? 'All Topics' : t })));

      setReportData(shaped);
      setShowReport(true);
    } catch (err) {
      console.error('Report fetch error:', err);
      alert('Could not generate report. ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedQuiz('');
    setDateRange('week');
    setSelectedTopic('all');
    setShowReport(false);
    setReportData(null);
  };

  const handleDownloadReport = (format) => {
    if (!showReport) {
      alert('Please generate a report first');
      return;
    }
    alert(`Downloading report as ${format}...`);
  };

  const handleExportData = (format) => {
    if (!showReport || !reportData) {
      alert('Please generate a report first');
      return;
    }
    
    if (format === 'CSV' || format === 'Excel') {
      try {
        const rows = [
          ['Student Name', 'Score (%)', 'Correct', 'Wrong', 'Time Spent (s)']
        ];
        reportData.studentPerformance.forEach(student => {
          rows.push([
            student.name,
            student.score,
            student.correct,
            student.wrong,
            student.time
          ]);
        });
        
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${reportData.quizTitle.replace(/\s+/g, '_')}_Report.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Export error", err);
        alert("Failed to export data.");
      }
    } else {
      alert(`Exporting data as ${format} is not fully supported yet.`);
    }
  };

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-header">
        <div className="header-left">
          <h1>Quiz Analytics & Reports</h1>
          <p>Generate detailed performance reports for your quizzes</p>
        </div>
        <div className="header-right">
          <button 
            className="back-btn"
            onClick={() => window.history.back()}
          >
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-card">
          <h3><i className="fas fa-filter"></i> Filter Report</h3>
          
          <div className="filter-grid">
            <div className="filter-group">
              <label>
                <i className="fas fa-file-alt"></i>
                Select Quiz
              </label>
              <select 
                value={selectedQuiz} 
                onChange={(e) => setSelectedQuiz(e.target.value)}
                className="filter-select"
              >
                {quizOptions.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>{quiz.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>
                <i className="fas fa-calendar"></i>
                Date Range
              </label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="filter-select"
              >
                {dateOptions.map(date => (
                  <option key={date.id} value={date.id}>{date.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>
                <i className="fas fa-layer-group"></i>
                Topic Filter
              </label>
              <select 
                value={selectedTopic} 
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="filter-select"
              >
                {topicOptions.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button 
              className="reset-btn"
              onClick={handleResetFilters}
            >
              <i className="fas fa-redo"></i>
              Reset Filters
            </button>
            <button 
              className="generate-btn"
              onClick={handleGenerateReport}
              disabled={!selectedQuiz || isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating Report...
                </>
              ) : (
                <>
                  <i className="fas fa-chart-line"></i>
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Empty State / Instructions */}
      {!showReport && !isLoading && (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-chart-bar"></i>
          </div>
          <h2>Ready to Analyze Quiz Performance?</h2>
          <p>Select a quiz and filters above to generate detailed analytics report</p>
          <div className="empty-features">
            <div className="feature">
              <i className="fas fa-user-graduate"></i>
              <h4>Student Performance</h4>
              <p>View individual student scores and progress</p>
            </div>
            <div className="feature">
              <i className="fas fa-question-circle"></i>
              <h4>Question Analysis</h4>
              <p>Identify difficult questions and topics</p>
            </div>
            <div className="feature">
              <i className="fas fa-download"></i>
              <h4>Export Reports</h4>
              <p>Download reports in PDF, CSV, and Excel formats</p>
            </div>
            <div className="feature">
              <i className="fas fa-robot"></i>
              <h4>AI Insights</h4>
              <p>Get personalized recommendations</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <h3>Generating your report...</h3>
          <p>Analyzing quiz data and performance metrics</p>
        </div>
      )}

      {/* Report Content - Only shown when report is generated */}
      {showReport && reportData && (
        <>
          {/* Report Header */}
          <div className="report-header">
            <div className="report-title">
              <h2>{reportData.quizTitle} - Analytics Report</h2>
              <p>
                <span>Date Range: {dateOptions.find(d => d.id === dateRange)?.name}</span>
                <span>•</span>
                <span>Topic: {topicOptions.find(t => t.id === selectedTopic)?.name}</span>
              </p>
            </div>
            <div className="report-actions">
              <button 
                className="export-btn"
                onClick={() => handleDownloadReport('PDF')}
              >
                <i className="fas fa-file-pdf"></i>
                PDF
              </button>
              <button 
                className="export-btn"
                onClick={() => handleExportData('CSV')}
              >
                <i className="fas fa-file-csv"></i>
                CSV
              </button>
              <button 
                className="export-btn"
                onClick={() => handleExportData('Excel')}
              >
                <i className="fas fa-file-excel"></i>
                Excel
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="reports-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-chart-pie"></i>
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <i className="fas fa-user-graduate"></i>
              Student Performance
            </button>
            <button 
              className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              <i className="fas fa-question-circle"></i>
              Question Analysis
            </button>
            <button 
              className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              <i className="fas fa-robot"></i>
              AI Insights
            </button>
          </div>

          {/* Stats Cards */}
          <div className="stats-cards">
            <div className="stat-card primary">
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-content">
                <h3>{reportData.totalStudents}</h3>
                <p>Total Students</p>
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="stat-content">
                <h3>{reportData.avgScore}%</h3>
                <p>Average Score</p>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <h3>{reportData.avgTime}</h3>
                <p>Avg. Time</p>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-content">
                <h3>{reportData.completionRate}%</h3>
                <p>Completion Rate</p>
              </div>
            </div>
          </div>

          {/* Report Content based on active tab */}
          <div className="report-content">
            {activeTab === 'overview' && (
              <div className="overview-content">
                {/* Top Performers */}
                <div className="top-performers">
                  <h3><i className="fas fa-trophy"></i> Top Performers</h3>
                  <div className="performers-list">
                    {reportData.topPerformers.map(student => (
                      <div key={student.id} className="performer-card">
                        <div className="performer-rank">
                          <div className={`rank-badge rank-${student.rank}`}>
                            {student.rank}
                          </div>
                        </div>
                        <div className="performer-info">
                          <h4>{student.name}</h4>
                          <p>Score: {student.score}%</p>
                        </div>
                        <div className="performer-score">
                          <div className="score-circle">
                            <div 
                              className="circle-progress"
                              style={{'--progress': `${student.score}%`}}
                            ></div>
                            <span>{student.score}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topic Performance */}
                <div className="topic-performance">
                  <h3><i className="fas fa-layer-group"></i> Topic Performance</h3>
                  <div className="topic-list">
                    {reportData.topicPerformance.map(topic => (
                      <div key={topic.topic} className="topic-card">
                        <div className="topic-header">
                          <h4>{topic.topic}</h4>
                          <span className="topic-score">{topic.score}%</span>
                        </div>
                        <div className="topic-progress">
                          <div 
                            className={`progress-bar ${getScoreClass(topic.score)}`}
                            style={{width: `${topic.score}%`}}
                          ></div>
                        </div>
                        <div className="topic-meta">
                          <span>{topic.questions} questions</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="students-content">
                <div className="performance-table">
                  <div className="table-header">
                    <h3>Student Performance Details</h3>
                    <button 
                      className="export-btn small"
                      onClick={() => handleExportData('CSV')}
                    >
                      <i className="fas fa-download"></i>
                      Export Data
                    </button>
                  </div>
                  
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Score</th>
                          <th>Correct</th>
                          <th>Wrong</th>
                          <th>Time Spent</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.studentPerformance.map(student => (
                          <tr key={student.id}>
                            <td>
                              <div className="student-cell">
                                <div className="student-avatar">
                                  {student.name.charAt(0)}
                                </div>
                                <span>{student.name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="score-cell">
                                <span className={`score-value ${getScoreClass(student.score)}`}>
                                  {student.score}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="correct-count">
                                <i className="fas fa-check"></i>
                                {student.correct}
                              </span>
                            </td>
                            <td>
                              <span className="wrong-count">
                                <i className="fas fa-times"></i>
                                {student.wrong}
                              </span>
                            </td>
                            <td>
                              <span className="time-cell">
                                <i className="fas fa-clock"></i>
                                {student.time}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${student.score >= 90 ? 'completed' : student.score >= 70 ? 'in-progress' : 'needs-review'}`}>
                                {student.score >= 90 ? 'Excellent' : student.score >= 70 ? 'Good' : 'Needs Review'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="questions-content">
                <div className="question-analysis">
                  <h3><i className="fas fa-question-circle"></i> Question Analysis</h3>
                  <div className="question-list">
                    {reportData.questionAnalysis.map(q => (
                      <div key={q.id} className="question-card">
                        <div className="question-header">
                          <h4>Q{q.id}: {q.question}</h4>
                          <span className={`accuracy-badge ${q.correctRate >= 90 ? 'high' : q.correctRate >= 70 ? 'medium' : 'low'}`}>
                            {q.correctRate}% Accuracy
                          </span>
                        </div>
                        <div className="question-stats">
                          <div className="stat">
                            <i className="fas fa-chart-bar"></i>
                            <span>Correct Rate: <strong>{q.correctRate}%</strong></span>
                          </div>
                          <div className="stat">
                            <i className="fas fa-clock"></i>
                            <span>Avg Time: <strong>{q.avgTime}</strong></span>
                          </div>
                          <div className="stat">
                            <i className="fas fa-users"></i>
                            <span>Attempts: <strong>{reportData.totalStudents}</strong></span>
                          </div>
                        </div>
                        <div className="question-progress">
                          <div className="progress-label">
                            <span>Accuracy</span>
                            <span>{q.correctRate}%</span>
                          </div>
                          <div className="progress-bar-container">
                            <div 
                              className={`accuracy-bar ${getScoreClass(q.correctRate)}`}
                              style={{width: `${q.correctRate}%`}}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="insights-content">
                <div className="ai-insights">
                  <div className="insights-header">
                    <h3>
                      <i className="fas fa-robot"></i>
                      AI Insights & Recommendations
                    </h3>
                  </div>
                  <div className="insights-list">
                    {reportData.aiInsights.map((insight, index) => (
                      <div key={index} className="insight-card">
                        <div className="insight-icon">
                          <i className="fas fa-lightbulb"></i>
                        </div>
                        <div className="insight-text">
                          <p>{insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="insights-actions">
                    <button className="action-btn">
                      <i className="fas fa-plus-circle"></i>
                      Create Follow-up Quiz
                    </button>
                    <button className="action-btn">
                      <i className="fas fa-envelope"></i>
                      Send to Students
                    </button>
                    <button className="action-btn">
                      <i className="fas fa-calendar-alt"></i>
                      Schedule Review Session
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
