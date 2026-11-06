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

const LINKS = [
  { button: "#preview", target: ".preview-stage", from: 0.78, to: 0.42, drop: 215 },
  { button: "#setup", target: "#setup .steps", from: 0.31, to: 0.5, drop: 254, lane: 60, side: "left" },
  { button: "#commands", target: "#commands .rows", from: 0.58, to: 0.27, drop: 135, lane: 64, approach: 36 },
];

const RETURN = { button: "#reddit", target: "#reddit .steps p", from: 0.85, step: 20, rise: 70, gutter: 28, lane: 170, margin: 16, to: 0.5 };

const HEART = { word: "embeds", index: 4, cell: 2.5, columns: 15, rows: 12 };

const HEART_SHAPE = [
  [9, 12], [9, 11], [10, 11], [10, 10], [11, 10], [11, 9],
  [12, 9], [12, 8], [13, 8], [13, 7], [14, 7], [14, 6],
  [15, 6], [15, 2], [14, 2], [14, 1], [13, 1], [13, 0],
  [9, 0], [9, 1], [8, 1], [8, 2], [7, 2], [7, 1],
  [6, 1], [6, 0], [2, 0], [2, 1], [1, 1], [1, 2],
  [0, 2], [0, 6], [1, 6], [1, 7], [2, 7], [2, 8],
  [3, 8], [3, 9], [4, 9], [4, 10], [5, 10], [5, 11],
  [6, 11], [6, 12],
];

const POINTER = { button: ".intro .btn[href^=\"https://github.com\"]", icon: ".headerlinks .icon-btn", from: 0.88, rise: 150, gap: 8, head: 5 };

const links = document.querySelector(".links");
const linkPaths = links.querySelectorAll("path");
const snap = (value) => Math.round(value) + 0.5;

const textRight = (element) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  return Math.max(...Array.from(range.getClientRects(), (rect) => rect.right));
};

const trace = (points) => points.map(([x, y], i) => `${i ? "L" : "M"}${snap(x)} ${snap(y)}`).join("");

const letterBox = (element, word, index) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const at = node.textContent.indexOf(word);
    if (at < 0) continue;
    const range = document.createRange();
    range.setStart(node, at + index);
    range.setEnd(node, at + index + 1);
    return range.getBoundingClientRect();
  }
  return null;
};


function drawPointer(origin, zoom) {
  const button = document.querySelector(POINTER.button).getBoundingClientRect();
  const icon = document.querySelector(POINTER.icon).getBoundingClientRect();
  const pageTop = origin.top - document.documentElement.getBoundingClientRect().top;
  const startX = button.left - origin.left + button.width * POINTER.from;
  const startY = button.top - origin.top;
  const turnY = startY - POINTER.rise * zoom;
  const endX = icon.left - origin.left + icon.width / 2;
  const endY = icon.bottom - pageTop + POINTER.gap * zoom;
  const reach = POINTER.head * zoom;

  linkPaths[LINKS.length + 1].setAttribute("d", trace([[startX, startY], [startX, turnY], [endX, turnY], [endX, endY]]));
  linkPaths[LINKS.length + 2].setAttribute("d", trace([[endX - reach, endY + reach], [endX, endY], [endX + reach, endY + reach]]));
}

function drawReturn(origin, zoom) {
  const button = document.querySelector(`.intro .btn[href="${RETURN.button}"]`).getBoundingClientRect();
  const target = document.querySelector(RETURN.target).getBoundingClientRect();
  const title = document.querySelector(".intro h1");
  const intro = document.querySelector(".intro p");
  const startX = button.left - origin.left + button.width * RETURN.from;
  const startY = button.top - origin.top;
  const stepY = startY - RETURN.step * zoom;
  const riseY = title.getBoundingClientRect().top - origin.top - RETURN.rise * zoom;
  const clearX = Math.max(textRight(title), textRight(intro)) - origin.left + RETURN.gutter * zoom;
  const turnX = Math.max(startX, clearX);
  const laneX = Math.max(target.left - origin.left - RETURN.lane * zoom, RETURN.margin * zoom - origin.left);
  const endY = target.top - origin.top + target.height * RETURN.to;
  const letter = letterBox(title, HEART.word, HEART.index);
  const cell = Math.round(HEART.cell * zoom);
  const baseY = Math.round(riseY);
  const heartLeft = letter ? Math.round(letter.left - origin.left + letter.width / 2 - (HEART.columns * cell) / 2) : 0;
  const heart = letter ? HEART_SHAPE.map(([column, row]) => [heartLeft + column * cell, baseY - (HEART.rows - row) * cell]) : [];
  const lead = [[startX, startY], [startX, stepY]];
  const trail = [[laneX, baseY], [laneX, endY], [target.left - origin.left, endY]];

  if (turnX > startX) lead.push([turnX, stepY]);
  lead.push([turnX, baseY]);

  linkPaths[LINKS.length].setAttribute("d", trace([...lead, ...heart, ...trail]));
}

function drawLinks() {
  const origin = links.getBoundingClientRect();
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-zoom")) || 1;
  const edge = document.querySelector("#setup .steps").getBoundingClientRect().right - origin.left;
  links.setAttribute("viewBox", `0 0 ${origin.width} ${origin.height}`);
  links.style.strokeWidth = zoom;

  LINKS.forEach((link, index) => {
    const button = document.querySelector(`.intro .btn[href="${link.button}"]`).getBoundingClientRect();
    const target = document.querySelector(link.target).getBoundingClientRect();
    const startX = button.left - origin.left + button.width * link.from;
    const startY = button.bottom - origin.top;
    const endX = target.left - origin.left + target.width * link.to;
    const endY = target.top - origin.top;
    const turnY = startY + link.drop * zoom;
    const points = [[startX, startY], [startX, turnY]];

    if (link.side === "left") {
      const laneX = Math.max(target.left - origin.left - link.lane * zoom, RETURN.margin * zoom - origin.left);
      const sideY = endY + target.height * link.to;
      points.push([laneX, turnY], [laneX, sideY], [target.left - origin.left, sideY]);
      linkPaths[index].setAttribute("d", trace(points));
      return;
    }

    if (link.lane) {
      const laneX = edge + link.lane * zoom;
      const approachY = endY - link.approach * zoom;
      points.push([laneX, turnY], [laneX, approachY], [endX, approachY]);
    } else {
      points.push([endX, turnY]);
    }
    points.push([endX, endY]);

    linkPaths[index].setAttribute("d", trace(points));
  });

  drawReturn(origin, zoom);
  drawPointer(origin, zoom);
}

new ResizeObserver(drawLinks).observe(document.querySelector(".page"));
window.addEventListener("resize", drawLinks);
document.fonts.ready.then(drawLinks);

const nextFrame = () => new Promise(requestAnimationFrame);
document.fonts.ready.then(nextFrame).then(nextFrame).then(() => card.classList.add("is-ready"));

const markScrolled = () => header.classList.toggle("is-scrolled", window.scrollY > SCROLLED_AFTER);
window.addEventListener("scroll", markScrolled, { passive: true });
markScrolled();
