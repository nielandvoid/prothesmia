import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { headline, timeLeft, dateText } from "./time.js";

const font = (file) => fileURLToPath(new URL(`../fonts/${file}`, import.meta.url));

GlobalFonts.registerFromPath(font("inter-greek-300.woff"), "Inter Greek");
GlobalFonts.registerFromPath(font("geist-400.woff"), "Geist");
GlobalFonts.registerFromPath(font("geist-500.woff"), "Geist Medium");
GlobalFonts.registerFromPath(font("geist-mono-400.woff"), "Geist Mono");
GlobalFonts.registerFromPath(font("geist-mono-500.woff"), "Geist Mono Medium");

const W = 1000;
const DIMENSIONS = {
  tall: { height: 700, ring: 0.46, rowH: 96 },
  compact: { height: 500, ring: 0.29, rowH: 68 },
};

const color = {
  bg: "#1b1b1b",
  fg: "#e8e8e6",
  muted: "#8a8a8a",
  value: "#b9b9b7",
  line: "#333333",
  glassLine: "rgba(232, 232, 230, 0.2)",
  track: "#2e2e2e",
};

function tracked(ctx, text, x, y, spacing, align = "left") {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let cursor = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += widths[i];
  });
}

function fitFont(ctx, text, family, size, maxWidth) {
  let current = size;
  ctx.font = `${current}px "${family}"`;
  while (ctx.measureText(text).width > maxWidth && current > 40) {
    current -= 4;
    ctx.font = `${current}px "${family}"`;
  }
}

const DEFAULT_FIELDS = ["target", "timeLeft", "elapsed"];

const fieldRows = {
  target: (countdown, m) => ["target", dateText(m, countdown.timeZone)],
  timeLeft: (countdown, m) => ["time left", timeLeft(m)],
  elapsed: (countdown, m) => m.elapsed === null ? null : ["elapsed", `${Math.round(m.elapsed * 100)}%`],
};

export async function drawCard(countdown, m) {
  const { height: H, ring, rowH } = DIMENSIONS[countdown.dimensions] ?? DIMENSIONS.tall;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "middle";

  const padX = W * 0.05;
  const padBottom = W * 0.04;

  ctx.fillStyle = color.bg;
  ctx.fillRect(0, 0, W, H);

  const s = 2.2;
  const blockPad = { y: 12 * s, left: 14 * s, right: 16 * s };
  const blockH = blockPad.y * 2 + 17 * s;
  const blockCy = blockH / 2;
  const dotR = 3 * s;
  const gap = 9 * s;

  ctx.font = `${14 * s}px "Inter Greek"`;
  const wordW = ctx.measureText("προθεσμία").width + 0.02 * 14 * s * 8;
  const blockW = blockPad.left + dotR * 2 + gap + wordW + blockPad.right;

  ctx.strokeStyle = color.glassLine;
  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(padX + 0.5, 0);
  ctx.lineTo(padX + 0.5, blockH);
  ctx.lineTo(padX + blockW - 0.5, blockH);
  ctx.lineTo(padX + blockW - 0.5, 0);
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = color.fg;
  ctx.shadowColor = "rgba(232, 232, 230, 0.85)";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(padX + blockPad.left + dotR, blockCy + 1, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = color.fg;
  ctx.font = `${14 * s}px "Inter Greek"`;
  tracked(ctx, "προθεσμία", padX + blockPad.left + dotR * 2 + gap, blockCy, 0.02 * 14 * s);

  const tag = countdown.tag === undefined ? countdown.label : countdown.tag;
  if (tag) {
    ctx.fillStyle = color.muted;
    ctx.font = '24px "Geist"';
    tracked(ctx, tag, W - padX, blockCy, 0.5, "right");
  }

  const rows = (countdown.fields ?? DEFAULT_FIELDS)
    .map((key) => fieldRows[key]?.(countdown, m))
    .filter(Boolean);
  const right = W - padX;

  const ringSize = W * ring;
  const cx = rows.length ? padX + ringSize / 2 : W / 2;
  const cy = (blockH + H - 50) / 2;
  const radius = ringSize * 0.46;

  ctx.lineWidth = ringSize * 0.016;
  ctx.strokeStyle = color.track;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const fill = m.elapsed ?? 1;
  if (fill > 0) {
    ctx.strokeStyle = color.fg;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill);
    ctx.stroke();
  }

  const { value, unit } = headline(m);
  ctx.fillStyle = color.fg;
  fitFont(ctx, value, "Geist Mono Medium", ringSize * 0.34, ringSize * 0.7);
  ctx.textAlign = "center";
  ctx.fillText(value, cx, cy - ringSize * 0.04);

  ctx.fillStyle = color.muted;
  ctx.font = `${ringSize * 0.076}px "Geist"`;
  tracked(ctx, unit, cx, cy + ringSize * 0.16, 1, "center");

  if (rows.length) {
    const left = padX + ringSize + 40;
    const top = cy - (rowH * rows.length) / 2;
    const inset = 26;

    ctx.lineWidth = 1;
    ctx.strokeStyle = color.glassLine;
    ctx.beginPath();
    ctx.rect(left + 0.5, top + 0.5, right - left - 1, rowH * rows.length - 1);
    for (let i = 1; i < rows.length; i++) {
      ctx.moveTo(left, top + rowH * i + 0.5);
      ctx.lineTo(right, top + rowH * i + 0.5);
    }
    ctx.stroke();

    rows.forEach(([label, text], i) => {
      const y = top + rowH * i + rowH / 2;
      ctx.fillStyle = color.muted;
      ctx.font = '25px "Geist"';
      tracked(ctx, label, left + inset, y, 0.5);
      ctx.fillStyle = color.value;
      tracked(ctx, text, right - inset, y, 0.5, "right");
    });
  }

  ctx.fillStyle = color.muted;
  ctx.font = '25px "Geist"';
  tracked(ctx, "updates hourly // prothesmia.xyz", right, H - padBottom - 11, 0.5, "right");

  return canvas.encode("png");
}
