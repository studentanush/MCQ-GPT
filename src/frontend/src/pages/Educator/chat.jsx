import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Sparkles, Loader2, Download, Save, RefreshCw, X, FileText, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './chat.css';
import { toast } from 'react-toastify';

const Chat = () => {
    const [messages, setMessages] = useState([
        { type: 'assistant', content: "Hello! I'm your AI Quiz Assistant. Upload a document or type a topic, and I'll generate a custom quiz for you in seconds." }
    ]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAgentic, setShowAgentic] = useState(false);
    const [agenticUrl, setAgenticUrl] = useState('');

    const msgEndRef = useRef(null);
    const fileRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        if (!input.trim() && !file) return;
        const userMsg = input.trim() || (file ? `Document: ${file.name}` : "");
        setMessages(p => [...p, { type: 'user', content: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            // Check for generation command
            const prompt = userMsg.toLowerCase();
            const numMatch = prompt.match(/(\d+)/);
            const num = numMatch ? parseInt(numMatch[1]) : 10;

            let response;
            if (file) {
                const fd = new FormData();
                fd.append('file', file);
                const up = await api.post('/upload/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                response = await api.post('/quizzes/generate-from-file', { filePath: up.data.filePath, num_questions: num });
                setFile(null);
            } else {
                response = await api.post('/quizzes/generate-from-prompt', { prompt: userMsg, num_questions: num });
            }

            const quiz = response.data.quiz || response.data;
            setMessages(p => [...p, { 
                type: 'assistant', 
                content: `Done! I've generated "${quiz.title}". You can preview the questions below.`,
                quizData: quiz 
            }]);
        } catch (err) {
            setMessages(p => [...p, { type: 'assistant', content: "Sorry, I ran into an issue generating the quiz. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveQuiz = async (quiz) => {
        try {
            await api.post("/quizzes/create", { ...quiz, time: quiz.time || "20", status: 'Published' });
            toast.success("Quiz saved to library!");
        } catch (err) {
            toast.error("Failed to save quiz");
        }
    };

    return (
        <div className="chat-container">
            <header className="chat-header">
                <div>
                    <h2 style={{fontWeight: 800, fontSize: '1.2rem'}}>AI Quiz Assistant</h2>
                    <p style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)'}}>Powered by Gemini 2.5 Flash</p>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                    <button className="chat-tool-btn" onClick={() => navigate('/educator/generated')}><FileText size={14}/> Library</button>
                    <button className="chat-tool-btn" onClick={() => navigate('/educator/dashboard')}><X size={14}/></button>
                </div>
            </header>

            <div className="chat-messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message-wrapper message-${m.type}`}>
                        <div className="message-bubble">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.content}</ReactMarkdown>
                        </div>
                        {m.quizData && (
                            <div className="quiz-preview-message">
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                                    <h3 style={{fontWeight: 700}}>{m.quizData.title}</h3>
                                    <span className="status-badge status-published">{m.quizData.questions?.length} Questions</span>
                                </div>
                                <div style={{maxHeight: '300px', overflowY: 'auto', marginBottom: '20px'}}>
                                    {m.quizData.questions.slice(0, 3).map((q, idx) => (
                                        <div key={idx} className="preview-question-card">
                                            <p style={{fontSize: '0.9rem', marginBottom: '10px'}}>{q.question}</p>
                                            <div style={{fontSize: '0.8rem', opacity: 0.6}}>Correct: {q.correctAnswer}</div>
                                        </div>
                                    ))}
                                    {m.quizData.questions.length > 3 && (
                                        <p style={{textAlign: 'center', fontSize: '0.8rem', opacity: 0.4}}>+ {m.quizData.questions.length - 3} more questions</p>
                                    )}
                                </div>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <button className="action-btn download-btn" style={{flex: 1}} onClick={() => handleSaveQuiz(m.quizData)}>
                                        <Save size={16}/> Save to Library
                                    </button>
                                    <button className="action-btn" style={{flex: 1}} onClick={() => navigate('/educator/generated')}>
                                        <FileText size={16}/> View All
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {loading && <div className="message-wrapper message-assistant"><div className="message-bubble"><Loader2 className="animate-spin" /> Analyzing and generating...</div></div>}
                <div ref={msgEndRef} />
            </div>

            <div className="chat-input-wrapper">
                <div className="chat-input-bar">
                    {file && (
                        <div style={{padding: '8px 16px', background: 'rgba(138,43,226,0.1)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '10px', width: 'fit-content', marginLeft: '12px'}}>
                            <FileText size={14}/> <span style={{fontSize: '0.8rem'}}>{file.name}</span>
                            <X size={14} style={{cursor: 'pointer'}} onClick={() => setFile(null)}/>
                        </div>
                    )}
                    <div className="input-top">
                        <input 
                            className="input-main" 
                            placeholder={file ? "How many questions?" : "Type a topic or upload a file..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                        />
                        <button className="action-btn download-btn" style={{minWidth: '50px', padding: '10px'}} onClick={handleSend} disabled={loading}>
                            <Send size={18}/>
                        </button>
                    </div>
                    <div className="input-actions">
                        <div style={{display: 'flex', gap: '8px'}}>
                            <button className="chat-tool-btn" onClick={() => fileRef.current.click()}><Upload size={14}/> {file ? "Change File" : "Upload Document"}</button>
                            <button className="chat-tool-btn" onClick={() => setShowAgentic(true)}><Sparkles size={14}/> Agentic Mode</button>
                        </div>
                        <p style={{fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)'}}>Shift + Enter for new line</p>
                    </div>
                </div>
            </div>

            <input type="file" ref={fileRef} style={{display: 'none'}} onChange={e => setFile(e.target.files[0])} accept=".pdf,.docx,.txt" />

            {showAgentic && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center quiz-modal-overlay p-6">
                    <div className="quiz-modal-content w-full max-w-md p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 style={{fontWeight: 800}}>Agentic Generation</h2>
                            <X style={{cursor: 'pointer'}} onClick={() => setShowAgentic(false)}/>
                        </div>
                        <p style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '20px'}}>Enter a URL to scrape content and generate a quiz.</p>
                        <input className="search-input" style={{width: '100%', marginBottom: '20px'}} placeholder="https://wikipedia.org/..." value={agenticUrl} onChange={e => setAgenticUrl(e.target.value)} />
                        <button className="action-btn download-btn" style={{width: '100%'}} onClick={() => { setInput(`Scrape this URL and generate 10 questions: ${agenticUrl}`); setShowAgentic(false); handleSend(); }}>Analyze & Generate</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;