import { NextResponse } from "next/server";

export const ok = (data: unknown, status = 200) =>
  NextResponse.json({ ok: true, data }, { status });

export const err = (message: string, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });
