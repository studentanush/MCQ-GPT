import api from '../../services/api';
import React, { useEffect, useState } from 'react';
import { 
  FaClock, 
  FaCalendarAlt, 
  FaTimes, 
  FaBroadcastTower, 
  FaEdit, 
  FaTrash, 
  FaSave,
  FaCheckCircle,
  FaSearch,
  FaSyncAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './GeneratedQuizzes.css';
import { toast } from 'react-toastify';

const GeneratedQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editedQuiz, setEditedQuiz] = useState(null);
    const navigate = useNavigate();

    useEffect(() => { fetchQuizzes(); }, []);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const response = await api.get("/quizzes/getUserQuizes");
            setQuizzes(response.data);
        } catch (err) {
            toast.error("Failed to load quizzes");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.delete(`/quizzes/delete/${id}`);
            setQuizzes(q => q.filter(quiz => quiz._id !== id));
            toast.success("Quiz deleted");
            if (selectedQuiz?._id === id) setSelectedQuiz(null);
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const handleSave = async () => {
        try {
            await api.put(`/quizzes/update/${editedQuiz._id}`, editedQuiz);
            setQuizzes(q => q.map(quiz => quiz._id === editedQuiz._id ? editedQuiz : quiz));
            setSelectedQuiz(editedQuiz);
            setEditMode(false);
            toast.success("Changes saved");
        } catch (err) {
            toast.error("Save failed");
        }
    };

    const filteredQuizzes = quizzes.filter(q => 
        q.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="generated-quizzes"><div className="report-loading"><div className="loading-spinner"></div></div></div>;

    return (
        <div className="generated-quizzes">
            <header className="library-header">
                <div>
                    <h1 className="library-title">Quiz Library</h1>
                    <p style={{color: 'rgba(255,255,255,0.4)', marginTop: '4px'}}>Manage and host your AI-generated assessments</p>
                </div>
                <button className="user-profile" onClick={fetchQuizzes}><FaSyncAlt /> Refresh</button>
            </header>

            <div className="library-filters">
                <div style={{position: 'relative', flex: 1}}>
                    <FaSearch style={{position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)'}} />
                    <input 
                        className="search-input" 
                        placeholder="Search quizzes..." 
                        style={{paddingLeft: '45px'}}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="action-btn download-btn" onClick={() => navigate('/educator/chat')}>+ New Quiz</button>
            </div>

            <div className="quiz-grid">
                {filteredQuizzes.length > 0 ? filteredQuizzes.map(quiz => (
                    <div key={quiz._id} className="library-card" onClick={() => setSelectedQuiz(quiz)}>
                        <div className={`card-status status-tag-${(quiz.status || 'draft').toLowerCase()}`}>
                            {quiz.status || 'Draft'}
                        </div>
                        <div className="card-icon"><i className="fas fa-file-alt"></i></div>
                        <h3 className="card-title">{quiz.title}</h3>
                        <div className="card-stats">
                            <div className="stat-row"><FaClock /> {quiz.time || 20} mins</div>
                            <div className="stat-row"><i className="fas fa-list"></i> {quiz.questions?.length || 0} Questions</div>
                            <div className="stat-row"><FaCalendarAlt /> {new Date(quiz.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="card-actions">
                            <button className="action-btn download-btn" style={{width: '100%'}} onClick={(e) => { e.stopPropagation(); navigate(`/educator/live-quiz/${quiz._id}`); }}>
                                <FaBroadcastTower /> Host Live
                            </button>
                        </div>
                    </div>
                )) : (
                    <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '100px 0'}}>
                        <div style={{fontSize: '3rem', marginBottom: '20px'}}>🔍</div>
                        <h3>No quizzes found</h3>
                        <p style={{color: 'rgba(255,255,255,0.4)'}}>Try adjusting your search or create a new quiz.</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedQuiz && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center quiz-modal-overlay p-6">
                    <div className="quiz-modal-content w-full max-w-5xl max-h-[90vh] flex flex-col">
                        <div className="modal-header flex justify-between items-center">
                            <div>
                                {editMode ? (
                                    <input 
                                        className="search-input" 
                                        value={editedQuiz.title} 
                                        onChange={e => setEditedQuiz({...editedQuiz, title: e.target.value})}
                                    />
                                ) : (
                                    <h2 style={{fontSize: '1.5rem', fontWeight: 700}}>{selectedQuiz.title}</h2>
                                )}
                                <div className="stat-row" style={{marginTop: '8px'}}>
                                    <span>{selectedQuiz.questions?.length} Questions</span>
                                    <span>•</span>
                                    <span>{selectedQuiz.time || 20} mins</span>
                                </div>
                            </div>
                            <button className="user-profile" onClick={() => { setSelectedQuiz(null); setEditMode(false); }}><FaTimes /></button>
                        </div>

                        <div className="modal-body overflow-y-auto flex-1">
                            {(editMode ? editedQuiz.questions : selectedQuiz.questions).map((q, idx) => (
                                <div key={idx} className="question-preview-card">
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                        <h4 style={{fontWeight: 700, color: 'var(--primary-glow)'}}>Question {idx + 1}</h4>
                                        <span className="status-badge" style={{background: 'rgba(255,255,255,0.05)'}}>{q.difficulty || 'Medium'}</span>
                                    </div>
                                    <p style={{fontSize: '1.1rem', marginBottom: '20px', lineHeight: '1.5'}}>{q.question}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt, i) => {
                                            const letter = String.fromCharCode(65 + i);
                                            const isCorrect = q.correctAnswerOption === letter;
                                            return (
                                                <div key={i} className={`option-preview ${isCorrect ? 'correct' : ''}`}>
                                                    <span style={{marginRight: '10px', opacity: 0.5}}>{letter}.</span> {opt}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {q.explanation && (
                                        <div style={{marginTop: '15px', padding: '12px', background: 'rgba(138, 43, 226, 0.05)', borderRadius: '10px', fontSize: '0.85rem'}}>
                                            <strong style={{color: 'var(--primary-glow)'}}>Explanation:</strong> {q.explanation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="modal-header" style={{borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none', display: 'flex', justifyContent: 'space-between'}}>
                            <button className="action-btn" style={{background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', borderColor: 'transparent'}} onClick={(e) => handleDelete(e, selectedQuiz._id)}>
                                <FaTrash /> Delete Quiz
                            </button>
                            <div style={{display: 'flex', gap: '12px'}}>
                                {editMode ? (
                                    <>
                                        <button className="action-btn" onClick={() => setEditMode(false)}>Cancel</button>
                                        <button className="action-btn download-btn" onClick={handleSave}><FaSave /> Save Changes</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="action-btn" onClick={() => { setEditedQuiz({...selectedQuiz}); setEditMode(true); }}><FaEdit /> Edit Quiz</button>
                                        <button className="action-btn download-btn" onClick={() => navigate(`/educator/live-quiz/${selectedQuiz._id}`)}><FaBroadcastTower /> Host Live Session</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneratedQuizzes;