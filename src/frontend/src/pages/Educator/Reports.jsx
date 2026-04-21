import React, { useState, useEffect } from 'react';
import './Reports.css';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
    FaChartBar, FaUserGraduate, FaQuestionCircle, FaRobot, 
    FaFilter, FaFileAlt, FaCalendar, FaLayerGroup,
    FaFilePdf, FaFileCsv, FaFileExcel, FaArrowLeft, FaSync
} from 'react-icons/fa';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedQuiz, setSelectedQuiz] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [quizOptions, setQuizOptions] = useState([]);
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const res = await api.get("/quizzes/getUserQuizes");
                setQuizOptions(res.data);
            } catch (err) {
                toast.error("Failed to load quizzes");
            }
        };
        fetchQuizzes();
    }, []);

    const handleGenerateReport = async () => {
        if (!selectedQuiz) return toast.warning("Select a quiz first");
        setIsLoading(true);
        try {
            const res = await api.get("/quizzes/educatorReport", { params: { quizID: selectedQuiz } });
            setReportData(res.data);
            toast.success("Report generated!");
        } catch (err) {
            toast.error("Failed to generate report");
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreClass = (score) => {
        if (score >= 90) return 'score-excellent';
        if (score >= 75) return 'score-good';
        if (score >= 50) return 'score-average';
        return 'score-poor';
    };

    return (
        <div className="reports-page">
            <header className="reports-header">
                <div>
                    <h1>Analytics Room</h1>
                    <p style={{color: 'rgba(255,255,255,0.4)', marginTop: '4px'}}>Track performance, identify gaps, and export insights.</p>
                </div>
                <button className="user-profile" onClick={() => window.history.back()}><FaArrowLeft /> Dashboard</button>
            </header>

            <div className="filter-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
                    <FaFilter color="var(--primary-glow)"/> <h3 style={{fontSize: '1rem', fontWeight: 700}}>Filter Parameters</h3>
                </div>
                <div className="filter-grid">
                    <div className="filter-group">
                        <label><FaFileAlt /> Quiz Source</label>
                        <select className="filter-select" value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)}>
                            <option value="">Select Quiz...</option>
                            {quizOptions.map(q => <option key={q._id} value={q._id}>{q.title}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{marginTop: '30px', display: 'flex', gap: '12px'}}>
                    <button className="action-btn download-btn" onClick={handleGenerateReport} disabled={isLoading}>
                        {isLoading ? <FaSync className="animate-spin"/> : <FaChartBar />} Generate Analysis
                    </button>
                    <button className="action-btn" onClick={() => { setReportData(null); setSelectedQuiz(''); }}>Reset</button>
                </div>
            </div>

            {reportData ? (
                <>
                    <div className="reports-tabs">
                        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><FaChartBar /> Overview</button>
                        <button className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}><FaUserGraduate /> Students</button>
                        <button className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}><FaQuestionCircle /> Questions</button>
                    </div>

                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon"><FaUserGraduate /></div>
                            <div><div className="pill-label">Participants</div><div className="pill-value">{reportData.totalStudents}</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><FaChartBar /></div>
                            <div><div className="pill-label">Avg. Score</div><div className="pill-value">{reportData.avgScore}%</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><FaSync /></div>
                            <div><div className="pill-label">Top Score</div><div className="pill-value">100%</div></div>
                        </div>
                    </div>

                    {activeTab === 'students' && (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Student</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Time</th></tr>
                                </thead>
                                <tbody>
                                    {reportData.studentPerformance.map((s, i) => (
                                        <tr key={i}>
                                            <td className="student-cell"><div className="student-avatar">{s.studentName.charAt(0)}</div>{s.studentName}</td>
                                            <td><span className={`status-badge ${getScoreClass(s.percentage)}`}>{s.percentage}%</span></td>
                                            <td style={{color: '#00ff88'}}>+{s.score}</td>
                                            <td style={{color: '#ff6b6b'}}>-{s.total - s.score}</td>
                                            <td>{s.timeTaken || "N/A"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="filter-card" style={{margin: 0}}>
                                <h3 style={{marginBottom: '20px'}}><FaRobot /> AI Insights</h3>
                                <div className="message-bubble" style={{background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'}}>
                                    <p style={{fontSize: '0.9rem', lineHeight: 1.6}}> Based on {reportData.totalStudents} attempts, the average score is {reportData.avgScore}%. {reportData.avgScore < 70 ? "The material seems challenging for the class. Consider revisiting the difficult questions." : "The class has a strong grasp of this material."}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'questions' && (
                        <div className="grid grid-cols-1 gap-6">
                            {reportData.questionAnalysis.map((q, i) => (
                                <div key={i} className="filter-card" style={{margin: 0}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                        <h4 style={{fontWeight: 700}}>Q{q.questionIndex}. {q.question.substring(0, 80)}...</h4>
                                        <span className={`status-badge ${getScoreClass(q.correctRate)}`}>{q.correctRate}% Correct</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className={`accuracy-bar ${getScoreClass(q.correctRate)}`} style={{width: `${q.correctRate}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div style={{textAlign: 'center', padding: '100px 0'}}>
                    <div style={{fontSize: '3rem', opacity: 0.2}}>📊</div>
                    <h3 style={{opacity: 0.5}}>No report generated</h3>
                    <p style={{opacity: 0.3}}>Select a quiz above and click "Generate Analysis"</p>
                </div>
            )}
        </div>
    );
};

export default Reports;
