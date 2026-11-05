const SCROLLED_AFTER = 4;
const RING_RADIUS = 197.8;
const RING_FILL = 0.62;
const RING_WIDTH = 6.88;
const RING_SEGMENTS = 120;
const REDRAW_MS = 380;
const SVG_NS = "http://www.w3.org/2000/svg";

const RING_STYLES = {
  pride: ["#c25a5a", "#cf9156", "#cdbf6a", "#5a9a6c", "#5a7fc4", "#8161a8"],
  trans: ["#5bcefa", "#f5a9b8", "#ffffff", "#f5a9b8", "#5bcefa"],
};

const card = document.getElementById("card");
const foot = card.querySelector(".card-foot");
const ringPaint = card.querySelector(".ring-paint");
const header = document.querySelector(".header");
const switches = document.querySelectorAll(".switch");
const choice = { size: "tall", fields: "fields", interval: "1", ring: "default" };
let redrawTimer;

function cadenceText(hours) {
  if (hours === 1) return "updates hourly";
  if (hours === 24) return "updates daily";
  return `updates every ${hours}h`;
}

function colorAt(stops, t) {
  const position = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const mix = position - index;
  const [from, to] = [stops[index], stops[index + 1]].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  return `rgb(${from.map((channel, i) => Math.round(channel + (to[i] - channel) * mix)).join(",")})`;
}

function pointAt(turn) {
  const angle = turn * Math.PI * 2 - Math.PI / 2;
  return [RING_RADIUS * Math.cos(angle), RING_RADIUS * Math.sin(angle)];
}

function paintRing(style) {
  ringPaint.replaceChildren();
  const stops = RING_STYLES[style];
  if (!stops) return;

  const overhang = RING_WIDTH / 2 / RING_RADIUS / (Math.PI * 2);
  const span = RING_FILL + overhang * 2;

  for (let i = 0; i < RING_SEGMENTS; i++) {
    const turn = -overhang + (span * i) / RING_SEGMENTS;
    const [x0, y0] = pointAt(turn);
    const [x1, y1] = pointAt(turn + span / RING_SEGMENTS + 0.0015);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M${x0} ${y0}A${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${x1} ${y1}`);
    path.setAttribute("stroke", colorAt(stops, (turn + span / RING_SEGMENTS / 2) / RING_FILL));
    ringPaint.append(path);
  }
}

function redrawRing(style) {
  clearTimeout(redrawTimer);
  card.classList.add("is-redrawing");
  redrawTimer = setTimeout(() => {
    card.classList.toggle("is-styled", style !== "default");
    paintRing(style);
    card.classList.remove("is-redrawing");
  }, REDRAW_MS);
}

switches.forEach((item) => {
  item.addEventListener("click", () => {
    const { group, value } = item.dataset;
    if (choice[group] === value) return;
    choice[group] = value;

    switches.forEach((other) => {
      other.classList.toggle("is-active", choice[other.dataset.group] === other.dataset.value);
    });

    card.classList.toggle("is-compact", choice.size === "compact");
    card.classList.toggle("is-plain", choice.fields === "plain");
    foot.textContent = cadenceText(Number(choice.interval));
    if (group === "ring") redrawRing(choice.ring);
  });
});

const nextFrame = () => new Promise(requestAnimationFrame);
document.fonts.ready.then(nextFrame).then(nextFrame).then(() => card.classList.add("is-ready"));

const markScrolled = () => header.classList.toggle("is-scrolled", window.scrollY > SCROLLED_AFTER);
window.addEventListener("scroll", markScrolled, { passive: true });
markScrolled();
