import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { Console } from './components/Console';
import { OnChain } from './components/OnChain';
import { Comparison } from './components/Comparison';
import { Future } from './components/Future';
import { DemoRun } from './components/DemoRun';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'landing' | 'demo'>('landing');

  const navigateToDemo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setView('demo');
  };

  const navigateToLanding = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setView('landing');
  };

  return (
    <main className="w-full relative bg-[#0B0E14] text-white selection:bg-[#BFFF00] selection:text-black min-h-screen">
      {/* Grain Texture Overlay */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1498248529262-f5084e1d0d36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWJ0bGUlMjBkYXJrJTIwZ3JhaW4lMjB0ZXh0dXJlJTIwbm9pc2UlMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc2OTAyNDU5Mnww&ixlib=rb-4.1.0&q=80&w=1080')` }}
      />
      
      {/* Navigation / Header (Minimal) */}
      <nav className="fixed top-0 left-0 w-full z-40 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <button 
          onClick={navigateToLanding}
          className="font-mono font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity"
        >
          Lumine
        </button>
        <div className="flex items-center gap-6">
          {view === 'landing' && (
             <button 
               onClick={navigateToDemo}
               className="text-sm font-mono text-white/70 hover:text-[#BFFF00] transition-colors uppercase tracking-wider"
             >
               Live Protocol
             </button>
          )}
          <a href="#" className="text-sm font-mono text-gray-400 hover:text-white transition-colors">Docs</a>
          <a href="#" className="text-sm font-mono text-gray-400 hover:text-white transition-colors">GitHub</a>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Hero onJoin={navigateToDemo} />
            <Problem />
            <Solution />
            <Console />
            <OnChain />
            <Comparison />
            <Future />
            
            {/* Footer */}
            <footer className="py-12 text-center text-gray-600 text-sm font-mono relative z-10 border-t border-white/5">
              <p>&copy; 2026 Lumine Protocol. Built on Stacks.</p>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="demo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <DemoRun onBack={navigateToLanding} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
