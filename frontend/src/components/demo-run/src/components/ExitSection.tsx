import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface ExitSectionProps {
  visible: boolean;
  onReset: () => void;
}

export const ExitSection = ({ visible, onReset }: ExitSectionProps) => {
  const navigate = useNavigate();
  
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="fixed bottom-12 left-0 right-0 flex justify-center gap-16 z-20"
    >
      <button 
        onClick={onReset}
        className="font-inter text-[14px] uppercase tracking-[0.25em] text-white/55 hover:text-white transition-colors duration-300 bg-transparent border-none cursor-pointer"
      >
        Re-run Sequence
      </button>
      
      <button
        onClick={() => navigate('/')}
        className="font-inter text-[14px] uppercase tracking-[0.25em] text-white/55 hover:text-white transition-colors duration-300 bg-transparent border-none cursor-pointer"
      >
        Return to Architecture
      </button>
    </motion.div>
  );
};
