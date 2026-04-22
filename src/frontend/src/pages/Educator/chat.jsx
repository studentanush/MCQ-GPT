import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Sparkles, Loader2, Download, Save, RefreshCw, X, FileText, CheckCircle, Info } from 'lucide-react';
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
        { 
            type: 'assistant', 
            content: "Hello! I'm your AI Quiz Assistant. Upload a document (PDF, DOCX, TXT) or provide a topic prompt, and I'll generate a professional quiz for you." 
        }
    ]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationContext, setConversationContext] = useState({ hasFile: false, lastQuizParams: null });
    const [showAgentic, setShowAgentic] = useState(false);
    const [agenticUrl, setAgenticUrl] = useState('');
    const [agenticNum, setAgenticNum] = useState(10);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const FormattedMessage = ({ content }) => (
        <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                p: ({ ...props }) => <p className="leading-relaxed mb-2" {...props} />,
                h1: ({ ...props }) => <h1 className="text-xl font-bold my-2" {...props} />,
                h2: ({ ...props }) => <h2 className="text-lg font-semibold my-2" {...props} />,
                strong: ({ ...props }) => <strong className="font-bold text-white" {...props} />,
            }}
        >
            {content}
        </ReactMarkdown>
    );

    const callLLM = async (userPrompt, context) => {
        const prompt = userPrompt.toLowerCase();
        
        // 1. Check for text generation patterns "X questions on topic"
        const textMatch = prompt.match(/(\d+)\s*(questions?|mcqs?|quiz)/i);
        if (textMatch && !context.hasFile) {
            return `generate_text:${parseInt(textMatch[1])}:${userPrompt}`;
        }

        // 2. Check for regeneration
        if (prompt.includes('regenerate') || prompt.includes('try again')) {
            if (context.lastQuizParams) return `regenerate:${context.lastQuizParams.numQuestions}`;
        }

        // 3. Check for file-based generation "give me 10 questions"
        if (context.hasFile && textMatch) {
            return `generate:${parseInt(textMatch[1])}`;
        }

        // 4. Default: Conversational AI
        try {
            const response = await api.post("/quizzes/chat", { 
                message: userPrompt, 
                context: { hasFile: context.hasFile } 
            });
            return response.data.reply;
        } catch (err) {
            return `generate_text_prompt:${userPrompt}`;
        }
    };

    const generateQuiz = async (numQuestions, isTextPrompt = false, textPrompt = '') => {
        setIsLoading(true);
        try {
            let response;
            if (isTextPrompt) {
                response = await api.post("/quizzes/generate", {
                    text: textPrompt,
                    num_questions: numQuestions
                });
            } else {
                const formData = new FormData();
                formData.append('file', file);
                const upRes = await api.post('/upload/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                response = await api.post('/quizzes/generate-from-file', {
                    filePath: upRes.data.filePath,
                    num_questions: numQuestions
                });
            }

            const quizData = response.data.quiz || response.data;
            setConversationContext(prev => ({ ...prev, lastQuizParams: { numQuestions, isTextPrompt, textPrompt } }));
            
            setMessages(prev => [...prev, {
                type: 'success',
                content: `Created "${quizData.title}" with ${quizData.questions.length} questions.`,
                quizData
            }]);
            toast.success("Quiz generated successfully!");
        } catch (err) {
            setMessages(prev => [...prev, { type: 'error', content: `Generation failed: ${err.response?.data?.message || err.message}` }]);
            toast.error("Failed to generate quiz");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        setMessages(p => [...p, { type: 'user', content: userMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            const llmAction = await callLLM(userMsg, conversationContext);
            
            if (llmAction.startsWith('generate:')) {
                const num = parseInt(llmAction.split(':')[1]);
                await generateQuiz(num, false);
            } else if (llmAction.startsWith('generate_text:')) {
                const parts = llmAction.split(':');
                await generateQuiz(parseInt(parts[1]), true, parts.slice(2).join(':'));
            } else if (llmAction.startsWith('generate_text_prompt:')) {
                const prompt = llmAction.substring('generate_text_prompt:'.length);
                const num = prompt.match(/(\d+)/)?.[0] || 10;
                await generateQuiz(num, true, prompt);
            } else if (llmAction.startsWith('regenerate:')) {
                await generateQuiz(parseInt(llmAction.split(':')[1]), conversationContext.lastQuizParams?.isTextPrompt, conversationContext.lastQuizParams?.textPrompt);
            } else {
                setMessages(p => [...p, { type: 'assistant', content: llmAction }]);
            }
        } catch (err) {
            setMessages(p => [...p, { type: 'assistant', content: "I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setConversationContext(p => ({ ...p, hasFile: true }));
            setMessages(p => [...p, { type: 'user', content: `Uploaded: ${selectedFile.name}` }]);
            setMessages(p => [...p, { type: 'assistant', content: `Received "${selectedFile.name}". How many questions should I generate from it?` }]);
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

    const handleAgentic = async () => {
        setIsLoading(true);
        setShowAgentic(false);
        setMessages(p => [...p, { type: 'user', content: `Generate ${agenticNum} questions from URL: ${agenticUrl}` }]);
        try {
            const res = await api.post("/quizzes/agentic", { url: agenticUrl, num_questions: agenticNum });
            const quiz = res.data.quiz || res.data;
            setMessages(p => [...p, { type: 'success', content: `Agentic quiz "${quiz.title}" generated!`, quizData: quiz }]);
        } catch (err) {
            toast.error("Agentic generation failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <header className="chat-header">
                <div>
                    <h2 style={{fontWeight: 800, fontSize: '1.2rem'}}>AI Quiz Assistant</h2>
                    <p style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)'}}>Intelligent Quiz Generation Engine</p>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                    <button className="chat-tool-btn" onClick={() => navigate('/educator/generated')}><FileText size={14}/> Library</button>
                    <button className="chat-tool-btn" onClick={() => navigate('/educator/dashboard')}><X size={14}/></button>
                </div>
            </header>

            <div className="chat-messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message-wrapper message-${m.type}`}>
                        {m.type === 'success' ? (
                            <div className="quiz-preview-message" style={{width: '100%', maxWidth: '800px'}}>
                                <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">{m.quizData.title}</h3>
                                        <div className="flex gap-4 text-xs text-white/50">
                                            <span><FaQuestionCircle className="inline mr-1"/> {m.quizData.questions.length} Questions</span>
                                            <span><FaClock className="inline mr-1"/> {m.quizData.time || 20} mins</span>
                                        </div>
                                    </div>
                                    <button className="action-btn download-btn" onClick={() => handleSaveQuiz(m.quizData)}><Save size={16}/> Save to Library</button>
                                </div>
                                
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {m.quizData.questions.map((q, idx) => (
                                        <div key={idx} className="preview-question-card" style={{background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'}}>
                                            <div className="flex justify-between mb-3">
                                                <span className="text-xs font-bold text-purple-400">QUESTION {idx + 1}</span>
                                                <span className="text-[10px] uppercase tracking-wider opacity-40">{q.difficulty || 'Medium'}</span>
                                            </div>
                                            <p className="text-white font-medium mb-4">{q.question}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                {q.options.map((opt, optIdx) => {
                                                    const letter = String.fromCharCode(65 + optIdx);
                                                    const isCorrect = q.correctAnswerOption === letter;
                                                    return (
                                                        <div key={optIdx} className={`p-3 rounded-xl text-sm border ${isCorrect ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-white/2 text-white/60'}`}>
                                                            <span className="font-bold mr-2">{letter}.</span> {opt}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div className="p-3 rounded-lg bg-white/3 border border-white/5 text-xs text-white/40">
                                                <strong className="text-purple-400 block mb-1">Explanation:</strong>
                                                {q.explanation || 'No explanation provided.'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="message-bubble">
                                <FormattedMessage content={m.content} />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="message-wrapper message-assistant">
                        <div className="message-bubble flex items-center gap-3">
                            <Loader2 className="animate-spin text-purple-400" /> 
                            <span>Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper">
                <div className="chat-input-bar">
                    {file && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl w-fit">
                            <FileText size={14} className="text-purple-400" />
                            <span className="text-xs font-medium text-purple-200">{file.name}</span>
                            <X size={14} className="cursor-pointer text-white/40 hover:text-white" onClick={() => {setFile(null); setConversationContext(p => ({...p, hasFile: false}));}} />
                        </div>
                    )}
                    <div className="input-top">
                        <input 
                            className="input-main" 
                            placeholder={file ? `Ask ${file.name}...` : "Upload a file or type a topic..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                        />
                        <button className="action-btn download-btn h-[46px] w-[46px] p-0 flex items-center justify-center" onClick={handleSend} disabled={isLoading}>
                            <Send size={18}/>
                        </button>
                    </div>
                    <div className="input-actions mt-2 flex justify-between">
                        <div className="flex gap-2">
                            <button className="chat-tool-btn" onClick={() => fileInputRef.current.click()}><Upload size={14}/> Attach Doc</button>
                            <button className="chat-tool-btn" onClick={() => setShowAgentic(true)}><Sparkles size={14}/> Agentic URL</button>
                        </div>
                        <div className="text-[10px] text-white/20 uppercase tracking-widest flex items-center gap-2">
                            <Info size={10}/> Press Enter to Send
                        </div>
                    </div>
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,.docx,.txt" />

            {showAgentic && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <div className="quiz-modal-content w-full max-w-md p-8 border border-white/10 bg-[#0f1117] rounded-[32px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-purple-400"/> Agentic Mode</h2>
                            <X className="cursor-pointer opacity-40 hover:opacity-100" onClick={() => setShowAgentic(false)}/>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Target URL</label>
                                <input className="search-input w-full" placeholder="https://..." value={agenticUrl} onChange={e => setAgenticUrl(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Number of Questions</label>
                                <input type="number" className="search-input w-full" value={agenticNum} onChange={e => setAgenticNum(e.target.value)} />
                            </div>
                            <button className="action-btn download-btn w-full py-4 mt-4" onClick={handleAgentic}>Generate from URL</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;