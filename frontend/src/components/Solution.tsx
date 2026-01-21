import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Bot, Server, DollarSign, FileJson, CheckCircle } from 'lucide-react';

export const Solution: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Steps timing
  // 0.2 - 0.35: Request (Left -> Right)
  // 0.35 - 0.5: 402 Signal
  // 0.5 - 0.75: Payment (Left -> Right)
  // 0.75 - 0.8: Success
  // 0.8 - 0.95: Payload (Right -> Left)

  // Positions along the track (0% = Agent, 100% = API)
  // Actually, we want to start from the Agent's edge and end at API's edge.
  // Agent is at left side, API at right side.
  // Let's say 10% and 90% are the icon centers.
  
  const requestLeft = useTransform(scrollYProgress, [0.2, 0.35], ["10%", "90%"]);
  const requestOpacity = useTransform(scrollYProgress, [0.2, 0.3, 0.35], [0, 1, 0]);

  const signalScale = useTransform(scrollYProgress, [0.35, 0.4, 0.5], [0, 1.2, 1]);
  const signalOpacity = useTransform(scrollYProgress, [0.35, 0.4, 0.55], [0, 1, 0]);

  const paymentLeft = useTransform(scrollYProgress, [0.5, 0.75], ["10%", "90%"]);
  const paymentOpacity = useTransform(scrollYProgress, [0.5, 0.55, 0.75, 0.8], [0, 1, 1, 0]);
  
  const apiUnlockColor = useTransform(scrollYProgress, [0.75, 0.8], ["#64748b", "#BFFF00"]);

  const payloadLeft = useTransform(scrollYProgress, [0.8, 0.95], ["90%", "10%"]);
  // Modified to fade out at the end, matching the Request Particle rhythm
  const payloadOpacity = useTransform(scrollYProgress, [0.8, 0.9, 0.95], [0, 1, 0]);

  return (
    <div ref={containerRef} className="h-[400vh] relative">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        
        {/* Background Rail */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <h2 className="absolute top-20 text-3xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
          The x402 Handshake
        </h2>

        <div className="relative w-full max-w-4xl px-8 flex justify-between items-center z-10">
          
          {/* MOVING ELEMENTS (Absolute to container) */}
          
          {/* Request Particle */}
          <motion.div 
            className="absolute top-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_15px_white] z-20"
            style={{ 
              left: requestLeft, 
              opacity: requestOpacity, 
              y: '-50%',
              x: '-50%' // Center on point
            }}
          />

          {/* Payment Token */}
          <motion.div 
            className="absolute top-1/2 z-20 flex items-center justify-center"
            style={{ 
               left: paymentLeft, 
               opacity: paymentOpacity, 
               y: '-50%',
               x: '-50%'
            }}
          >
            <div className="w-10 h-10 rounded-full bg-[#2775CA] flex items-center justify-center shadow-[0_0_20px_#2775CA]">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </motion.div>

          {/* Payload Packet */}
          <motion.div 
            className="absolute top-1/2 z-20 flex items-center justify-center"
            style={{ 
              left: payloadLeft, 
              opacity: payloadOpacity, 
              y: '-50%',
              x: '-50%'
            }}
          >
            <div className="w-12 h-16 bg-white/10 border border-white/30 backdrop-blur rounded flex items-center justify-center">
              <FileJson className="w-8 h-8 text-[#BFFF00]" />
            </div>
          </motion.div>


          {/* LEFT: AGENT */}
          <div className="relative z-10 bg-[#0B0E14] rounded-2xl"> {/* bg to hide line behind */}
            <div className="w-24 h-24 rounded-2xl glass-panel flex items-center justify-center border-white/20">
              <Bot className="w-12 h-12 text-white" />
            </div>
            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-mono text-sm text-gray-400">AGENT</p>
          </div>

          {/* RIGHT: API */}
          <div className="relative z-10 bg-[#0B0E14] rounded-2xl">
            <motion.div 
              className="w-24 h-24 rounded-2xl glass-panel flex items-center justify-center transition-colors duration-500"
              style={{ borderColor: apiUnlockColor }}
            >
              <Server className="w-12 h-12 text-white" />
            </motion.div>
            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-mono text-sm text-gray-400">API</p>

            {/* 402 Signal Badge */}
            <motion.div 
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#BFFF00] text-black px-3 py-1 rounded font-mono font-bold text-xs whitespace-nowrap shadow-[0_0_20px_#BFFF00]"
              style={{ scale: signalScale, opacity: signalOpacity }}
            >
              HTTP 402: PAYMENT REQUIRED
            </motion.div>

            {/* Success Check */}
            <motion.div
               className="absolute -top-12 left-1/2 -translate-x-1/2 text-[#BFFF00]"
               style={{ opacity: useTransform(scrollYProgress, [0.75, 0.8], [0, 1]) }}
            >
               <CheckCircle className="w-6 h-6" />
            </motion.div>
          </div>

        </div>

        {/* Status Text at bottom */}
        <motion.div className="absolute bottom-32 font-mono text-sm text-gray-400">
           <span className="opacity-50">STATUS: </span>
           <motion.span style={{ color: apiUnlockColor }}>
             {useTransform(scrollYProgress, 
               [0, 0.4, 0.5, 0.8, 1], 
               ["IDLE", "REQUESTING", "PAYMENT_REQUIRED", "SETTLING", "COMPLETE"]
             )}
           </motion.span>
        </motion.div>
      </div>
    </div>
  );
};
