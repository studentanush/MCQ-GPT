import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, Loader2, Download, CheckCircle, XCircle, RefreshCw, X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

function Chat() {
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: 'Hello! I\'m your Quiz Generator Assistant. Upload a document (PDF, DOCX, or TXT) and I\'ll help you create custom quizzes. Just tell me what you need!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [conversationContext, setConversationContext] = useState({
    hasFile: false,
    lastQuizParams: null
  });
  const [showAgenticModal, setShowAgenticModal] = useState(false);
  const [agenticUrl, setAgenticUrl] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const FormattedMessage = ({ content }) => (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ ...props }) => <p className="text-sm leading-relaxed mb-2" {...props} />,
        h1: ({ ...props }) => <h1 className="text-lg font-bold my-2" {...props} />,
        h2: ({ ...props }) => <h2 className="text-base font-semibold my-2" {...props} />,
        strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  )

  const addAssistantMessage = (content) => {
    setMessages(prev => [...prev, {
      type: 'assistant',
      content: content
    }]);
  };

  const callLLM = async (userPrompt, context) => {
    const prompt = userPrompt.toLowerCase();

    // Check for explicit generation commands first
    if (!context.hasFile && prompt.match(/\d+\s*(questions?|quiz)/)) {
      const numberMatch = prompt.match(/(\d+)\s*(questions?|quiz)?/);
      if (numberMatch) {
        const num = parseInt(numberMatch[1]);
        if (num >= 5) return `generate_text:${num}`;
      }
    }

    if (prompt.includes('regenerate') || prompt.includes('try again')) {
      if (context.lastQuizParams) return `regenerate:${context.lastQuizParams.numQuestions}`;
    }

    const numberMatch = prompt.match(/(\d+)\s*(questions?|quiz)?/);
    if (numberMatch && context.hasFile) {
      const num = parseInt(numberMatch[1]);
      if (num >= 5) return `generate:${num}`;
    }

    // Default: Call real AI backend for conversational help
    try {
      const educatorDetails = JSON.parse(sessionStorage.getItem('edu_info'));
      const response = await api.post("/quizzes/chat", {
        message: userPrompt,
        context: {
          hasFile: context.hasFile,
          lastQuizTitle: generatedQuiz?.title
        }
      });
      return response.data.reply;
    } catch (err) {
      console.error("Chat API error:", err);
      // Fallback to text prompt generation if API fails or for generic queries
      return `generate_text_prompt:${userPrompt}`;
    }
  };


  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setConversationContext(prev => ({ ...prev, hasFile: true }));
        setMessages(prev => [...prev, {
          type: 'user',
          content: `Uploaded: ${selectedFile.name}`
        }]);

        setTimeout(() => {
          addAssistantMessage(`Great! I've received "${selectedFile.name}". How many questions would you like me to generate from this document?`);
        }, 500);
      } else {
        setMessages(prev => [...prev, {
          type: 'error',
          content: 'Please upload a PDF, DOCX, or TXT file.',
        }]  );
      }
    }
  };

  const generateQuiz = async (numQuestions, isTextPrompt = false, textPrompt = '') => {
    setIsLoading(true);

    if (isTextPrompt) {
      addAssistantMessage(`Generating ${numQuestions} questions from your prompt...`);

      try {
        // Bug 2 & 3 fix: call the correct endpoint with the right payload.
        // /quizzes/generate expects raw document text; /quizzes/generate-from-prompt
        // is the topic/prompt endpoint backed by the Python RAG server.
        const response = await api.post("/quizzes/generate-from-prompt", {
          prompt: textPrompt,
          num_questions: numQuestions
        });
        // axios throws on non-2xx — no .ok / .json() needed
        const data = response.data;
        console.log("Received JSON:", data);
        const quizData = data.quiz || data;

        setGeneratedQuiz(quizData);
        setConversationContext(prev => ({
          ...prev,
          lastQuizParams: { numQuestions, isTextPrompt: true, textPrompt }
        }));

        setMessages(prev => [...prev, {
          type: "success",
          content: `Successfully generated "${quizData.title}" with ${quizData.questions?.length} questions!`,
          quizData
        }]);
      } catch (error) {
        // axios wraps server error details in error.response.data
        const serverMsg = error.response?.data?.message;
        setMessages(prev => [...prev, {
          type: "error",
          content: `Failed to generate quiz: ${serverMsg || error.message}`
        }]);
      } finally {
        setIsLoading(false);
      }

      return;
    }


    // Handle file-based generation
    if (!file) {
      addAssistantMessage("Oops! It seems the file is missing. Please upload a document again.");
      setIsLoading(false);
      return;
    }

    addAssistantMessage(`Generating ${numQuestions} questions from your document. This may take a moment...`);

    try {
      const educatorDetails = JSON.parse(sessionStorage.getItem('edu_info'));
      
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await api.post('/upload/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        }
      });

      const filePath = uploadRes.data.filePath;

      const response = await api.post('/quizzes/generate-from-file', {
        filePath,
        num_questions: numQuestions
      });

      const quizData = response.data.quiz || response.data;

      setGeneratedQuiz(quizData);
      setConversationContext(prev => ({
        ...prev,
        lastQuizParams: { numQuestions, fileName: file.name }
      }));

      setMessages(prev => [...prev, {
        type: 'success',
        content: `Successfully generated "${quizData.title}" with ${quizData.questions?.length} questions!`,
        timestamp: new Date(),
        quizData
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Failed to generate quiz: ${error.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage
    }]);
    setInput('');
    setIsLoading(true);

    try {
      const llmResponse = await callLLM(userMessage, conversationContext);

      // FIX: Check if llmResponse exists before calling startsWith
      if (!llmResponse) {
        addAssistantMessage("I'm not sure how to help with that. Could you please rephrase?");
        setIsLoading(false);
        return;
      }

      if (llmResponse.startsWith('generate:')) {
        const numQuestions = parseInt(llmResponse.split(':')[1]);
        setIsLoading(false);
        await generateQuiz(numQuestions, false);
      } else if (llmResponse.startsWith('generate_text:')) {
        const numQuestions = parseInt(llmResponse.split(':')[1]);
        setIsLoading(true);
        try {
          await generateQuiz(numQuestions, true, userMessage);
        } catch (err) {
          addAssistantMessage(`Failed to generate quiz from text prompt: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      } else if (llmResponse.startsWith('generate_text_prompt:')) {
        const textPrompt = llmResponse.split(':')[1];
        setIsLoading(false);
        // Extract number from prompt or default to 5
        const numMatch = textPrompt.match(/(\d+)/);
        const numQuestions = numMatch ? parseInt(numMatch[1]) : 5;
        await generateQuiz(numQuestions, true, textPrompt);
      } else if (llmResponse.startsWith('regenerate:')) {
        const numQuestions = parseInt(llmResponse.split(':')[1]);
        setIsLoading(false);
        addAssistantMessage("Sure! Let me regenerate the quiz with different questions.");
        await generateQuiz(numQuestions);
      } else {
        setTimeout(() => {
          addAssistantMessage(llmResponse);
          setIsLoading(false);
        }, 500);
      }
    } catch (error) {
      addAssistantMessage(`Sorry, I encountered an error: ${error.message}`);
      setIsLoading(false);
    }
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRegenerate = () => {
    const params = conversationContext.lastQuizParams;
    if (!params) return;

    // Case 1: Regenerate from text prompt
    if (params.isTextPrompt) {
      setInput(`Regenerate ${params.numQuestions} questions from: ${params.textPrompt}`);
      return;
    }

    // Case 2: Regenerate from agentic URL
    if (params.agenticUrl) {
      setInput(`Regenerate quiz from URL: ${params.agenticUrl}`);
      return;
    }

    // Case 3: Regenerate from document
    if (params.numQuestions) {
      setInput(`Regenerate ${params.numQuestions} questions`);
      return;
    }
  };


  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleAgenticMode = () => {
    setShowAgenticModal(true);
  };


  const handleAgenticGenerate = async (url) => {
    setShowAgenticModal(false);
    console.log("AGENTIC URL RECEIVED:", url);
    addAssistantMessage(`Generating questions from URL...`);
    setIsLoading(true);

    try {
      // Bug 2 fix: api is axios — response body is at response.data, not response.json().
      // axios also throws automatically on non-2xx, so no .ok check is needed.
      const response = await api.post("/quizzes/agentic", { url });
      const data = response.data;
      console.log("Received Agentic JSON:", data);
      const quizData = data.quiz || data;

      setGeneratedQuiz(quizData);

      setConversationContext(prev => ({
        ...prev,
        lastQuizParams: { agenticUrl: url }
      }));

      setMessages(prev => [
        ...prev,
        {
          type: "success",
          content: `Successfully generated "${quizData.title}" with ${quizData.questions?.length} questions!`,
          quizData
        }
      ]);

    } catch (error) {
      const serverMsg = error.response?.data?.message;
      setMessages(prev => [
        ...prev,
        {
          type: "error",
          content: `Failed to generate agentic quiz: ${serverMsg || error.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSaveQuiz = async (quizData) => {
    try {
      // TODO: Replace with actual endpoint
      const educatorDetails = JSON.parse(sessionStorage.getItem('edu_info'));

      const response = await api.post("/quizzes/create",{
        ...quizData,
        time: quizData.time || "15"
      });
      // const response = await fetch('/api/quiz/save', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(quizData)
      // });

      if (response.data.success) {
        addAssistantMessage("âœ… Quiz saved successfully! You can access it from your saved quizzes.");
      } else {
        addAssistantMessage("âŒ Failed to save quiz. Please try again.");
      }

      //navigate
    } catch (error) {
      console.error('Error saving quiz:', error);
      addAssistantMessage("âŒ Error saving quiz. Please try again.");
    }
  };

  const downloadQuiz = () => {
    if (!generatedQuiz) return;

    const dataStr = JSON.stringify(generatedQuiz, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Use .title (our field name); fallback to 'quiz' if undefined
    link.download = `${(generatedQuiz.title || generatedQuiz.quiz_name || 'quiz').replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderMessage = (msg, index) => {
    switch (msg.type) {
      case 'user':
        return (
          <div key={index} className="flex justify-end mb-4">
            <div className="max-w-[85%] md:max-w-[70%]">
              <div className=" text-black rounded-2xl px-4 py-3 shadow-md bg-white">
                <FormattedMessage content={msg.content} />
              </div>
            </div>
          </div>
        );

      case 'assistant':
        return (
          <div key={index} className="flex justify-start mb-4">
            <div className="max-w-[85%] md:max-w-[70%]">
              <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl px-4 py-3 shadow-md">
                <FormattedMessage content={msg.content} />
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div key={index} className="flex justify-start mb-4">
            <div className="max-w-[85%] bg-white">
              <div className="border border-green-200 text-gray-800 rounded-2xl px-5 py-4 shadow-md">
                {/* Success Header */}
                <div className="flex items-start gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600 flex shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{msg.content}</p>
                </div>

                {/* Quiz Questions Display */}
                {msg.quizData && (
                  <div className="space-y-4">
                    <div className="border-t border-green-200 pt-4">
                      <h3 className="font-semibold text-gray-800 mb-3 text-base">
                        {msg.quizData.title}
                      </h3>

                      {/* Questions List */}
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {msg.quizData.questions.map((q, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            {/* Question Header */}
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                Question {idx + 1}
                              </h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${q.difficulty === 'easy'
                                ? 'bg-green-100 text-green-700'
                                : q.difficulty === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                                }`}>
                                {q.difficulty}
                              </span>
                            </div>

                            {/* Question Text */}
                            <p className="text-sm text-gray-800 mb-3 font-medium">
                              {q.question}
                            </p>

                            {/* Options */}
                            <div className="space-y-1.5 mb-3">
                              {q.options.map((option, optIdx) => {
                                const isCorrect = option.startsWith(q.correctAnswerOption);
                                return (
                                  <div
                                    key={optIdx}
                                    className={`text-xs px-3 py-2 rounded-md ${isCorrect
                                      ? 'bg-green-50 border border-green-300 text-green-800 font-medium'
                                      : 'bg-gray-50 border border-gray-200 text-gray-700'
                                      }`}
                                  >
                                    {option}
                                    {isCorrect && <span className="ml-2">✔️</span>}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5 mt-2">
                              <p className="text-xs text-gray-700">
                                <span className="font-semibold text-blue-700">Explanation:</span> {q.explanation}
                              </p>
                            </div>

                            {/* Sub Topics */}
                            {q.sub_topics && q.sub_topics.length > 0 && (
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {q.sub_topics.map((topic, topicIdx) => (
                                  <span
                                    key={topicIdx}
                                    className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons at Bottom - Aligned Left */}
                    <div className="border-t border-green-200 pt-4 flex gap-2">
                      <button
                        onClick={() => handleSaveQuiz(msg.quizData)}
                        className="px-4 py-2 bg-[#8F00FF] text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Save Quiz
                      </button>
                      <button
                        onClick={downloadQuiz}
                        className="px-4 py-2 bg-[#8F00FF] text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div key={index} className="flex justify-start mb-4">
            <div className="max-w-[70%]">
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-3 shadow-md">
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen ">
      {/* Header */}

      <p className="text-sm text-white text-center relative bottom-10 ">Create custom quizzes from your documents or give a text prompt</p>


      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#0c001e]">
        <div className="max-w-5xl mx-auto">
          {messages.map((msg, index) => renderMessage(msg, index))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-purple-200 rounded-2xl px-4 py-3 shadow-md">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container - Purple/Lavender theme matching image */}
      <div className="bg-[#0c001e] backdrop-blur-sm px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className=" bg-[#100027] border-2 border-white rounded-3xl p-4 shadow-lg ">
            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
              <button
                onClick={handleAttach}
                className="px-3 md:px-4 py-2 bg-white/90 text-gray-700 text-xs md:text-sm font-medium rounded-full hover:bg-white hover:shadow-md transition-all flex items-center gap-2 border border-purple-200"
              >
                <Upload className="w-4 h-4" />
                Attach
              </button>

              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="px-3 md:px-4 py-2 bg-white/90 text-gray-700 text-xs md:text-sm font-medium rounded-full hover:bg-white hover:shadow-md transition-all flex items-center gap-2 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>

              <button
                onClick={handleAgenticMode}
                disabled={isLoading}
                className="px-3 md:px-4 py-2 bg-white/90 text-gray-700 text-xs md:text-sm font-medium rounded-full hover:bg-white hover:shadow-md transition-all flex items-center gap-2 border border-purple-200"
              >
                <Sparkles className="w-4 h-4" />
                Agentic Mode
              </button>
            </div>

            {/* Input Area */}
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm focus-within:ring-0 focus-within:outline-none">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Upload a doc or a text prompt"
                className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-none"
                disabled={isLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="p-2.5 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-full hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0"
              >
                <Send color='black' className="w-4 h-4 text-center" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />

      {/* Agentic Mode Modal */}
      {showAgenticModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-linear-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Agentic Mode
              </h2>
              <button
                onClick={() => setShowAgenticModal(false)}
                className="p-1 hover:bg-purple-50 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Generate a quiz from a URL
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={agenticUrl}
                  onChange={(e) => setAgenticUrl(e.target.value)}

                  placeholder="https://example.com/article"
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => handleAgenticGenerate(agenticUrl)}
                disabled={!agenticUrl.trim()}
                className="w-full px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-600 text-black font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;