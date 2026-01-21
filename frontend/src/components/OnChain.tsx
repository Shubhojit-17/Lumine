import React, { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { Layers, Globe, Zap, Database, Server, Code, FileText, CheckCircle } from 'lucide-react';

export const OnChain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // TIMING RULES
  // Phase 1: Arrive (0 - 0.2) - Planes slide in
  // Phase 2: Trigger (0.2 - 0.35) - HTTP Packet
  // Phase 3: Handshake (0.35 - 0.55) - Lumine Activation
  // Phase 4: Settlement (0.55 - 0.75) - USDCx Movement
  // Phase 5: Pause (0.75 - 0.9) - Text Glow
  // Phase 6: Exit (0.9 - 1.0) - Flatten

  // --- ANIMATION VALUES ---

  // 1. ARRIVE (Slide In & Stack)
  const planeStackX = useTransform(scrollYProgress, [0, 0.2], [300, 0]);
  const planeStackOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);
  
  // 2. TRIGGER (HTTP Packet Descent)
  const packetY = useTransform(scrollYProgress, [0.2, 0.35], [-50, 60]); // Starts above, moves into middle
  const packetOpacity = useTransform(scrollYProgress, [0.2, 0.25, 0.35], [0, 1, 0]); // Fades in then vanishes into layer
  const label1Opacity = useTransform(scrollYProgress, [0.2, 0.35], [0, 1]);
  const label1Y = useTransform(scrollYProgress, [0.2, 0.35], [10, 0]);

  // 3. HANDSHAKE (Lumine Layer Active)
  const lumineBorder = useTransform(scrollYProgress, [0.35, 0.45], ["rgba(255,255,255,0.1)", "rgba(191,255,0,0.8)"]);
  const lumineGlow = useTransform(scrollYProgress, [0.35, 0.45], ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 40px rgba(191,255,0,0.3)"]);
  const proofScale = useTransform(scrollYProgress, [0.35, 0.45], [0.8, 1]);
  const proofOpacity = useTransform(scrollYProgress, [0.35, 0.38, 0.55], [0, 1, 0]); // Temporary proof visual
  const label2Opacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1]);

  // 4. SETTLEMENT (USDCx & Stacks)
  // const usdcX = useTransform(scrollYProgress, [0.55, 0.75], [-100, 0]); // Removed motion value
  const stacksGlow = useTransform(scrollYProgress, [0.55, 0.65], ["rgba(85, 70, 255, 0)", "rgba(85, 70, 255, 0.6)"]);
  // const pulseScale = useTransform(scrollYProgress, [0.74, 0.75], [1, 1.2]); // Removed motion value
  const label3Opacity = useTransform(scrollYProgress, [0.55, 0.75], [0, 1]);

  // 5. PAUSE (Text Glow)
  const textGlow = useTransform(scrollYProgress, [0.75, 0.9], ["#9CA3AF", "#FFFFFF"]); // Gray to White
  const textShadow = useTransform(scrollYProgress, [0.75, 0.9], ["0px 0px 0px transparent", "0px 0px 20px rgba(255,255,255,0.8)"]);

  // 6. EXIT (Flatten)
  const gap = useTransform(scrollYProgress, [0.9, 1.0], [80, 0]); // Collapse vertical gap
  const exitOpacity = useTransform(scrollYProgress, [0.95, 1], [1, 0]);

  // Dynamic Labels
  const activeLabel = useTransform(scrollYProgress, (v) => {
    if (v < 0.2) return "";
    if (v < 0.35) return "Agent requests data";
    if (v < 0.55) return "402 Payment Required";
    if (v < 0.75) return "Settling on Stacks";
    if (v < 0.9) return "Finality Confirmed";
    return "";
  });

  return (
    <div ref={containerRef} className="h-[200vh] relative flex items-start justify-center">
      
      <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden">
        
        <motion.div 
           className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 px-8 items-center"
           style={{ opacity: exitOpacity }}
        >
          
          {/* LEFT: Narrative */}
          <div className="md:col-span-3 flex flex-col justify-center h-full space-y-2 pointer-events-none z-20">
             <h3 className="text-3xl md:text-5xl font-bold leading-tight font-display" style={{ color: '#ffffff' }}>
               No accounts.
             </h3>
             <h3 className="text-3xl md:text-5xl font-bold leading-tight font-display" style={{ color: '#ffffff' }}>
               No credit cards.
             </h3>
             <motion.h3 
               className="text-3xl md:text-5xl font-bold leading-tight font-display"
               style={{ color: textGlow, textShadow }}
             >
               Just math.
             </motion.h3>
          </div>

          {/* CENTER: The Sovereign Membrane (2D Stack) */}
          <div className="md:col-span-6 relative h-[600px] flex items-center justify-center">
            <motion.div 
              className="relative w-[400px] h-[500px]"
              style={{ 
                x: planeStackX,
                opacity: planeStackOpacity
              }}
            >
                {/* --- PLANE 1: HTTP / WEB2 (Top) --- */}
                <motion.div 
                  className="absolute top-0 left-0 w-full h-[120px] bg-white/[0.03] backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  style={{ 
                    y: useTransform(gap, (g) => -g) // Moves up/down based on gap
                  }}
                >
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                   <div className="flex items-center gap-3 text-white/50">
                      <Globe className="w-5 h-5" />
                      <span className="font-mono text-sm tracking-widest">HTTP / WEB2</span>
                   </div>
                   
                   {/* Ghost Packet Animation */}
                   <motion.div 
                     className="absolute w-8 h-8 border border-white/60 rounded flex items-center justify-center bg-white/5"
                     style={{ y: packetY, opacity: packetOpacity }}
                   >
                     <FileText className="w-4 h-4 text-white/80" />
                   </motion.div>
                </motion.div>

                {/* --- PLANE 2: LUMINE PROTOCOL (Middle) --- */}
                <motion.div 
                  className="absolute top-[160px] left-0 w-full h-[140px] bg-[#0B0E14]/80 backdrop-blur-md border rounded-xl flex flex-col items-center justify-center overflow-hidden"
                  style={{ 
                    borderColor: lumineBorder,
                    boxShadow: lumineGlow
                  }}
                >
                   {/* Circuitry */}
                   <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className="absolute top-4 left-4 w-2 h-2 bg-[#BFFF00] rounded-full"></div>
                      <div className="absolute top-4 right-4 w-2 h-2 bg-[#BFFF00] rounded-full"></div>
                      <div className="absolute bottom-4 left-4 w-2 h-2 bg-[#BFFF00] rounded-full"></div>
                      <div className="absolute bottom-4 right-4 w-2 h-2 bg-[#BFFF00] rounded-full"></div>
                      <svg className="absolute inset-0 w-full h-full stroke-[#BFFF00] stroke-[0.5] fill-none">
                        <path d="M20 20 L50 20 L50 50" />
                        <path d="M380 120 L350 120 L350 90" />
                      </svg>
                   </div>

                   <div className="relative z-10 flex flex-col items-center gap-2">
                      <Zap className="w-8 h-8 text-[#BFFF00]" />
                      <div className="font-mono text-[#BFFF00] tracking-[0.2em] font-bold">LUMINE</div>
                      <div className="flex gap-4 mt-2">
                        <span className="text-[10px] text-white/60 border border-white/10 px-2 py-0.5 rounded">x402</span>
                        <span className="text-[10px] text-[#2775CA] border border-[#2775CA]/30 px-2 py-0.5 rounded">USDCx</span>
                      </div>
                   </div>

                   {/* Proof Flash */}
                   <motion.div 
                     className="absolute inset-0 bg-[#BFFF00]/10 z-0"
                     style={{ opacity: proofOpacity, scale: proofScale }}
                   />
                </motion.div>

                {/* --- PLANE 3: STACKS / BITCOIN L2 (Bottom) --- */}
                <motion.div 
                  className="absolute top-[340px] left-0 w-full h-[120px] bg-[#050510]/90 backdrop-blur-xl border border-[#5546FF]/30 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ 
                    y: gap, // Moves down based on gap
                    boxShadow: stacksGlow
                  }}
                >
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5546FF]/10 to-transparent opacity-30"></div>
                   <div className="flex items-center gap-3 text-[#5546FF] relative z-10">
                      <Layers className="w-5 h-5" />
                      <span className="font-mono text-sm tracking-widest text-white/80">STACKS / BTC L2</span>
                   </div>

                   {/* REMOVED: USDCx Movement Component */}
                </motion.div>

            </motion.div>
          </div>

          {/* RIGHT: Technical Context Labels */}
          <div className="md:col-span-3 flex flex-col justify-center h-full pl-8 space-y-6">
             <LabelItem isActive={label1Opacity} text="HTTP GET Request" subtext="Agent initiates call" />
             <LabelItem isActive={label2Opacity} text="x402 Header Parsing" subtext="Lumine validates logic" color="#BFFF00" />
             <LabelItem isActive={label3Opacity} text="USDCx Settlement" subtext="Finality on Bitcoin L2" color="#5546FF" />
             
             {/* Current Status Indicator */}
             <motion.div className="mt-8 border-t border-white/10 pt-4">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status</div>
                <motion.div className="font-mono text-sm text-white flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <motion.span>{activeLabel}</motion.span>
                </motion.div>
             </motion.div>
          </div>

        </motion.div>
      </div>
    </div>
  );
};

// --- Helper Components ---

const LabelItem = ({ isActive, text, subtext, color = "white" }: { isActive: MotionValue<number>, text: string, subtext: string, color?: string }) => (
  <motion.div 
    style={{ opacity: isActive, x: useTransform(isActive, [0, 1], [20, 0]) }}
    className="border-l-2 pl-4 py-1"
  >
    <div className="font-mono text-sm font-bold" style={{ color: color, borderColor: color }}>{text}</div>
    <div className="text-xs text-gray-500">{subtext}</div>
  </motion.div>
);
