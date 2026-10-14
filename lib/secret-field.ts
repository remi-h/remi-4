import { clock, effect, frame, frameLoop, init, surface } from 'vgpu';
import type { FrameLoopHandle, Gpu } from 'vgpu';
import fieldShader from './secret-field.wgsl';

/**
 * Starts the /.secret WebGPU field on `canvas` and returns a teardown. Without WebGPU, init
 * throws and the canvas stays blank. Reduced motion draws one still frame instead of a loop.
 */
export function startSecretField(canvas: HTMLCanvasElement, { still }: { still: boolean }): () => void {
  let disposed = false;
  let loop: FrameLoopHandle | undefined;
  let gpu: Gpu | undefined;
  let observer: ResizeObserver | undefined;

  void (async () => {
    try {
      gpu = await init();
    } catch {
      return; // No WebGPU here: leave the canvas empty.
    }
    if (disposed) return gpu.dispose();

    const canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
    const field = effect(gpu, fieldShader, { label: 'secret-field', set: { params: { time: 0, aspect: 1 } } });
    canvasSurface.onResize(({ width, height }) => field.set({ params: { aspect: width / height } }));

    if (still) {
      // Auto-resize runs at frame boundaries, so redraw the still frame when the canvas changes size.
      const ctx = gpu;
      observer = new ResizeObserver(() => frame(ctx, (f) => f.pass(canvasSurface, field)));
      observer.observe(canvas);
      return;
    }
    const time = clock(gpu);
    loop = frameLoop(gpu, (f) => {
      field.set({ params: { time: time.time } });
      f.pass(canvasSurface, field);
    });
  })();

  return () => {
    disposed = true;
    observer?.disconnect();
    loop?.stop();
    gpu?.dispose();
  };
}
