export const RING_STYLES = {
  pride: ["#c25a5a", "#cf9156", "#cdbf6a", "#5a9a6c", "#5a7fc4", "#8161a8"],
  trans: ["#5bcefa", "#f5a9b8", "#ffffff", "#f5a9b8", "#5bcefa"],
};

const CAP = 0.004;

export function ringPaint(ctx, style, cx, cy, fill) {
  const stops = RING_STYLES[style];
  if (!stops) return null;

  const first = stops[0];
  const last = stops.at(-1);
  const end = Math.min(1, fill + CAP);

  const gradient = ctx.createConicGradient(-Math.PI / 2, cx, cy);
  stops.forEach((stop, i) => gradient.addColorStop((i / (stops.length - 1)) * fill, stop));
  gradient.addColorStop(end, last);
  gradient.addColorStop(Math.max(end, 1 - CAP), first);
  gradient.addColorStop(1, first);
  return gradient;
}
