import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatConfig } from '../types';
import { generateOsrsResponse, speakText } from '../services/geminiService';

// --- Tooltip Components ---

const ItemTooltip: React.FC<{ name: string; stats: string }> = ({ name, stats }) => {
    // Basic formatting to match Wiki URL patterns (Space to Underscore, Capitalize first)
    // Note: Wiki is sensitive, but usually redirects handle case.
    const formattedName = name.trim().replace(/ /g, '_');
    // Using the thumb endpoint often yields better fitting images for tooltips, or direct image.
    // Direct: https://oldschool.runescape.wiki/images/Abyssal_whip.png
    const wikiImage = `https://oldschool.runescape.wiki/images/${formattedName}.png`;

    return (
        <span className="relative group cursor-help inline-block text-[#ffff00] border-b border-dotted border-[#ff981f] mx-1">
            {name}
            {/* Tooltip Popup */}
            <span className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#39332d] border-2 border-[#5d5244] p-3 text-xs text-[#d1d1d1] z-50 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] pointer-events-none flex flex-col items-center">
                <div className="bg-[#1e1e1e] p-1 rounded-sm mb-2 border border-[#3e3529]">
                    <img 
                        src={wikiImage} 
                        alt={name} 
                        className="max-h-12 object-contain" 
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                </div>
                <span className="block text-center font-bold text-[#ff981f] mb-1 font-sans text-sm">{name}</span>
                <span className="block text-center text-white font-sans">{stats}</span>
                {/* Arrow */}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#5d5244]"></span>
            </span>
        </span>
    );
};

const MessageContent = ({ text }: { text: string }) => {
    // Regex to find [[Item Name|Stats]]
    const parts = text.split(/(\[\[.*?\|.*?\]\])/g);
    
    return (
        <span className="whitespace-pre-wrap leading-relaxed">
            {parts.map((part, i) => {
                const match = part.match(/^\[\[(.*?)\|(.*?)\]\]$/);
                if (match) {
                    return <ItemTooltip key={i} name={match[1]} stats={match[2]} />;
                }
                return part;
            })}
        </span>
    );
};

// --- Main Chat Interface ---

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Welcome, adventurer. I am the Oracle. Ask me about your diaries, PvP rotations, or boss mechanics. I shall consult the ancient texts (Wiki) for you.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig>({
    useSearch: true,
    useThinking: false,
    category: 'General'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        // Prepare history for API
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const response = await generateOsrsResponse(userMsg.text, config, history);
        
        const modelMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.text,
            sources: response.sources,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "The connection to the servers is weak (API Error). Please try again.",
            timestamp: new Date()
        }]);
    } finally {
        setLoading(false);
    }
  };

  const handleTTS = async (text: string, id: string) => {
      try {
          const audioBase64 = await speakText(text);
          setMessages(prev => prev.map(m => m.id === id ? { ...m, audioData: audioBase64 } : m));
          
          // Auto play
          const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
          audio.play();
      } catch (e) {
          console.error("TTS failed", e);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[url('https://oldschool.runescape.wiki/images/Background.png')] bg-cover">
      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 osrs-inset m-2 rounded bg-opacity-90 bg-[#1e1e1e]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
                className={`max-w-[85%] p-3 rounded-sm border-2 shadow-sm
                ${msg.role === 'user' 
                    ? 'bg-[#3e3529] border-[#2b2b2b] text-[#d1d1d1]' 
                    : 'bg-[#5d5244] border-[#3e3529] text-[#d1d1d1]' // Base text color for model is lighter now for readability with tooltips
                }`}
            >
              <div className="text-sm mb-1 opacity-70 flex justify-between gap-4">
                  <span className={msg.role === 'model' ? 'text-[#ffff00]' : ''}>{msg.role === 'user' ? 'You' : 'The Oracle'}</span>
                  {msg.role === 'model' && (
                      <button onClick={() => handleTTS(msg.text, msg.id)} className="hover:text-white" title="Read Aloud">🔊</button>
                  )}
              </div>
              <div className="text-base md:text-lg" style={{ fontFamily: 'VT323' }}>
                <MessageContent text={msg.text} />
              </div>
              
              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#3e3529]">
                      <p className="text-xs text-orange-300 mb-1">Wiki Sources:</p>
                      <ul className="text-xs space-y-1">
                          {msg.sources.map((source, idx) => (
                              <li key={idx}>
                                  <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline truncate block">
                                      {source.title}
                                  </a>
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
            <div className="text-[#ffff00] animate-pulse text-center p-4">
                {config.useThinking ? 'Thinking deeply regarding your strategy...' : 'Consulting the Wiki...'}
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 bg-[#2b2b2b] border-t-2 border-[#5d5244]">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-2 px-1">
             <label className="flex items-center gap-1 text-sm cursor-pointer select-none">
                <input 
                    type="checkbox" 
                    checked={config.useSearch}
                    onChange={e => setConfig({...config, useSearch: e.target.checked})}
                    className="accent-[#ff981f]"
                    disabled={config.useThinking} // Thinking overrides search in our logic
                />
                <span className={config.useThinking ? 'opacity-50' : 'text-[#d1d1d1]'}>Wiki Search</span>
            </label>
            <label className="flex items-center gap-1 text-sm cursor-pointer select-none">
                <input 
                    type="checkbox" 
                    checked={config.useThinking}
                    onChange={e => setConfig({...config, useThinking: e.target.checked})}
                    className="accent-[#ff981f]"
                />
                <span className="text-[#00ff00]">Thinking Mode (Strategies)</span>
            </label>
            
            <select 
                value={config.category}
                onChange={e => setConfig({...config, category: e.target.value as any})}
                className="ml-auto bg-[#1e1e1e] border border-[#5d5244] text-[#ff981f] text-sm p-1"
            >
                <option value="General">General</option>
                <option value="PvM">PvM & Bossing</option>
                <option value="PvP">PvP & PKing</option>
                <option value="Diaries">Diaries & Quests</option>
                <option value="Skilling">Skilling</option>
            </select>
        </div>

        <div className="flex gap-2">
            <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={config.useThinking ? "Ask a complex strategy question..." : "Ask the Oracle..."}
                className="flex-grow bg-[#1e1e1e] border-2 border-[#3e3529] p-2 text-[#d1d1d1] placeholder-gray-600 focus:outline-none focus:border-[#ff981f] resize-none h-14"
            />
            <button 
                onClick={handleSend}
                disabled={loading}
                className="osrs-button px-6 font-bold text-xl uppercase tracking-wider"
            >
                {loading ? '...' : 'Ask'}
            </button>
        </div>
      </div>
    </div>
  );
}