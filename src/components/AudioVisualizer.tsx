import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  color?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barCount = 4,
  color = '#1db954',
  className = '',
  size = 'small'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = barCount;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const gap = 2;
    const barWidth = Math.max(2, Math.floor((canvasWidth - (bars - 1) * gap) / bars));

    const idleHeights = Array.from({ length: bars }, (_, i) => 0.2 + (i % 2) * 0.15);
    const currentHeights = [...idleHeights];
    const targetHeights = [...idleHeights];

    let phase = Math.random() * 10;

    const render = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = color;

      if (isPlaying) {
        phase += 0.12;
        for (let i = 0; i < bars; i++) {
          const factor = Math.sin(phase + i * 1.3) * 0.4 + Math.cos(phase * 0.7 + i * 0.8) * 0.3 + 0.55;
          targetHeights[i] = Math.max(0.2, Math.min(0.95, factor));
          currentHeights[i] += (targetHeights[i] - currentHeights[i]) * 0.25;
        }
      } else {
        for (let i = 0; i < bars; i++) {
          currentHeights[i] += (idleHeights[i] - currentHeights[i]) * 0.15;
        }
      }

      for (let i = 0; i < bars; i++) {
        const h = Math.max(3, currentHeights[i] * canvasHeight);
        const x = i * (barWidth + gap);
        const y = canvasHeight - h;
        const radius = Math.min(barWidth / 2, 1.5);

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, h, radius);
        } else {
          ctx.rect(x, y, barWidth, h);
        }
        ctx.fill();
      }

      if (isPlaying || currentHeights.some((h, i) => Math.abs(h - idleHeights[i]) > 0.01)) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, barCount, color]);

  const dimensions = size === 'small' 
    ? { w: 26, h: 20 } 
    : size === 'medium' 
    ? { w: 36, h: 36 } 
    : { w: 54, h: 36 };

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.w}
      height={dimensions.h}
      className={`audio-visualizer ${className}`}
      style={{
        display: 'block',
        margin: '0 auto',
        padding: 0,
        width: `${dimensions.w}px`,
        height: `${dimensions.h}px`
      }}
    />
  );
};
