'use client';

import { useEffect, useRef } from 'react';
import { startSecretField } from '@/lib/secret-field';

/** The WebGPU canvas on /.secret. Decorative, so it is hidden from screen readers. */
export const SecretField = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return startSecretField(canvas, { still });
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className={`block h-full w-full ${className ?? ''}`}
      data-testid="secret-field"
      ref={canvasRef}
    />
  );
};
