import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import ToolsPanel from './components/ToolsPanel';
import { AppMode } from './types';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);

  return (
    <div className="min-h-screen bg-[#000] text-[#d1d1d1] p-4 flex flex-col md:flex-row gap-4 overflow-hidden h-screen">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 flex flex-col gap-2 shrink-0">
        <div className="osrs-panel p-4 text-center mb-2">
          <h1 className="text-3xl text-[#ff981f] drop-shadow-md">OSRS Oracle</h1>
          <p className="text-xs text-[#ffff00] mt-1">Gielinor's Smartest Guide</p>
        </div>

        <div className="osrs-panel p-2 flex flex-col gap-2 flex-grow overflow-y-auto">
          <NavButton 
            active={mode === AppMode.CHAT} 
            onClick={() => setMode(AppMode.CHAT)}
            icon="🧙‍♂️"
            label="The Oracle (Chat)"
          />
          <NavButton 
            active={mode === AppMode.IMAGE_GEN} 
            onClick={() => setMode(AppMode.IMAGE_GEN)}
            icon="🎨"
            label="Concept Art (Gen)"
          />
          <NavButton 
            active={mode === AppMode.IMAGE_EDIT} 
            onClick={() => setMode(AppMode.IMAGE_EDIT)}
            icon="✏️"
            label="Magic Edit"
          />
          <NavButton 
            active={mode === AppMode.VIDEO_GEN} 
            onClick={() => setMode(AppMode.VIDEO_GEN)}
            icon="🎬"
            label="Veo Animator"
          />
           <NavButton 
            active={mode === AppMode.ANALYZE} 
            onClick={() => setMode(AppMode.ANALYZE)}
            icon="👁️"
            label="Analyze Content"
          />
        </div>

        <div className="osrs-panel p-2 text-center text-xs text-[#888]">
          Powered by Gemini 2.5 & 3.0
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col h-full overflow-hidden relative">
         <div className="absolute inset-0 pointer-events-none border-[4px] border-[#3e3529] z-10 rounded-sm"></div>
         <div className="w-full h-full bg-[#1e1e1e] border-2 border-[#5d5244] overflow-hidden flex flex-col relative z-0">
           {mode === AppMode.CHAT && <ChatInterface />}
           {mode !== AppMode.CHAT && <ToolsPanel mode={mode} />}
         </div>
      </main>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-3 px-4 py-3 w-full text-left transition-all
      ${active 
        ? 'bg-[#5d5244] text-[#ffff00] border-l-4 border-[#ff981f]' 
        : 'text-[#aaa] hover:bg-[#39332d] hover:text-[#ddd] border-l-4 border-transparent'}
    `}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-lg tracking-wide">{label}</span>
  </button>
);
