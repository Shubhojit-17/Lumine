import React, { useRef, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Section } from './Section';

const NUM_NODES = 50;

export const Future: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  // Zoom effect: Start large (zoomed in), end small (zoomed out)
  const scale = useTransform(scrollYProgress, [0, 1], [3, 0.5]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  
  // Generate random nodes
  const nodes = useMemo(() => {
    return Array.from({ length: NUM_NODES }).map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      id: i
    }));
  }, []);

  return (
    <Section className="min-h-screen overflow-hidden relative flex items-center justify-center">
      
      {/* Constellation Background */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.div 
          style={{ scale, opacity }}
          className="w-[100vw] h-[100vh] relative origin-center"
        >
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute rounded-full bg-white shadow-[0_0_10px_white]"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: node.size,
                height: node.size,
                opacity: 0.6
              }}
            />
          ))}
          {/* Connecting lines (svg overlay) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
             {nodes.slice(0, 20).map((node, i) => {
               const next = nodes[(i + 1) % 20];
               return (
                 <line 
                   key={i}
                   x1={`${node.x}%`} 
                   y1={`${node.y}%`} 
                   x2={`${next.x}%`} 
                   y2={`${next.y}%`} 
                   stroke="white" 
                   strokeWidth="1"
                 />
               );
             })}
          </svg>
        </motion.div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 text-center max-w-4xl px-6">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[#2775CA] to-[#5546FF]"
        >
          Infrastructure for the next billion autonomous transactions.
        </motion.h2>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="glass-pill px-10 py-4 text-xl font-bold rounded-full bg-white/10 hover:bg-white/20 transition-all border border-[#BFFF00]/50 text-[#BFFF00] shadow-[0_0_30px_rgba(191,255,0,0.2)]"
        >
          Join the Protocol
        </motion.button>
      </div>

    </Section>
  );
};
