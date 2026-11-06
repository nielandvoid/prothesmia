import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clockIn,
  daysLeft,
  fillTemplate,
  formatDate,
  parseEvents,
  parseInstant,
  progress,
  split,
  upcomingEvents,
  validZone,
} from "./countdown.ts";

const IST = "Asia/Kolkata";
const at = (text: string) => Date.parse(text);

test("parses local times in a zone", () => {
  assert.equal(parseInstant("2027-01-20 00:00", IST)?.toISOString(), "2027-01-19T18:30:00.000Z");
  assert.equal(parseInstant("2027-01-20", "UTC")?.toISOString(), "2027-01-20T00:00:00.000Z");
  assert.equal(parseInstant("2027-01-20T09:00:00+05:30", "UTC")?.toISOString(), "2027-01-20T03:30:00.000Z");
});

test("rejects times it cannot read", () => {
  assert.equal(parseInstant("soon", IST), null);
  assert.equal(parseInstant("20/01/2027", IST), null);
});

test("validates zones", () => {
  assert.equal(validZone("Asia/Kolkata"), true);
  assert.equal(validZone("Mars/Base"), false);
});

test("reads an event list and sorts it by date", () => {
  const { events, errors } = parseEvents(
    "JEE Advanced 2027 | 2027-05-23 09:00 ; JEE Main 2027 Session 1 | 2027-01-20 00:00 | 2026-11-06 00:00",
    IST,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(events.map((event) => event.label), ["JEE Main 2027 Session 1", "JEE Advanced 2027"]);
  assert.equal(events[0]?.start, "2026-11-05T18:30:00.000Z");
  assert.equal(events[1]?.start, undefined);
});

test("reports broken entries and keeps the good ones", () => {
  const { events, errors } = parseEvents("no date | ; | 2027-01-20 ; ok | 2027-01-20 | 2027-02-01 ; fine | 2027-01-20", IST);
  assert.deepEqual(events.map((event) => event.label), ["fine"]);
  assert.equal(errors.length, 3);
});

test("keeps only events in the future", () => {
  const { events } = parseEvents("a | 2026-01-01 ; b | 2027-01-01", "UTC");
  assert.deepEqual(upcomingEvents(events, at("2026-06-01T00:00:00Z")).map((event) => event.label), ["b"]);
});

test("counts whole days left like the discord card", () => {
  const event = { label: "x", target: "2027-01-19T18:30:00.000Z" };
  assert.equal(daysLeft(event, at("2026-11-05T18:33:00Z")), 74);
  assert.equal(daysLeft(event, at("2026-11-05T18:30:00Z")), 75);
  assert.equal(daysLeft(event, at("2027-02-01T00:00:00Z")), 0);
});

test("splits a duration", () => {
  assert.deepEqual(split(2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5_000), {
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
  });
  assert.deepEqual(split(-5), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test("progress runs from the start to the date", () => {
  const event = { label: "x", start: "2026-01-01T00:00:00.000Z", target: "2026-01-11T00:00:00.000Z" };
  assert.equal(progress(event, at("2025-12-01T00:00:00Z")), 0);
  assert.equal(progress(event, at("2026-01-06T00:00:00Z")), 0.5);
  assert.equal(progress(event, at("2026-02-01T00:00:00Z")), 1);
  assert.equal(progress({ label: "x", target: event.target }, at("2026-01-06T00:00:00Z")), 1);
});

test("reads the local clock in a zone", () => {
  assert.deepEqual(clockIn(at("2026-11-05T18:30:00Z"), IST), { date: "2026-11-06", hour: 0, minute: 0 });
  assert.deepEqual(clockIn(at("2026-11-05T18:29:00Z"), IST), { date: "2026-11-05", hour: 23, minute: 59 });
});

test("formats dates in lowercase", () => {
  assert.equal(formatDate("2027-01-19T18:30:00.000Z", IST), "20 jan 2027");
});

test("fills placeholders and leaves unknown ones alone", () => {
  assert.equal(fillTemplate("{days} days to {event} on {date} {nope}", { days: 74, event: "JEE", date: "20 jan 2027" }), "74 days to JEE on 20 jan 2027 {nope}");
});
