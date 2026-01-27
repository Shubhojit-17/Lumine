import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Server, Terminal, CheckCircle, ExternalLink, RefreshCw, ChevronLeft, ArrowRight, Zap, Play } from 'lucide-react';
import { fetchWallets, executeDemoRun, resetDemo, WalletsResponse } from '../api/demo';

interface DemoRunProps {
  onBack: () => void;
}

type LogType = 'info' | 'purple' | 'blue' | 'success';

interface LogEntry {
  id: number;
  text: string;
  type: LogType;
}

export const DemoRun: React.FC<DemoRunProps> = ({ onBack }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [wallets, setWallets] = useState<WalletsResponse | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Fetch wallets on mount
  useEffect(() => {
    fetchWallets().then(setWallets).catch(console.error);
  }, []);

  const handleExecute = async () => {
    if (status === 'running') return;
    setStatus('running');
    setLogs([]);
    setTxid(null);

    try {
      const result = await executeDemoRun();
      
      // Handle locked status (demo already in progress)
      if (result.status === 'locked' || result.error === 'Demo already in progress') {
        setLogs([{ id: 0, text: '> Demo already in progress. Please wait...', type: 'info' }]);
        setStatus('idle');
        return;
      }
      
      // Replay events with timing animation
      let delay = 0;
      result.events.forEach((event, index) => {
        delay += Math.random() * 500 + 400;
        setTimeout(() => {
          setLogs(prev => [...prev, { ...event, id: index }]);
          if (index === result.events.length - 1) {
            setStatus('complete');
            if (result.txid) setTxid(result.txid);
            // Refresh wallet balances
            fetchWallets().then(setWallets).catch(console.error);
          }
        }, delay);
      });
    } catch (error) {
      setLogs([{ id: 0, text: `> Error: ${error}`, type: 'info' }]);
      setStatus('idle');
    }
  };

  const handleReset = async () => {
    // Reset demo lock on backend first
    await resetDemo().catch(console.error);
    setStatus('idle');
    setLogs([]);
    setTxid(null);
    fetchWallets().then(setWallets).catch(console.error);
  };

  // Helper to truncate address
  const truncateAddress = (addr: string) => addr ? `${addr.slice(0, 8)}...${addr.slice(-3)}` : '...';

  return (
    <>
      {/* Back Navigation - Top Left */}
      <button 
        onClick={onBack}
        className="fixed top-6 left-6 z-50 px-4 py-2 text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-base font-mono"
      >
        <ChevronLeft className="w-5 h-5" />
        Return to Architecture
      </button>

      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="min-h-screen w-full bg-[#0B0E14] text-white flex flex-col items-center pt-24 pb-12 px-6 relative overflow-hidden"
      >
        {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0E14] to-[#161B22] -z-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#5546FF]/10 blur-[120px] rounded-full -z-10" />

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight mb-2">
          Live execution of the Lumine protocol
        </h1>
        <p className="text-gray-400 text-lg font-light">
          A real on-chain settlement, executed live.
        </p>
      </div>

      {/* 1. Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
        {/* Agent Wallet */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#5546FF] to-transparent opacity-50" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <Wallet className="w-6 h-6 text-[#5546FF]" />
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Sender Identity</div>
              <div className="font-mono text-sm text-white/80">{truncateAddress(wallets?.agent_wallet?.address || '')}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-bold text-white">
              {wallets?.agent_wallet?.balance || '0.00'} <span className="text-sm text-gray-500">USDCx</span>
            </div>
          </div>
          {status === 'running' && (
             <motion.div 
               layoutId="transfer-particle"
               className="absolute right-6 bottom-6 w-3 h-3 bg-[#5546FF] rounded-full shadow-[0_0_10px_#5546FF]"
               initial={{ x: 0, opacity: 1 }}
               animate={{ x: 100, opacity: 0 }}
               transition={{ duration: 1, repeat: Infinity }}
             />
          )}
        </div>

        {/* Server Wallet */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#2775CA] to-transparent opacity-50" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <Server className="w-6 h-6 text-[#2775CA]" />
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Receiver Identity</div>
              <div className="font-mono text-sm text-white/80">{truncateAddress(wallets?.server_wallet?.address || '')}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-bold text-white">
              {wallets?.server_wallet?.balance || '0.00'} <span className="text-sm text-gray-500">USDCx</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Action */}
      <div className="mb-12 relative z-10">
        <button
          onClick={handleExecute}
          disabled={status !== 'idle'}
          className={`
            group relative px-12 py-4 rounded-full font-bold text-lg tracking-wide transition-all duration-300
            ${status === 'idle' 
              ? 'bg-white/10 hover:bg-white/20 text-[#BFFF00] border border-[#BFFF00]/30 shadow-[0_0_20px_rgba(191,255,0,0.1)] hover:shadow-[0_0_30px_rgba(191,255,0,0.3)] cursor-pointer' 
              : 'bg-black/50 text-gray-500 border border-white/5 cursor-not-allowed'}
          `}
        >
          <span className="flex items-center gap-3">
            {status === 'running' ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                EXECUTING...
              </>
            ) : status === 'complete' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                EXECUTED
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                EXECUTE PROTOCOL
              </>
            )}
          </span>
        </button>
      </div>

      {/* 3. Live Execution Terminal */}
      <div className="w-full max-w-3xl bg-[#050505]/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl mb-8 flex flex-col h-[300px]">
        {/* Terminal Header */}
        <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <div className="ml-4 font-mono text-xs text-gray-500 flex items-center gap-2">
            <Terminal className="w-3 h-3" />
            lumine-node — -zsh — 80x24
          </div>
        </div>
        
        {/* Terminal Body */}
        <div 
          ref={scrollRef}
          className="flex-1 p-6 font-mono text-sm overflow-y-auto scrollbar-hide space-y-2"
        >
          {status === 'idle' && (
            <div className="text-gray-600 italic">Waiting for execution command...</div>
          )}
          
          <AnimatePresence mode='popLayout'>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`${
                  log.type === 'purple' ? 'text-[#5546FF]' :
                  log.type === 'blue' ? 'text-[#2775CA]' :
                  log.type === 'success' ? 'text-[#BFFF00]' :
                  'text-gray-300'
                }`}
              >
                {log.text}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {status === 'running' && (
            <motion.div 
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-2 h-4 bg-[#BFFF00] inline-block align-middle ml-1"
            />
          )}
        </div>
      </div>

      {/* 4. Transaction Proof Section (Appears after success) */}
      <AnimatePresence>
        {status === 'complete' && txid && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl"
          >
            <div className="bg-[#BFFF00]/5 border border-[#BFFF00]/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#BFFF00]/10 rounded-full text-[#BFFF00]">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-[#BFFF00] font-bold text-lg mb-1">Transaction Proof</h3>
                  <div className="flex flex-col gap-1 text-sm text-gray-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Confirmed on Stacks Testnet
                    </div>
                    <div>Asset: USDCx (SIP-010)</div>
                    <div>TxID: {txid.slice(0, 6)}...{txid.slice(-4)}</div>
                  </div>
                </div>
              </div>
              
              <a 
                href={`https://explorer.hiro.so/txid/${txid}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-[#BFFF00]/10 hover:bg-[#BFFF00]/20 text-[#BFFF00] rounded-lg border border-[#BFFF00]/30 transition-colors font-mono text-sm"
              >
                View on Stacks Explorer
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Post-Demo Actions */}
      <div className="mt-12 flex gap-6">
        <button 
          onClick={handleReset}
          className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-mono"
        >
          <RefreshCw className="w-4 h-4" />
          Re-run Sequence
        </button>
      </div>

      </motion.div>
    </>
  );
};
