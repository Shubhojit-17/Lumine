import React, { useEffect, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Section } from './Section';
import { ArrowDown } from 'lucide-react';

const NUM_POINTS = 100;
const RADIUS = 150;

interface Point {
  x: number;
  y: number;
  z: number;
  id: number;
}

const generateSpherePoints = (count: number, r: number): Point[] => {
  const points: Point[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y); // Radius at y
    
    const theta = phi * i;
    
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    points.push({ x: x * r, y: y * r, z: z * r, id: i });
  }
  return points;
};

interface HeroProps {
  onJoin?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onJoin }) => {
  const points = useMemo(() => generateSpherePoints(NUM_POINTS, RADIUS), []);
  const { scrollY } = useScroll();
  
  // Rotation state for the continuous spin
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      setRotation(prev => (prev + 0.005) % (Math.PI * 2));
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Transform scroll into "unraveling" progress (0 to 1)
  // We want it to unravel as we scroll down the first window height
  const unravelProgress = useTransform(scrollY, [0, 500], [0, 1]);
  const smoothUnravel = useSpring(unravelProgress, { stiffness: 100, damping: 20 });
  
  // Opacity for the hero text fading out
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const textY = useTransform(scrollY, [0, 300], [0, 100]);

  return (
    <Section className="perspective-[1000px] overflow-hidden">
      {/* Central 3D Core */}
      <div className="relative w-[400px] h-[400px] flex items-center justify-center">
        {points.map((point) => (
          <HeroPoint 
            key={point.id} 
            point={point} 
            rotation={rotation} 
            unravel={smoothUnravel} 
          />
        ))}
        
        {/* Core Glow */}
        <motion.div 
          className="absolute inset-0 bg-[#5546FF] blur-[100px] opacity-20 rounded-full"
          style={{ opacity: useTransform(smoothUnravel, [0, 0.5], [0.2, 0]) }}
        />
      </div>

      {/* Copy */}
      <motion.div 
        className="absolute z-10 text-center flex flex-col items-center"
        style={{ opacity: textOpacity, y: textY }}
      >
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          The Economy of Inference.
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl font-light">
          Autonomous agents paying for the world’s APIs via USDCx on Stacks.
        </p>

        <button 
          onClick={onJoin}
          className="glass-pill px-8 py-3 rounded-full flex items-center gap-3 hover:bg-white/10 transition-colors group cursor-pointer"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BFFF00] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#BFFF00]"></span>
          </span>
          <span className="text-sm font-mono tracking-widest uppercase">Join Protocol</span>
        </button>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-12 opacity-50 animate-bounce"
        style={{ opacity: textOpacity }}
      >
        <ArrowDown className="w-6 h-6 text-white/50" />
      </motion.div>
    </Section>
  );
};

const HeroPoint: React.FC<{ point: Point; rotation: number; unravel: any }> = ({ point, rotation, unravel }) => {
  // Project 3D point to 2D based on rotation
  // We apply rotation around Y axis
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  // Rotated coordinates
  const rx = point.x * cos - point.z * sin;
  const rz = point.x * sin + point.z * cos;
  const ry = point.y;

  // Perspective projection
  const scale = 400 / (400 - rz); // Simple perspective
  const x2d = rx * scale;
  const y2d = ry * scale;

  // Unraveled state: A vertical line streaming down
  // We'll map the point ID to a vertical position
  const lineY = (point.id - NUM_POINTS / 2) * 5; // Spread vertically
  const lineX = 0;

  // Interpolate between Sphere State and Line State
  const x = useTransform(unravel, [0, 1], [x2d, lineX]);
  const y = useTransform(unravel, [0, 1], [y2d, lineY]);
  
  // Scale down slightly when unraveled
  const opacity = useTransform(unravel, [0, 0.5, 1], [0.6 + (rz / RADIUS) * 0.4, 0.5, 0.8]);
  const size = useTransform(unravel, [0, 1], [3 * scale, 2]);
  
  // Color transition from Purple (Core) to Blue (Stream)
  const color = useTransform(unravel, [0, 1], ['#5546FF', '#2775CA']);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        x,
        y,
        width: size,
        height: size,
        backgroundColor: color,
        opacity,
        zIndex: rz > 0 ? 10 : 0, // Simple Z-sorting
      }}
    />
  );
};
