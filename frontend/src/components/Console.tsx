import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'motion/react';

const CODE_LINES = [
  { text: "> GET /api/v1/inference", color: "text-white" },
  { text: "HTTP/1.1 402 Payment Required", color: "text-[#BFFF00]" },
  { text: "Lumine-Payment-Setup: usdcx-stacks-v1...", color: "text-gray-400" },
  { text: "Initiating Settlement...", color: "text-[#2775CA]" },
  { text: "tx_id: 0x7f...3a2b [CONFIRMED]", color: "text-gray-500" },
  { text: "Status: [ PAID via Stacks ]", color: "text-[#BFFF00] font-bold" },
  { text: "{ payload: { prediction: '0.98' } }", color: "text-white" }
];

export const Console: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]); // Parallax effect

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center relative py-20 overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#5546FF]/10 to-transparent blur-3xl pointer-events-none" />

      <motion.div 
        className="w-full max-w-3xl glass-panel rounded-lg overflow-hidden shadow-2xl border border-white/10"
        style={{ y }}
      >
        {/* Terminal Header */}
        <div className="bg-white/5 px-4 py-3 flex items-center gap-2 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <div className="ml-4 font-mono text-xs text-gray-500">lumine-node — -zsh — 80x24</div>
        </div>

        {/* Terminal Body */}
        <div className="p-8 font-mono text-sm md:text-base space-y-2 min-h-[300px]">
          {CODE_LINES.map((line, i) => (
            <TypewriterLine key={i} line={line} index={i} />
          ))}
          <motion.div 
            className="w-2 h-5 bg-[#BFFF00]"
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        </div>
      </motion.div>
    </div>
  );
};

const TypewriterLine: React.FC<{ line: { text: string; color: string }; index: number }> = ({ line, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.5, duration: 0.3 }}
      className={`${line.color}`}
    >
      {line.text}
    </motion.div>
  );
};
