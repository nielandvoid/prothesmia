import type { CountdownEvent } from "./countdown.ts";

export type CountdownResponse = {
  status: "ok";
  now: number;
  event: CountdownEvent | null;
  style: { ring: string; dimensions: string; fields: string[]; tag: string; clock: boolean };
  targetText: string | null;
};

export type ErrorResponse = {
  status: "error";
  message: string;
};
