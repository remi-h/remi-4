// Node module hooks for running lib/flight headlessly (scripts/flight/render-sky.mts): TypeScript runs on
// Node's own type stripping, extensionless relative imports resolve to .ts, .wgsl files are prepared through
// @vgpu/wgsl (what the bundler loader does in the app), and `vgpu` maps to `vgpu/node`.
import { fileURLToPath } from 'node:url';

/** A relative import whose last segment has no extension, e.g. `../route`. */
const EXTENSIONLESS = /^\.\.?\/(?:.*\/)?[^./]+$/;
const FROM_TYPESCRIPT = /\.m?ts$/;

/** `vgpu` → `vgpu/node`; an extensionless relative import from a TypeScript file → the `.ts` file. */
function rewrite(specifier, parentURL = '') {
  if (specifier === 'vgpu') return 'vgpu/node';
  return FROM_TYPESCRIPT.test(parentURL) && EXTENSIONLESS.test(specifier) ? `${specifier}.ts` : specifier;
}

export async function resolve(specifier, context, next) {
  return next(rewrite(specifier, context.parentURL), context);
}

export async function load(url, context, next) {
  if (!url.endsWith('.wgsl')) return next(url, context);
  const { resolveShader } = await import('@vgpu/wgsl/runtime');
  const { prepareShader } = await import('@vgpu/wgsl/prepare');
  const resolved = await resolveShader({ entry: fileURLToPath(url), validate: false });
  return {
    format: 'module',
    shortCircuit: true,
    source: `export default ${JSON.stringify(prepareShader(resolved.wgsl))};`,
  };
}
