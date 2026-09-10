/**
 * GitHub Pages icin statik export yapilandirmasi.
 *
 * NEXT_PUBLIC_BASE_PATH: proje sayfalarinda '/repo-adi', kullanici kok
 * sitesinde ('<kullanici>.github.io') bos kalir. Actions is akisi bu degeri
 * otomatik doldurur; '/' gelirse kok site kabul edilir cunku Next basePath
 * olarak tek basina '/' degerini kabul etmez.
 */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const basePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  // next/image sunucu tarafli optimizasyon ister; statik export'ta kapatilir.
  images: { unoptimized: true },
  // public/ altindaki dosya yollari basePath ile otomatik prefixlenmez,
  // bu yuzden normalize edilmis degeri istemci tarafina aciyoruz.
  env: { NEXT_PUBLIC_ASSET_PREFIX: basePath },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
