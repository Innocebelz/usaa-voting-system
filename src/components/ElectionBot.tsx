import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

const BACKEND_URL = 'https://laa-voting-system.onrender.com';

interface Message {
    id: string;
    role: 'bot' | 'user';
    text: string;
}

const ElectionBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome-msg',
            role: 'bot',
            text: "Hello! 🤖 I'm the U.S.S.A Election Assistant. I can help answer questions about getting your OTP, handling unopposed candidates, or when results will be published. How can I help?"
        }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the newest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.text })
            });
            const data = await res.json();

            const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', text: data.reply };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', text: "Sorry, I'm having trouble connecting to the EC servers right now." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* ── Chat Window ── */}
            <div
                className={`mb-4 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border-2 border-zinc-200 overflow-hidden transition-all duration-300 origin-bottom-right ${
                    isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
                }`}
            >
                {/* Header */}
                <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between border-b-4 border-yellow-500">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-zinc-900" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">EC Assistant</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Online</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="h-[350px] overflow-y-auto p-4 bg-zinc-50 flex flex-col gap-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                                msg.role === 'user' ? 'bg-zinc-200' : 'bg-yellow-100 border border-yellow-300'
                            }`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-500" /> : <Bot className="w-4 h-4 text-yellow-700" />}
                            </div>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed max-w-[80%] ${
                                msg.role === 'user'
                                    ? 'bg-zinc-900 text-white rounded-tr-sm'
                                    : 'bg-white border border-zinc-200 text-zinc-700 rounded-tl-sm shadow-sm'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-yellow-100 border border-yellow-300 flex items-center justify-center shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-yellow-700" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white border border-zinc-200 rounded-tl-sm shadow-sm flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-zinc-200 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 bg-zinc-100 border border-transparent focus:border-yellow-400 focus:bg-white text-sm font-medium rounded-xl px-4 py-2.5 outline-none transition-all"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-11 h-11 flex items-center justify-center bg-zinc-900 text-yellow-400 rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-all shrink-0 active:scale-95"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </form>
            </div>

            {/* ── Floating Toggle Button ── */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 z-50 ${
                    isOpen ? 'bg-zinc-800 text-white hover:bg-zinc-900' : 'bg-yellow-400 text-zinc-900 hover:bg-yellow-500 border-2 border-white'
                }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>
        </div>
    );
};

export default ElectionBot;