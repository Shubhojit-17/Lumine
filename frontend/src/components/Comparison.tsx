import React, { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { CreditCard, Lock, Key, Network, Zap, User, Bot } from 'lucide-react';

export const Comparison: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  // TIMING PHASES (Unified)
  // Phase 1: Entry (0 - 25%) - Both appear
  // Phase 2: Stable (25% - 70%) - Reading time
  // Phase 3: Exit (70% - 100%) - Both disappear

  // UNIFIED ANIMATIONS
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.7, 0.95], [0, 1, 1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.25, 0.7, 0.95], ["10px", "0px", "0px", "10px"]);
  const y = useTransform(scrollYProgress, [0, 0.25, 0.7, 0.95], [30, 0, 0, 30]); // Settle up on entry, drift down on exit

  return (
    <div ref={containerRef} className="min-h-[120vh] flex items-center justify-center py-10 px-6 relative overflow-hidden">
      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative">
        
        <LegacySide 
          opacity={opacity} 
          blur={blur} 
          y={y}
        />

        <AgenticSide 
          opacity={opacity} 
          blur={blur} 
          y={y}
        />

      </div>
    </div>
  );
};

// --- Sub-Components ---

interface CommonSideProps {
  opacity: MotionValue<number>;
  blur: MotionValue<string>;
  y: MotionValue<number>;
}

const LegacySide: React.FC<CommonSideProps> = ({ opacity, blur, y }) => {
  return (
    <motion.div 
      style={{ 
        opacity, 
        filter: useTransform(blur, (b) => `blur(${b})`),
        y
      }}
      className="relative p-8 md:p-12 rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden"
    >
        
      {/* Background Motifs */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
          <CreditCard className="absolute top-10 right-10 w-32 h-32 text-gray-500 rotate-12" />
          <Lock className="absolute bottom-20 left-10 w-24 h-24 text-gray-600 -rotate-12" />
          <Key className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 text-gray-700 opacity-20" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cracked-glass.png')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-8 text-right md:pr-4">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-2 text-red-400/80">
              <User className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest">Human-in-the-loop</span>
          </div>
          <h3 className="text-2xl font-mono text-gray-500 uppercase tracking-widest">Legacy (Human-Centric)</h3>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-400">Monthly SaaS Seats</h2>
          <p className="text-gray-500 text-lg">Paying for idle time.</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-400">Manual API Keys</h2>
          <p className="text-gray-500 text-lg">Human bottleneck.</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-400">Idle Capital</h2>
          <p className="text-gray-500 text-lg">Locked in pre-paid credits.</p>
        </div>

        <div className="mt-4 text-xs font-mono text-gray-600 uppercase tracking-widest">
            "Built for people, hostile to machines."
        </div>
      </div>

    </motion.div>
  );
};

const AgenticSide: React.FC<CommonSideProps> = ({ opacity, blur, y }) => {
  return (
    <motion.div 
      style={{ 
        opacity, 
        filter: useTransform(blur, (b) => `blur(${b})`),
        y
      }}
      className="relative p-8 md:p-12 rounded-3xl border border-[#BFFF00]/20 bg-[#BFFF00]/[0.03] overflow-hidden"
    >
       {/* Background Motifs */}
       <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 opacity-10" 
               style={{ backgroundImage: 'linear-gradient(#BFFF00 1px, transparent 1px), linear-gradient(90deg, #BFFF00 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>
          <Network className="absolute top-10 left-10 w-32 h-32 text-[#BFFF00] opacity-10 -rotate-12" />
          <Zap className="absolute bottom-10 right-10 w-24 h-24 text-[#BFFF00] opacity-10 rotate-12" />
          {/* Glowing Orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#BFFF00] blur-[100px] opacity-10"></div>
       </div>

       {/* Content */}
       <div className="relative z-10 flex flex-col gap-8 text-left md:pl-4">
         <div className="flex flex-col items-start">
           <div className="flex items-center gap-2 mb-2 text-[#BFFF00]">
              <Bot className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest">Machine-to-machine</span>
           </div>
           <h3 className="text-2xl font-mono text-[#BFFF00] uppercase tracking-widest">Agentic (Machine-Centric)</h3>
         </div>
         
         <div className="space-y-2">
           <h2 className="text-4xl md:text-5xl font-bold text-white shadow-[#BFFF00]">Pay-per-Inference</h2>
           <p className="text-gray-300 text-lg">Zero waste. 100% utilization.</p>
         </div>

         <div className="space-y-2">
           <h2 className="text-4xl md:text-5xl font-bold text-white">Stateless x402 Auth</h2>
           <p className="text-gray-300 text-lg">Machine-to-machine native.</p>
         </div>

         <div className="space-y-2">
           <h2 className="text-4xl md:text-5xl font-bold text-white">Just-in-Time Liquidity</h2>
           <p className="text-gray-300 text-lg">Streaming payments on Stacks.</p>
         </div>

         <div className="mt-4 text-xs font-mono text-[#BFFF00]/70 uppercase tracking-widest">
            "Designed for autonomous intelligence."
         </div>
       </div>

    </motion.div>
  );
};
