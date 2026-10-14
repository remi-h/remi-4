// Node hooks for headless renders of lib/flight: TypeScript by Node's type stripping, extensionless
// relative imports resolved to .ts, .wgsl prepared through @vgpu/wgsl, and vgpu mapped to vgpu/node.
import { fileURLToPath } from 'node:url';
export async function resolve(specifier, context, next) {
  if (specifier === 'vgpu') return next('vgpu/node', context);
  if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier) && /\.m?ts$/.test(context.parentURL ?? '')) {
    return next(specifier + '.ts', context);
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.endsWith('.wgsl')) {
    const { resolveShader } = await import('@vgpu/wgsl/runtime');
    const { prepareShader } = await import('@vgpu/wgsl/prepare');
    const resolved = await resolveShader({ entry: fileURLToPath(url) });
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(prepareShader(resolved.wgsl))};` };
  }
  return next(url, context);
}
