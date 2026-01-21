import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { CreditCard, Lock, UserX, AlertTriangle } from 'lucide-react';
import { Section } from './Section';

export const Problem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // TIMING RULES
  // 0.0 - 0.2: Entry (Fade In & Scale Up)
  // 0.2 - 0.6: Stable (Static) - "Stable Window"
  // 0.6 - 0.9: Exit (Shatter / Fade Out)

  const entryProgress = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  const exitProgress = useTransform(scrollYProgress, [0.6, 0.9], [0, 1]);

  // Entry Animations
  const containerOpacity = useTransform(entryProgress, [0, 1], [0, 1]);
  const containerScale = useTransform(entryProgress, [0, 1], [0.9, 1]);

  // Exit Animations (Shatter)
  const gap = useTransform(exitProgress, [0, 1], ["24px", "200px"]); 
  
  return (
    <div ref={containerRef} className="min-h-[150vh] relative flex flex-col items-center justify-start py-40">
      
      <div className="sticky top-1/4 w-full max-w-6xl mx-auto px-6">
        <motion.div 
           style={{ opacity: containerOpacity, scale: containerScale }}
           className="mb-12 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">The Subscription Tax</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Why autonomous agents fail in a human-first economy.</p>
          {/* Debug annotations */}
          {/* <div className="absolute top-0 right-0 text-xs font-mono text-gray-600">
             Entry: 0-20% | Stable: 20-60% | Exit: 60-90%
          </div> */}
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 w-full"
          style={{ gap, opacity: containerOpacity, scale: containerScale }}
        >
          {/* Panel 1: Credit Card Expired */}
          <BentoPanel 
            shatter={exitProgress} 
            index={0}
            rotation={-5}
            title="Payment Failed"
            icon={<CreditCard className="text-red-400 w-8 h-8" />}
          >
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-80">
              <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                <UserX className="w-12 h-12 text-red-400" />
              </div>
              <div className="text-center">
                <p className="font-mono text-sm text-red-300">ERROR_CC_EXPIRED</p>
                <p className="text-xs text-gray-500 mt-1">Agent frozen at step 4/5</p>
              </div>
            </div>
          </BentoPanel>

          {/* Panel 2: Unused Subscriptions */}
          <BentoPanel 
            shatter={exitProgress} 
            index={1}
            rotation={2}
            title="Idle Capital"
            icon={<AlertTriangle className="text-yellow-400 w-8 h-8" />}
          >
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-gray-400">SaaS Plan {i}</span>
                  <span className="text-white font-mono">$20.00/mo</span>
                </div>
              ))}
              <div className="mt-4 text-center bg-white/5 py-2 rounded text-xs text-gray-400">
                90% Unused Capacity
              </div>
            </div>
          </BentoPanel>

          {/* Panel 3: KYC Wall */}
          <BentoPanel 
            shatter={exitProgress} 
            index={2}
            rotation={5}
            title="Access Denied"
            icon={<Lock className="text-orange-400 w-8 h-8" />}
          >
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-full bg-white/5 p-3 rounded text-sm text-gray-400 border border-white/10">
                Verify Phone Number
              </div>
              <div className="w-full bg-white/5 p-3 rounded text-sm text-gray-400 border border-white/10">
                Upload Gov ID
              </div>
              <div className="text-xs text-red-400 font-mono mt-2">
                &gt; HUMAN_VERIFICATION_REQUIRED
              </div>
            </div>
          </BentoPanel>

        </motion.div>
      </div>

      {/* Removed the fixed vertical line */}
    </div>
  );
};

interface BentoPanelProps {
  children: React.ReactNode;
  shatter: any;
  index: number;
  rotation: number;
  title: string;
  icon: React.ReactNode;
}

const BentoPanel: React.FC<BentoPanelProps> = ({ children, shatter, index, rotation, title, icon }) => {
  // Random shatter direction based on index
  const xDir = index === 0 ? -200 : index === 2 ? 200 : 0;
  const yDir = index === 1 ? 100 : -100;
  
  const x = useTransform(shatter, [0, 1], [0, xDir]);
  const y = useTransform(shatter, [0, 1], [0, yDir]);
  const rotate = useTransform(shatter, [0, 1], [0, rotation * 5]);
  const opacity = useTransform(shatter, [0, 0.8], [1, 0]);

  return (
    <motion.div 
      className="glass-panel rounded-2xl p-6 h-[300px] flex flex-col relative overflow-hidden group"
      style={{ x, y, rotate, opacity }}
    >
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        {icon}
        <h3 className="font-medium text-lg text-gray-200">{title}</h3>
      </div>
      <div className="flex-1 relative z-10">
        {children}
      </div>
      
      {/* "Cracked" overlay that appears on scroll */}
      <motion.div 
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 flex items-center justify-center"
        style={{ opacity: shatter }}
      >
      </motion.div>
    </motion.div>
  );
};
