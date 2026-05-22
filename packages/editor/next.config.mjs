/**
 * Next.js config — m13 editor
 *
 * - transpilePackages: deja que Next compile el TS de @m13/runtime y @m13/synth
 *   directamente desde sus `src/` (no hace falta build previo)
 * - reactStrictMode: ON (sano default)
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@m13/runtime', '@m13/synth'],
  webpack(config) {
    // Permitir que imports con extensión `.js` resuelvan archivos `.ts` reales.
    // Es el patrón ESM-bundler que usa @m13/runtime (requisito de moduleResolution:'Bundler').
    // Sin esto, Next falla con "Module not found: ./engine.js" al consumir el runtime.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    // Tratar archivos .m13 como texto plano si se importan
    config.module.rules.push({
      test: /\.m13$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
