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
  FaQuestionCircle
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';



const GeneratedQuizzes = () => {
  const [quizes, setQuizes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedQuiz, setEditedQuiz] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeader = () => {
    const eduInfo = sessionStorage.getItem('edu_info');
    if (!eduInfo) return null;
    const { token } = JSON.parse(eduInfo);
    return { Authorization: token };
  };

  // ─── Fetch quizzes ────────────────────────────────────────
  const fetchQuizes = async () => {
    const headers = getAuthHeader();
    if (!headers) {
      setLoading(false);
      setError('Please log in to view your quizzes.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.get("/quizzes/getUserQuizes");
      setQuizes(response.data);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizes();
  }, []);

  // ─── Handlers ────────────────────────────────────────────
  const handleOpenDetail = (quiz) => {
    setSelectedQuiz(quiz);
    setEditMode(false);
    setEditedQuiz(null);
  };

  const handleHostLive = (e, quizId) => {
    e.stopPropagation();
    navigate(`/educator/live-quiz/${quizId}`);
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedQuiz(JSON.parse(JSON.stringify(selectedQuiz))); // deep clone
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedQuiz(null);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${selectedQuiz.title}"? This cannot be undone.`)) return;

    const headers = getAuthHeader();
    if (!headers) return;

    setDeleting(true);
    try {
      await api.delete(`/quizzes/delete/${selectedQuiz._id}`);
      setQuizes(prev => prev.filter(q => q._id !== selectedQuiz._id));
      setSelectedQuiz(null);
      showToast('Quiz deleted successfully.', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.response?.data?.message || 'Failed to delete quiz.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!editedQuiz) return;

    const headers = getAuthHeader();
    if (!headers) return;

    setSaving(true);
    try {
      const response = await api.put(
        `/quizzes/update/${editedQuiz._id}`,
        {
          title: editedQuiz.title,
          time: editedQuiz.time,
          status: editedQuiz.status,
          questions: editedQuiz.questions,
        }
      );

      // Update local state
      setQuizes(prev => prev.map(q => q._id === editedQuiz._id ? { ...q, ...editedQuiz } : q));
      setSelectedQuiz(editedQuiz);
      setEditMode(false);
      setEditedQuiz(null);
      showToast('Quiz saved successfully!', 'success');
    } catch (err) {
      console.error('Save error:', err);
      // If backend doesn't have update endpoint yet, save optimistically
      setQuizes(prev => prev.map(q => q._id === editedQuiz._id ? { ...q, ...editedQuiz } : q));
      setSelectedQuiz(editedQuiz);
      setEditMode(false);
      setEditedQuiz(null);
      showToast('Changes saved locally. (Backend update endpoint needed)', 'warning');
    } finally {
      setSaving(false);
    }
  };

  // ─── Formatting ──────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusStyle = (status) => {
    if (!status) return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-800' };
    const s = status.toLowerCase();
    if (s === 'published') return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-800' };
    if (s === 'live') return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700' };
    return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-800' };
  };

  const currentData = editMode ? editedQuiz : selectedQuiz;

  return (
    <div className="min-h-screen bg-[#0D0B14] text-gray-200 p-8 font-sans relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all
          ${toast.type === 'success' ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700' :
            toast.type === 'error'   ? 'bg-red-900/80 text-red-300 border border-red-700' :
            toast.type === 'warning' ? 'bg-yellow-900/80 text-yellow-300 border border-yellow-700' :
            'bg-violet-900/80 text-violet-300 border border-violet-700'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-10 border-b border-violet-900/30 pb-4 flex justify-between items-center">
        <h2 className="text-3xl font-light tracking-wide text-violet-100">Quiz Library</h2>
        <button
          onClick={fetchQuizes}
          className="text-sm text-violet-400 hover:text-violet-200 flex items-center gap-2 transition-colors"
        >
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-violet-400 animate-pulse">
          <i className="fas fa-spinner fa-spin mr-3 text-xl"></i>
          Loading Library...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {quizes.length > 0 ? (
            quizes.map((quiz) => {
              const st = getStatusStyle(quiz.status);
              return (
                <div
                  key={quiz._id}
                  onClick={() => handleOpenDetail(quiz)}
                  className="group relative bg-[#15121F] rounded-xl border border-violet-900/20 p-6 cursor-pointer hover:border-violet-500/50 hover:bg-[#1A1625] transition-all duration-300 shadow-lg shadow-black/40"
                >
                  {/* Status badge */}
                  <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${st.bg} ${st.text} border ${st.border}`}>
                    {quiz.status || 'Draft'}
                  </div>

                  {/* Quiz Icon */}
                  <div className="w-10 h-10 rounded-lg bg-violet-900/30 flex items-center justify-center mb-4">
                    <FaQuestionCircle className="text-violet-400 text-lg" />
                  </div>

                  <h3 className="text-lg font-medium text-white mb-3 pr-16 line-clamp-2 min-h-[52px]">
                    {quiz.title}
                  </h3>

                  <div className="flex flex-col gap-2 text-sm text-gray-500 mb-5">
                    <div className="flex items-center gap-2">
                      <FaClock className="text-violet-500" />
                      {quiz.time ? `${quiz.time} min` : 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-violet-500" />
                      {formatDate(quiz.createdAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-list text-violet-500"></i>
                      {quiz.questions?.length || 0} Questions
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleHostLive(e, quiz._id)}
                    className="w-full flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-600 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-violet-900/20"
                  >
                    <FaBroadcastTower /> Host Live
                  </button>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-20">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-gray-400 text-lg">No quizzes found.</p>
              <p className="text-gray-600 text-sm mt-2">Create your first quiz using the Chat interface.</p>
              <button
                onClick={() => navigate('/educator/chat')}
                className="mt-6 px-6 py-3 bg-violet-700 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
              >
                Create Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* DETAIL / EDIT MODAL */}
      {currentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#15121F] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-violet-900/30 shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-violet-900/20 bg-[#1A1625]">
              <div className="flex-1 pr-4">
                {editMode ? (
                  <input
                    className="text-xl font-semibold text-white bg-transparent border-b border-violet-500 w-full focus:outline-none pb-1"
                    value={editedQuiz.title}
                    onChange={(e) => setEditedQuiz(prev => ({ ...prev, title: e.target.value }))}
                  />
                ) : (
                  <h2 className="text-2xl font-semibold text-white">{currentData.title}</h2>
                )}
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-3">
                  <span>{currentData.questions?.length || 0} Questions</span>
                  <span>•</span>
                  {editMode ? (
                    <input
                      className="bg-transparent border-b border-violet-500 text-gray-400 w-20 focus:outline-none text-sm"
                      value={editedQuiz.time}
                      onChange={(e) => setEditedQuiz(prev => ({ ...prev, time: e.target.value }))}
                      placeholder="20"
                    />
                  ) : (
                    <span>{currentData.time} min</span>
                  )}
                  {editMode && (
                    <>
                      <span>•</span>
                      <select
                        className="bg-[#1A1625] text-gray-400 border border-violet-900/30 rounded px-2 py-0.5 text-sm focus:outline-none"
                        value={editedQuiz.status || 'draft'}
                        onChange={(e) => setEditedQuiz(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => { setSelectedQuiz(null); setEditMode(false); setEditedQuiz(null); }}
                className="text-gray-500 hover:text-white transition-colors text-xl flex-shrink-0"
              >
                <FaTimes />
              </button>
            </div>

            {/* Scrollable Questions Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {currentData.questions && currentData.questions.map((q, index) => (
                <div key={index} className="bg-[#0D0B14] p-5 rounded-xl border border-violet-900/10">
                  <div className="flex gap-3 mb-4 items-start">
                    <span className="text-violet-500 font-bold text-lg flex-shrink-0">Q{index + 1}.</span>
                    {editMode ? (
                      <textarea
                        className="flex-1 bg-[#1A1625] text-gray-200 rounded-lg p-2 border border-violet-900/30 text-base focus:outline-none focus:border-violet-500 resize-none"
                        value={editedQuiz.questions[index].question}
                        rows={2}
                        onChange={(e) => {
                          const newQs = [...editedQuiz.questions];
                          newQs[index] = { ...newQs[index], question: e.target.value };
                          setEditedQuiz(prev => ({ ...prev, questions: newQs }));
                        }}
                      />
                    ) : (
                      <p className="text-gray-200 text-base leading-relaxed">{q.question}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 ml-8">
                    {(editMode ? editedQuiz.questions[index].options : q.options).map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isCorrect = (editMode ? editedQuiz.questions[index].correctAnswerOption : q.correctAnswerOption) === letter;
                      return (
                        <div
                          key={i}
                          className={`px-4 py-3 rounded-lg border text-sm ${isCorrect ? 'bg-emerald-900/20 border-emerald-800 text-emerald-100' : 'bg-[#1E1B2E] border-gray-800 text-gray-400'}`}
                        >
                          <span className={`font-semibold mr-2 ${isCorrect ? 'text-emerald-400' : 'text-violet-400'}`}>{letter}.</span>
                          {editMode ? (
                            <input
                              className="bg-transparent text-inherit focus:outline-none w-[calc(100%-2rem)]"
                              value={editedQuiz.questions[index].options[i]}
                              onChange={(e) => {
                                const newQs = [...editedQuiz.questions];
                                const newOpts = [...newQs[index].options];
                                newOpts[i] = e.target.value;
                                newQs[index] = { ...newQs[index], options: newOpts };
                                setEditedQuiz(prev => ({ ...prev, questions: newQs }));
                              }}
                            />
                          ) : opt}
                        </div>
                      );
                    })}
                  </div>

                  <div className="ml-8 mt-2 p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-lg flex items-start gap-2">
                    <FaCheckCircle className="text-emerald-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-emerald-500 font-bold text-sm block">Correct Answer:</span>
                      <span className="text-emerald-100 text-sm">
                        {q.correctAnswer} (Option {q.correctAnswerOption})
                      </span>
                      {q.explanation && (
                        <p className="text-gray-500 text-xs mt-1 italic border-t border-emerald-900/30 pt-1">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Difficulty & Subtopics */}
                  <div className="ml-8 mt-3 flex gap-3 flex-wrap">
                    {q.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${q.difficulty === 'Easy' ? 'bg-green-900/30 text-green-400' :
                          q.difficulty === 'Hard' ? 'bg-red-900/30 text-red-400' :
                          'bg-yellow-900/30 text-yellow-400'}`}>
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-violet-900/20 bg-[#1A1625] flex justify-between items-center gap-3">
              <div>
                {!editMode && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    <FaTrash size={13} />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {editMode ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-colors disabled:opacity-50"
                    >
                      <FaSave size={13} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                    >
                      <FaEdit size={13} /> Edit
                    </button>
                    <button
                      onClick={(e) => { setSelectedQuiz(null); handleHostLive(e, currentData._id); }}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white shadow-lg transition-colors"
                    >
                      <FaBroadcastTower size={13} /> Host Live
                    </button>
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