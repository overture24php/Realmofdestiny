import { motion } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  size: number;
  delay: number;
  dur: number;
  color: string;
  symbol: string;
}

const PARTICLES: Particle[] = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: 3 + (i * 13.7) % 94,
  size: 8 + (i * 3) % 14,
  delay: (i * 0.7) % 6,
  dur: 7 + (i * 1.1) % 8,
  color: ['#a855f7','#c084fc','#ec4899','#fbbf24','#818cf8','#f472b6'][i % 6],
  symbol: ['✦','✧','⬡','◈','❋','✺','⊕','✶'][i % 8],
}));

export function MagicParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute select-none"
          style={{ left: `${p.x}%`, bottom: -30, fontSize: p.size, color: p.color }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, -window.innerHeight - 60],
            opacity: [0, 0.7, 0.5, 0],
            x: [0, 20 * Math.sin(p.id), -15 * Math.cos(p.id), 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {p.symbol}
        </motion.div>
      ))}

      {/* Ember sparks */}
      {Array.from({ length: 16 }, (_, i) => (
        <motion.div
          key={`ember-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${5 + (i * 17) % 90}%`,
            bottom: `${10 + (i * 11) % 40}%`,
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            background: ['#a855f7','#fbbf24','#ec4899','#818cf8'][i % 4],
            boxShadow: `0 0 6px 2px ${ ['#a855f780','#fbbf2480','#ec489980','#818cf880'][i % 4]}`,
          }}
          animate={{
            y: [0, -(80 + (i * 20) % 120)],
            opacity: [0, 0.9, 0],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{
            duration: 2.5 + (i * 0.3) % 2,
            delay: (i * 0.4) % 4,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
