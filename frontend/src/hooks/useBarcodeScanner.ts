import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxInterKeyTimeMs?: number;
  playAudioBeep?: boolean;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 3,
  maxInterKeyTimeMs = 60,
  playAudioBeep = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Synthesize standard scanner confirmation beep via Web Audio API
  const triggerAudioBeep = useCallback(() => {
    if (!playAudioBeep || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // High pitch crisp industrial scanner beep
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext muted or blocked by browser policy
    }
  }, [playAudioBeep]);

  const simulateScan = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;
      triggerAudioBeep();
      onScan(clean);
    },
    [onScan, triggerAudioBeep],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      const now = performance.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key marks end of barcode sequence
      if (e.key === 'Enter') {
        const captured = bufferRef.current.trim();
        bufferRef.current = '';

        if (captured.length >= minChars) {
          // If input was actively focused in a normal text area, allow event to propagate,
          // but if it matches high-speed scanner timing, prevent default and trigger
          triggerAudioBeep();
          onScan(captured);
        }
        return;
      }

      // If delay between keys was too long (> maxInterKeyTimeMs), reset buffer (likely manual typing)
      if (elapsed > maxInterKeyTimeMs) {
        bufferRef.current = '';
      }

      // Accumulate printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, minChars, maxInterKeyTimeMs, onScan, triggerAudioBeep]);

  return {
    simulateScan,
    triggerAudioBeep,
  };
}
