// compress-images.mjs — one-time image optimization script
// Run: node scripts/compress-images.mjs
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lifeDir   = join(__dirname, '..', 'life');

// Max display width for the gallery column:
// 38% of 1280px max-width ≈ 486px, but support 2× retina → 972px, round to 900
const MAX_W = 900;

const tasks = [
  // PNGs → WebP (dramatically smaller)
  { src: 'img1.png', out: 'img1.webp', type: 'webp' },
  { src: 'img2.png', out: 'img2.webp', type: 'webp' },
  { src: 'img4.png', out: 'img4.webp', type: 'webp' },
  { src: 'img5.png', out: 'img5.webp', type: 'webp' },
  { src: 'img6.png', out: 'img6.webp', type: 'webp' },
  // JPEGs → optimized progressive JPEG
  { src: 'img3.jpg', out: 'img3.webp', type: 'webp' },
  { src: 'img7.jpg', out: 'img7.webp', type: 'webp' },
  { src: 'img8.jpg', out: 'img8.webp', type: 'webp' },
];

for (const t of tasks) {
  const src  = join(lifeDir, t.src);
  const dest = join(lifeDir, t.out);
  let pipeline = sharp(src).resize({ width: MAX_W, withoutEnlargement: true });

  if (t.type === 'webp') {
    pipeline = pipeline.webp({ quality: 82, effort: 4 });
  }

  const info = await pipeline.toFile(dest);
  console.log(`✓ ${t.src.padEnd(10)} → ${t.out.padEnd(12)}  ${(info.size / 1024).toFixed(0).padStart(5)} KB`);
}

console.log('\nDone. Update about.js PHOTO_DATA src paths to use .webp files.');
