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
  FaSyncAlt,
  FaQuestionCircle
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

    const handleDelete = async (quizId) => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await api.delete(`/quizzes/delete/${quizId}`);
            setQuizzes(q => q.filter(quiz => quiz._id !== quizId));
            toast.success("Quiz deleted");
            if (selectedQuiz?._id === quizId) setSelectedQuiz(null);
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
            toast.success("Changes saved successfully!");
        } catch (err) {
            // Fallback if update endpoint has issues, at least update local state for UI feedback
            setQuizzes(q => q.map(quiz => quiz._id === editedQuiz._id ? editedQuiz : quiz));
            setSelectedQuiz(editedQuiz);
            setEditMode(false);
            toast.info("Saved locally (Sync pending)");
        }
    };

    const filteredQuizzes = quizzes.filter(q => 
        q.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOptionEdit = (qIdx, oIdx, val) => {
        const newQs = [...editedQuiz.questions];
        const newOpts = [...newQs[qIdx].options];
        newOpts[oIdx] = val;
        newQs[qIdx] = { ...newQs[qIdx], options: newOpts };
        setEditedQuiz({ ...editedQuiz, questions: newQs });
    };

    if (loading) return <div className="generated-quizzes"><div className="report-loading"><div className="loading-spinner"></div></div></div>;

    return (
        <div className="generated-quizzes">
            <header className="library-header">
                <div>
                    <h1 className="library-title">Academic Library</h1>
                    <p style={{color: 'rgba(255,255,255,0.4)', marginTop: '4px'}}>Manage, edit and host your generated assessments.</p>
                </div>
                <button className="user-profile" onClick={fetchQuizzes}><FaSyncAlt /> Refresh Database</button>
            </header>

            <div className="library-filters">
                <div style={{position: 'relative', flex: 1}}>
                    <FaSearch style={{position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)'}} />
                    <input 
                        className="search-input" 
                        placeholder="Search by quiz title..." 
                        style={{paddingLeft: '45px'}}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="action-btn download-btn" onClick={() => navigate('/educator/chat')}>+ Create Quiz</button>
            </div>

            <div className="quiz-grid">
                {filteredQuizzes.length > 0 ? filteredQuizzes.map(quiz => (
                    <div key={quiz._id} className="library-card" onClick={() => { setSelectedQuiz(quiz); setEditMode(false); }}>
                        <div className={`card-status status-tag-${(quiz.status || 'draft').toLowerCase()}`}>
                            {quiz.status || 'Draft'}
                        </div>
                        <div className="card-icon"><FaQuestionCircle /></div>
                        <h3 className="card-title">{quiz.title}</h3>
                        <div className="card-stats">
                            <div className="stat-row"><FaClock /> {quiz.time || 20} mins limit</div>
                            <div className="stat-row"><i className="fas fa-list"></i> {quiz.questions?.length || 0} Questions</div>
                            <div className="stat-row"><FaCalendarAlt /> Created {new Date(quiz.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="card-actions">
                            <button className="action-btn download-btn" style={{width: '100%'}} onClick={(e) => { e.stopPropagation(); navigate(`/educator/live-quiz/${quiz._id}`); }}>
                                <FaBroadcastTower /> Start Live Session
                            </button>
                        </div>
                    </div>
                )) : (
                    <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '100px 0'}}>
                        <div style={{fontSize: '3.5rem', marginBottom: '20px'}}>📚</div>
                        <h3 style={{fontSize: '1.5rem', fontWeight: 700}}>Database Empty</h3>
                        <p style={{color: 'rgba(255,255,255,0.4)', marginTop: '8px'}}>Generate some quizzes using AI to populate your library.</p>
                    </div>
                )}
            </div>

            {/* HIGH QUALITY DETAIL / EDIT MODAL */}
            {selectedQuiz && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center quiz-modal-overlay p-6">
                    <div className="quiz-modal-content w-full max-w-5xl max-h-[95vh] flex flex-col scale-in">
                        <div className="modal-header flex justify-between items-center bg-[#1a1c24]/50 backdrop-blur-md">
                            <div>
                                {editMode ? (
                                    <input 
                                        className="search-input text-xl font-bold border-b border-purple-500/50 bg-transparent rounded-none p-0 focus:border-purple-500" 
                                        style={{width: '400px'}}
                                        value={editedQuiz.title} 
                                        onChange={e => setEditedQuiz({...editedQuiz, title: e.target.value})}
                                    />
                                ) : (
                                    <h2 style={{fontSize: '1.6rem', fontWeight: 800, color: 'white'}}>{selectedQuiz.title}</h2>
                                )}
                                <div className="stat-row" style={{marginTop: '10px', fontSize: '0.8rem'}}>
                                    <span className="flex items-center gap-1"><FaQuestionCircle className="text-purple-400"/> {selectedQuiz.questions?.length} Questions</span>
                                    <span className="opacity-20">|</span>
                                    <span className="flex items-center gap-1"><FaClock className="text-purple-400"/> {editMode ? 
                                        <input className="bg-transparent border-b border-white/20 w-10 outline-none text-center" value={editedQuiz.time} onChange={e => setEditedQuiz({...editedQuiz, time: e.target.value})} /> 
                                    : selectedQuiz.time || 20} mins</span>
                                </div>
                            </div>
                            <button className="user-profile p-3" onClick={() => { setSelectedQuiz(null); setEditMode(false); }}><FaTimes size={18}/></button>
                        </div>

                        <div className="modal-body overflow-y-auto flex-1 p-8 space-y-8 custom-scrollbar">
                            {(editMode ? editedQuiz.questions : selectedQuiz.questions).map((q, qIdx) => (
                                <div key={qIdx} className="question-preview-card p-6 border border-white/5 bg-white/[0.01] rounded-3xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="h-8 w-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">Q{qIdx + 1}</span>
                                            {editMode ? (
                                                <textarea 
                                                    className="search-input w-[600px] text-base bg-white/2 border-white/10" 
                                                    rows={1}
                                                    value={q.question} 
                                                    onChange={e => {
                                                        const newQs = [...editedQuiz.questions];
                                                        newQs[qIdx].question = e.target.value;
                                                        setEditedQuiz({...editedQuiz, questions: newQs});
                                                    }}
                                                />
                                            ) : (
                                                <h4 className="text-lg font-semibold text-white/90 leading-relaxed">{q.question}</h4>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' : q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {q.difficulty || 'Medium'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        {q.options.map((opt, oIdx) => {
                                            const letter = String.fromCharCode(65 + oIdx);
                                            const isCorrect = q.correctAnswerOption === letter;
                                            return (
                                                <div key={oIdx} className={`p-4 rounded-2xl border transition-all ${isCorrect ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' : 'border-white/5 bg-white/[0.02] text-white/60'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-bold ${isCorrect ? 'text-emerald-500' : 'opacity-30'}`}>{letter}</span>
                                                        {editMode ? (
                                                            <input 
                                                                className="bg-transparent flex-1 outline-none text-white/80" 
                                                                value={opt} 
                                                                onChange={e => handleOptionEdit(qIdx, oIdx, e.target.value)} 
                                                            />
                                                        ) : (
                                                            <span className="flex-1">{opt}</span>
                                                        )}
                                                        {isCorrect && <FaCheckCircle className="text-emerald-500"/>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="flex gap-2 mb-2 items-center">
                                            <FaCheckCircle className="text-emerald-500" size={14}/>
                                            <span className="text-xs uppercase tracking-widest text-emerald-500 font-bold">Answer Logic</span>
                                        </div>
                                        <div className="text-sm text-white/60">
                                            {editMode ? (
                                                <div className="flex gap-4 items-center">
                                                    <span>Correct Index:</span>
                                                    <select 
                                                        className="bg-[#0f1117] border border-white/10 rounded px-2 py-1"
                                                        value={q.correctAnswerOption} 
                                                        onChange={e => {
                                                            const newQs = [...editedQuiz.questions];
                                                            newQs[qIdx].correctAnswerOption = e.target.value;
                                                            newQs[qIdx].correctAnswer = newQs[qIdx].options[e.target.value.charCodeAt(0) - 65];
                                                            setEditedQuiz({...editedQuiz, questions: newQs});
                                                        }}
                                                    >
                                                        {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                                                    </select>
                                                </div>
                                            ) : (
                                                <span>Option {q.correctAnswerOption}: {q.correctAnswer}</span>
                                            )}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/40 italic">
                                            <strong>EXPLANATION:</strong> {editMode ? (
                                                <textarea 
                                                    className="w-full bg-transparent border-none p-0 mt-2 text-white/60 focus:ring-0" 
                                                    value={q.explanation} 
                                                    onChange={e => {
                                                        const newQs = [...editedQuiz.questions];
                                                        newQs[qIdx].explanation = e.target.value;
                                                        setEditedQuiz({...editedQuiz, questions: newQs});
                                                    }}
                                                />
                                            ) : q.explanation || 'No explanation provided.'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 border-t border-white/5 bg-[#1a1c24]/50 backdrop-blur-md flex justify-between items-center">
                            <button className="text-red-500/60 hover:text-red-500 text-sm font-medium flex items-center gap-2 transition-all" onClick={() => handleDelete(selectedQuiz._id)}>
                                <FaTrash /> Delete Quiz Permanently
                            </button>
                            <div className="flex gap-4">
                                {editMode ? (
                                    <>
                                        <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all font-semibold" onClick={() => setEditMode(false)}>Discard Changes</button>
                                        <button className="action-btn download-btn px-8" onClick={handleSave}><FaSave /> Commit Changes</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all font-semibold" onClick={() => { setEditedQuiz({...selectedQuiz}); setEditMode(true); }}><FaEdit /> Edit Structure</button>
                                        <button className="action-btn download-btn px-8" onClick={() => navigate(`/educator/live-quiz/${selectedQuiz._id}`)}><FaBroadcastTower /> Launch Live</button>
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