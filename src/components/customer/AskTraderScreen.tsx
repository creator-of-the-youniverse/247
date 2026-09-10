import React, { useState } from 'react';
import { api } from '../../services/api';
import { 
  HelpCircle, 
  Send, 
  X, 
  Bike, 
  Clock, 
  Sparkles, 
  MapPin, 
  ShieldCheck 
} from 'lucide-react';

interface AskTraderScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQS = [
  "How fast does 247 deliver?",
  "How does Trader Pass work?",
  "What is the Free Essential item program?",
  "What areas of Manchester do you cover?",
  "Do you roll in snow and bad weather?"
];

export const AskTraderScreen: React.FC<AskTraderScreenProps> = ({ isOpen, onClose }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'trader'; text: string; time: string }>>([
    {
      role: 'trader',
      text: 'Yo! I am the 247 dispatch knowledge assistant. Ask me anything about our rolling cargo cart inventory, 60-min delivery times, Manchester coverage, or Trader Pass membership.',
      time: 'Now'
    }
  ]);

  if (!isOpen) return null;

  const handleAsk = async (customQuestion?: string) => {
    const q = customQuestion || question;
    if (!q.trim()) return;

    const userMsg = { role: 'user' as const, text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await api.askTraderAI(q);
      const traderMsg = {
        role: 'trader' as const,
        text: res.answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, traderMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'trader',
          text: '247 is Manchester’s 24/7/365 bicycle-and-cargo-cart micro-store. We deliver essentials, first aid, and weather supplies in under 60 minutes.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-sky-500/50 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-stone-950 flex items-center justify-center font-bold">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-base text-white uppercase tracking-wider">
                  ASK TRADER
                </h2>
                <span className="text-[10px] bg-sky-400 text-stone-950 font-bold px-1.5 py-0.2 rounded font-mono-code">24/7 Q&A</span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono-code">
                Bicycle micro-store operational and product assistance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Log */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-amber-500 text-stone-950 font-medium font-mono-code'
                    : 'bg-stone-950 border border-stone-800 text-stone-200'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[9px] text-stone-500 font-mono-code mt-1 px-1">{m.time}</span>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-sky-400 font-mono-code p-2 bg-stone-950/60 rounded-lg w-max">
              <span className="animate-spin">⟳</span> Checking 247 dispatch knowledge...
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-stone-950 border-t border-stone-800/80 space-y-1.5">
          <div className="text-[10px] font-mono-code text-stone-400 uppercase">Suggested Topics:</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {FAQS.map((faq, i) => (
              <button
                key={i}
                onClick={() => handleAsk(faq)}
                className="text-[11px] bg-stone-900 border border-stone-800 hover:border-sky-500/60 hover:text-sky-300 text-stone-300 px-2.5 py-1 rounded-lg font-mono-code whitespace-nowrap transition-colors"
              >
                {faq}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about delivery, pricing, products, or service..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-sky-500 font-mono-code"
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-stone-800 text-stone-950 font-bold text-xs font-mono-code flex items-center gap-1 shadow"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
