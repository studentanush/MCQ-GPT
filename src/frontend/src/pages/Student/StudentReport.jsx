import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './StudentReport.css';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';

const StudentReport = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
    const [filter, setFilter] = useState('all'); // all, correct, wrong, skipped
    const [downloadingPDF, setDownloadingPDF] = useState(false);

    // ==================== INITIALIZATION ====================
    useEffect(() => {
        const loadReport = async () => {
            try {
                const subId = submissionId || location.state?.submissionId;
                if (!subId) throw new Error("No submission ID provided.");
                
                const response = await api.get(`/quizzes/report/${subId}`);
                setReportData(response.data);
            } catch (err) {
                console.error('Error fetching report:', err);
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [submissionId, location.state]);

    // ==================== PDF GENERATION ====================
    const generatePDF = async (type = 'report') => {
        if (!reportData) return;
        setDownloadingPDF(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Header with colors
            doc.setFontSize(22);
            doc.setTextColor(138, 43, 226); // Purple
            doc.text('MCQ-GPT Performance Report', pageWidth / 2, 20, { align: 'center' });
            
            doc.setDrawColor(138, 43, 226);
            doc.setLineWidth(0.5);
            doc.line(20, 25, pageWidth - 20, 25);

            // Basic Info
            doc.setFontSize(12);
            doc.setTextColor(50, 50, 50);
            doc.text(`Quiz: ${reportData.quizTitle}`, 20, 40);
            doc.text(`Student: ${reportData.studentName}`, 20, 48);
            doc.text(`Date: ${new Date(reportData.submittedAt).toLocaleString()}`, 20, 56);
            doc.text(`Time Taken: ${reportData.timeTaken}`, pageWidth - 70, 56);

            // Summary Table
            doc.autoTable({
                startY: 65,
                head: [['Metric', 'Performance']],
                body: [
                    ['Score Percentage', `${reportData.percentage}%`],
                    ['Correct Answers', `${reportData.correctAnswers} / ${reportData.totalQuestions}`],
                    ['Accuracy', `${Math.round((reportData.correctAnswers / (reportData.attempted || 1)) * 100)}%`],
                    ['Final Grade', reportData.grade],
                    ['Rank', reportData.rank]
                ],
                theme: 'grid',
                headStyles: { fillColor: [138, 43, 226] }
            });

            if (type === 'solutions') {
                doc.addPage();
                doc.setFontSize(18);
                doc.setTextColor(138, 43, 226);
                doc.text('Question Solutions', pageWidth / 2, 20, { align: 'center' });
                
                let y = 35;
                reportData.questions.forEach((q, idx) => {
                    if (y > 260) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.setFontSize(11);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont(undefined, 'bold');
                    doc.text(`Q${idx + 1}: ${q.question}`, 20, y);
                    y += 7;
                    
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(80, 80, 80);
                    const sol = doc.splitTextToSize(`Sol: ${q.explanation || q.solution || 'No explanation provided.'}`, pageWidth - 40);
                    doc.text(sol, 25, y);
                    y += (sol.length * 5) + 10;
                });
            }

            const fileName = type === 'report' ? `Report_${reportData.quizTitle}.pdf` : `Solutions_${reportData.quizTitle}.pdf`;
            doc.save(fileName.replace(/\s+/g, '_'));
            toast.success("PDF Downloaded!");
        } catch (err) {
            console.error("PDF Error:", err);
            toast.error("Failed to generate PDF");
        } finally {
            setDownloadingPDF(false);
        }
    };

    // ==================== DATA PROCESSING ====================
    const getFilteredQuestions = () => {
        if (!reportData) return [];
        switch(filter) {
            case 'correct': return reportData.questions.filter(q => q.isCorrect);
            case 'wrong': return reportData.questions.filter(q => q.studentAnswer && !q.isCorrect);
            case 'skipped': return reportData.questions.filter(q => !q.studentAnswer);
            default: return reportData.questions;
        }
    };

    const getScoreClass = (perc) => {
        if (perc >= 80) return 'score-excellent';
        if (perc >= 60) return 'score-good';
        if (perc >= 40) return 'score-average';
        return 'score-poor';
    };

    // ==================== RENDERING ====================
    if (loading) return <div className="student-report-container"><div className="report-loading"><div className="loading-spinner"></div></div></div>;
    if (error) return <div className="student-report-container"><div className="report-error">Error: {error}</div></div>;

    return (
        <div className="student-report-container">
            {/* Header */}
            <header className="report-header">
                <div className="header-left">
                    <div className="report-title">MCQ-GPT</div>
                </div>
                <div className="header-center">
                    <div className="report-title">{reportData.quizTitle}</div>
                    <div className="report-subtitle">
                        <span>{reportData.studentName}</span>
                        <span>•</span>
                        <span>{reportData.className}</span>
                        <span>•</span>
                        <span>{new Date(reportData.submittedAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="header-right">
                    <button className="action-btn download-btn" onClick={() => generatePDF('report')} disabled={downloadingPDF}>
                        <i className="fas fa-file-pdf"></i> Download Report
                    </button>
                    <button className="action-btn solutions-btn" onClick={() => generatePDF('solutions')}>
                        <i className="fas fa-lightbulb"></i> View Solutions
                    </button>
                </div>
            </header>

            {/* Quick Stats Bar */}
            <div className="quick-stats-bar">
                <div className="stat-item">
                    <div className={`stat-value ${getScoreClass(reportData.percentage)}`}>{reportData.percentage}%</div>
                    <div className="stat-label">Score</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{reportData.correctAnswers}/{reportData.totalQuestions}</div>
                    <div className="stat-label">Correct</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{reportData.rank}</div>
                    <div className="stat-label">Rank</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{reportData.timeTaken}</div>
                    <div className="stat-label">Time Taken</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="report-content">
                <div className="analysis-column">
                    <div className="analysis-tabs">
                        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                            Overview
                        </button>
                        <button className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
                            Question Analysis
                        </button>
                        <button className={`tab-btn ${activeTab === 'solutions' ? 'active' : ''}`} onClick={() => setActiveTab('solutions')}>
                            Solutions
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'overview' && (
                            <div className="overview-content">
                                <h3 className="section-title"><i className="fas fa-chart-pie"></i> Performance Overview</h3>
                                <div className="overview-grid">
                                    <div className="performance-card-large">
                                        <h4>Topic Performance</h4>
                                        <div style={{marginTop: '20px'}}>
                                            {reportData.topics.map(topic => (
                                                <div key={topic.name} className="topic-item">
                                                    <div className="topic-info">
                                                        <span>{topic.name}</span>
                                                        <span>{topic.percentage}%</span>
                                                    </div>
                                                    <div className="topic-bar-bg">
                                                        <div className="topic-bar-fill" style={{
                                                            width: `${topic.percentage}%`,
                                                            background: topic.percentage >= 70 ? '#00ff88' : topic.percentage >= 40 ? '#4cc9f0' : '#ff6b6b'
                                                        }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="performance-card-large">
                                        <h4>AI Performance Insights</h4>
                                        <div style={{marginTop: '20px'}}>
                                            {reportData.aiInsights.strengths.slice(0, 2).map((s, i) => (
                                                <div className="insight-item" key={i}>
                                                    <div className="insight-icon"><i className="fas fa-check"></i></div>
                                                    <div>{s}</div>
                                                </div>
                                            ))}
                                            {reportData.aiInsights.weaknesses.slice(0, 2).map((w, i) => (
                                                <div className="insight-item" key={i}>
                                                    <div className="insight-icon" style={{color: '#ff6b6b'}}><i className="fas fa-exclamation"></i></div>
                                                    <div>{w}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'analysis' && (
                            <div className="analysis-view">
                                <div style={{display: 'flex', gap: '10px', marginBottom: '30px'}}>
                                    <button className={`tag ${filter === 'all' ? 'topic-tag' : ''}`} onClick={() => setFilter('all')}>All</button>
                                    <button className={`tag ${filter === 'correct' ? 'topic-tag' : ''}`} style={{color: '#00ff88'}} onClick={() => setFilter('correct')}>Correct</button>
                                    <button className={`tag ${filter === 'wrong' ? 'topic-tag' : ''}`} style={{color: '#ff6b6b'}} onClick={() => setFilter('wrong')}>Wrong</button>
                                    <button className={`tag ${filter === 'skipped' ? 'topic-tag' : ''}`} style={{color: '#ffd166'}} onClick={() => setFilter('skipped')}>Skipped</button>
                                </div>
                                <div className="questions-grid">
                                    {getFilteredQuestions().map((q, idx) => (
                                        <div 
                                            key={q.id} 
                                            className={`question-summary-card ${q.isCorrect ? 'correct' : q.studentAnswer ? 'wrong' : 'skipped'}`}
                                            onClick={() => {
                                                const originalIdx = reportData.questions.findIndex(orig => orig.id === q.id);
                                                setSelectedQuestionIdx(originalIdx);
                                                setActiveTab('solutions');
                                            }}
                                        >
                                            <div className="q-circle">{q.id}</div>
                                            <div className="q-status-text">{q.isCorrect ? 'Correct' : q.studentAnswer ? 'Wrong' : 'Skipped'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'solutions' && (
                            <div className="question-detail-view">
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                                    <button className="action-btn" onClick={() => setSelectedQuestionIdx(p => Math.max(0, p - 1))} disabled={selectedQuestionIdx === 0}>Previous</button>
                                    <span>Question {selectedQuestionIdx + 1} of {reportData.questions.length}</span>
                                    <button className="action-btn" onClick={() => setSelectedQuestionIdx(p => Math.min(reportData.questions.length - 1, p + 1))} disabled={selectedQuestionIdx === reportData.questions.length - 1}>Next</button>
                                </div>
                                
                                {reportData.questions[selectedQuestionIdx] && (
                                    <>
                                        <div className="solution-meta">
                                            <span className="solution-tag">{reportData.questions[selectedQuestionIdx].topic}</span>
                                            <span className="solution-tag">{reportData.questions[selectedQuestionIdx].difficulty}</span>
                                        </div>
                                        <h3 style={{marginBottom: '20px'}}>{reportData.questions[selectedQuestionIdx].question}</h3>
                                        
                                        <div className={`option-box ${reportData.questions[selectedQuestionIdx].isCorrect ? 'correct' : 'wrong'}`}>
                                            <strong>Your Answer:</strong> {reportData.questions[selectedQuestionIdx].studentAnswer || 'Skipped'}
                                        </div>
                                        {!reportData.questions[selectedQuestionIdx].isCorrect && (
                                            <div className="option-box correct">
                                                <strong>Correct Answer:</strong> {reportData.questions[selectedQuestionIdx].correctAnswer}
                                            </div>
                                        )}
                                        
                                        <div style={{marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px'}}>
                                            <h4 style={{color: 'var(--secondary-glow)', marginBottom: '10px'}}><i className="fas fa-lightbulb"></i> Explanation</h4>
                                            <p style={{lineHeight: '1.6', color: 'rgba(255,255,255,0.8)'}}>
                                                {reportData.questions[selectedQuestionIdx].explanation || reportData.questions[selectedQuestionIdx].solution}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <aside className="summary-column">
                    <div className="glass-side-card">
                        <h4 style={{marginBottom: '20px'}}>Result Summary</h4>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: 'rgba(255,255,255,0.5)'}}>Accuracy</span>
                                <span className="score-excellent">{Math.round((reportData.correctAnswers/reportData.totalQuestions)*100)}%</span>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: 'rgba(255,255,255,0.5)'}}>Efficiency</span>
                                <span>Good</span>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: 'rgba(255,255,255,0.5)'}}>Time/Question</span>
                                <span>{(() => {
                                    const match = reportData.timeTaken?.match(/(\d+)m\s+(\d+)s/);
                                    if(!match) return '—';
                                    const totalSec = parseInt(match[1])*60 + parseInt(match[2]);
                                    return `${Math.round(totalSec / reportData.totalQuestions)}s`;
                                })()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <button className="action-btn download-btn" style={{width: '100%', justifyContent: 'center', padding: '15px'}} onClick={() => navigate('/student/dashboard')}>
                        <i className="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    
                    <div className="glass-side-card" style={{borderColor: 'rgba(0, 255, 136, 0.2)'}}>
                        <h4 style={{marginBottom: "15px", color: '#00ff88'}}>AI Recommendation</h4>
                        <p style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5'}}>
                            {reportData.aiInsights.recommendations[0]}
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default StudentReport;
