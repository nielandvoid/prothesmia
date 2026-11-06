import { progress, split } from "../shared/countdown.ts";

const RETRY_MS = 5000;
const TICK_MS = 1000;
const RING_RADIUS = 197.8;
const RING_WIDTH = 6.88;
const RING_SEGMENTS = 120;
const WIDE_FRAME = 600;
const SHORT_FRAME = 400;
const SVG_NS = "http://www.w3.org/2000/svg";

const RING_STYLES = {
  pride: ["#c25a5a", "#cf9156", "#cdbf6a", "#5a9a6c", "#5a7fc4", "#8161a8"],
  trans: ["#5bcefa", "#f5a9b8", "#ffffff", "#f5a9b8", "#5bcefa"],
};

const card = document.getElementById("card");
const tag = document.getElementById("tag");
const value = document.getElementById("value");
const unit = document.getElementById("unit");
const fill = document.getElementById("fill");
const paint = document.getElementById("paint");
const table = document.getElementById("table");
const clock = document.getElementById("clock");
const foot = document.getElementById("foot");
const message = document.getElementById("message");
const frame = document.querySelector(".frame");

let data = null;
let skew = 0;
let loading = false;
let painted = "";

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

function paintRing(style, filled) {
  const key = `${style}:${filled.toFixed(3)}`;
  if (key === painted) return;
  painted = key;
  paint.replaceChildren();

  const stops = RING_STYLES[style];
  card.toggleAttribute("data-styled", Boolean(stops) && filled > 0);
  if (!stops || filled <= 0) return;

  const overhang = filled < 1 ? RING_WIDTH / 2 / RING_RADIUS / (Math.PI * 2) : 0;
  const span = filled + overhang * 2;

  for (let i = 0; i < RING_SEGMENTS; i++) {
    const turn = -overhang + (span * i) / RING_SEGMENTS;
    const [x0, y0] = pointAt(turn);
    const [x1, y1] = pointAt(turn + span / RING_SEGMENTS + 0.0015);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M${x0} ${y0}A${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${x1} ${y1}`);
    path.setAttribute("stroke", colorAt(stops, (turn + span / RING_SEGMENTS / 2) / filled));
    paint.append(path);
  }
}

const pad = (number) => String(number).padStart(2, "0");

function applySize() {
  if (!data) return;
  const wideAndShort = frame.clientWidth >= WIDE_FRAME && frame.clientHeight <= SHORT_FRAME;
  card.dataset.size = wideAndShort ? "compact" : data.style.dimensions;
}

function setState(state, text = "") {
  card.dataset.state = state;
  message.textContent = text;
}

function headline(left) {
  if (left.days >= 1) return { number: String(left.days), text: left.days === 1 ? "day left" : "days left" };
  if (left.hours >= 1) return { number: String(left.hours), text: left.hours === 1 ? "hour left" : "hours left" };
  return { number: "<1", text: "hour left" };
}

function timeLeft(left) {
  if (left.days >= 1) return `${left.days}d ${left.hours}h`;
  if (left.hours >= 1) return `${left.hours}h ${left.minutes}m`;
  return `${left.minutes}m`;
}

function rowsFor(style, event, left, filled) {
  const available = {
    target: ["target", data.targetText],
    timeLeft: ["time left", timeLeft(left)],
    elapsed: event.start ? ["elapsed", `${Math.round(filled * 100)}%`] : null,
  };
  return style.fields.map((key) => available[key]).filter(Boolean);
}

async function load() {
  if (loading) return;
  loading = true;
  try {
    const response = await fetch("/api/countdown");
    const body = await response.json();
    if (body.status !== "ok") throw new Error(body.message);
    data = body;
    skew = body.now - Date.now();
    applySize();
    if (!body.event) setState("empty", "no upcoming event");
  } catch {
    data = null;
    setState("error", "couldn't load the countdown");
    setTimeout(load, RETRY_MS);
  } finally {
    loading = false;
  }
  render();
}

function render() {
  if (!data || !data.event) return;
  const now = Date.now() + skew;
  const { event, style } = data;

  if (Date.parse(event.target) <= now) {
    load();
    return;
  }

  const left = split(Date.parse(event.target) - now);
  const filled = progress(event, now);
  const { number, text } = headline(left);
  const rows = rowsFor(style, event, left, filled);

  setState("live");
  card.toggleAttribute("data-plain", rows.length === 0);
  card.toggleAttribute("data-clock", style.clock);
  card.style.setProperty("--rows", String(rows.length));
  clock.textContent = `${left.days}d ${pad(left.hours)}h ${pad(left.minutes)}m ${pad(left.seconds)}s`;
  tag.textContent = style.tag === "" ? event.label : style.tag.toLowerCase() === "none" ? "" : style.tag;
  value.textContent = number;
  unit.textContent = text;
  foot.textContent = "prothesmia.xyz";
  fill.style.display = filled > 0 ? "" : "none";
  fill.style.strokeDasharray = `${filled} 1`;
  paintRing(style.ring, filled);

  table.replaceChildren(
    ...rows.map(([name, content]) => {
      const row = document.createElement("div");
      const key = document.createElement("span");
      const text = document.createElement("span");
      key.textContent = name;
      text.textContent = content;
      row.append(key, text);
      return row;
    }),
  );
}

new ResizeObserver(applySize).observe(frame);
load();
setInterval(render, TICK_MS);
