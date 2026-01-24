import React from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Hero } from './components/Hero';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { Console } from './components/Console';
import { OnChain } from './components/OnChain';
import { Comparison } from './components/Comparison';
import { Future } from './components/Future';
import { DemoRun } from './components/DemoRun';
import { Docs } from './pages/Docs';

function LandingPage() {
  return (
    <main className="w-full relative bg-[#0B0E14] text-white selection:bg-[#BFFF00] selection:text-black">
      {/* Grain Texture Overlay */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1498248529262-f5084e1d0d36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWJ0bGUlMjBkYXJrJTIwZ3JhaW4lMjB0ZXh0dXJlJTIwbm9pc2UlMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc2OTAyNDU5Mnww&ixlib=rb-4.1.0&q=80&w=1080')` }}
      />
      
      {/* Navigation / Header (Minimal) */}
      <nav className="fixed top-0 left-0 w-full z-40 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <div className="font-mono font-bold text-xl tracking-tighter">Lumine</div>
        <div className="flex items-center gap-4">
          <Link to="/docs" className="text-sm font-mono text-gray-400 hover:text-white transition-colors">Docs</Link>
          <a href="https://github.com/Shubhojit-17/Lumine" target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-gray-400 hover:text-white transition-colors">GitHub</a>
        </div>
      </nav>

      <Hero />
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
    </main>
  );
}

function DemoRunWrapper() {
  const navigate = useNavigate();
  return <DemoRun onBack={() => navigate('/')} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo-run" element={<DemoRunWrapper />} />
      <Route path="/docs" element={<Docs />} />
    </Routes>
  );
}
