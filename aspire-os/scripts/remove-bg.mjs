import sharp from "sharp";

async function removeBg(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Sample background from all four corners and average
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  let bgR = 0, bgG = 0, bgB = 0;
  for (const [x, y] of corners) {
    const idx = (y * width + x) * channels;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);
  console.log(`${inputPath} → bg rgb(${bgR},${bgG},${bgB})`);

  // Hard threshold: pixels within this distance become transparent
  const HARD = 38;
  // Soft fringe: linearly ramp alpha from 0→255 over this additional range
  const SOFT = 22;

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const dr = out[i]     - bgR;
    const dg = out[i + 1] - bgG;
    const db = out[i + 2] - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist < HARD) {
      out[i + 3] = 0;
    } else if (dist < HARD + SOFT) {
      out[i + 3] = Math.round(((dist - HARD) / SOFT) * 255);
    }
    // else: leave fully opaque
  }

  await sharp(out, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Saved → ${outputPath}`);
}

const BASE = "c:/Users/Admin/aspire-os/public";

await removeBg(`${BASE}/aspire-os-logo.png`,                  `${BASE}/aspire-os-logo.png`);
await removeBg(`${BASE}/Screenshot 2026-05-22 110526.png`,    `${BASE}/favicon-trifoil.png`);
