import React, { useState, useCallback, useRef } from 'react';
import { Header } from './Header';
import { WalletCard } from './WalletCard';
import { ControlSection } from './ControlSection';
import { Terminal, LogEntry } from './Terminal';
import { TransactionProof } from './TransactionProof';
import { ExitSection } from './ExitSection';

const DemoRunPage = () => {
  // --- State ---
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [agentBalance, setAgentBalance] = useState(250.00);
  const [serverBalance, setServerBalance] = useState(0.00);
  
  // Visual Triggers
  const [flashAgent, setFlashAgent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- Helpers ---
  const getTimestamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const addLog = useCallback((text: string, type: LogEntry['type']) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: getTimestamp(),
      text,
      type
    }]);
  }, []);

  // --- Simulation Sequence ---
  const runSimulation = async () => {
    if (status === 'running') return;
    
    // Reset state for re-runs
    setStatus('running');
    setLogs([]);
    setAgentBalance(250.00);
    setServerBalance(0.00);
    setFlashAgent(false);
    setIsSuccess(false);

    // Step 1: Init
    await delay(600);
    addLog("Initializing Lumine...", 'stacks');

    // Step 2: Handshake
    await delay(800);
    addLog("Stacks L2 Handshake initiated", 'stacks');

    // Step 3: 402 Required + Flash
    await delay(1200);
    addLog("402 Required: 0.1 USDCx", 'payment');
    setFlashAgent(true);
    setTimeout(() => setFlashAgent(false), 800); // Flash duration

    // Step 4: Streaming + Balance Update
    await delay(1200);
    addLog("Streaming USDCx settlement", 'payment');
    
    // Trigger balance roll
    setAgentBalance(249.90);
    setServerBalance(0.10);

    // Step 5: Auth
    await delay(2000);
    addLog("Auth Verified", 'success');

    // Step 6: Success
    await delay(800);
    addLog("200 OK: Payload Delivered", 'success');
    setIsSuccess(true);
    setStatus('completed');
  };

  const handleReset = () => {
    setStatus('idle');
    setLogs([]);
    setAgentBalance(250.00);
    setServerBalance(0.00);
    setIsSuccess(false);
    setFlashAgent(false);
    // Add scroll to top on reset
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-white flex flex-col p-8 overflow-hidden font-sans selection:bg-[#7B5CFF] selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;500;700&display=swap');
        
        .font-space { font-family: 'Space Grotesk', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-[1200px] w-full mx-auto flex flex-col h-full flex-grow">
        {/* SECTION 1: Header */}
        <Header />

        {/* SECTION 2: Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <WalletCard 
            type="agent" 
            balance={agentBalance} 
            isFlashing={flashAgent} 
            isSuccess={isSuccess} 
          />
          <WalletCard 
            type="server" 
            balance={serverBalance} 
            isFlashing={false} 
            isSuccess={isSuccess} 
          />
        </div>

        {/* SECTION 3: Control */}
        <ControlSection onExecute={runSimulation} status={status} />

        {/* SECTION 4: Terminal */}
        <Terminal logs={logs} />

        {/* SECTION 5: Transaction Proof */}
        <TransactionProof status={status} />
      </div>

      {/* SECTION 6: Exit */}
      <ExitSection visible={status === 'completed'} onReset={handleReset} />
    </div>
  );
};

export default DemoRunPage;
