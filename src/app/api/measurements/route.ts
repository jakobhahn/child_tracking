import { NextResponse } from "next/server";

import { createMeasurement, getMeasurementsByChild } from "@/lib/db";
import { measurementSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const childId = Number(searchParams.get("childId"));

  if (!Number.isInteger(childId)) {
    return NextResponse.json({ error: "Kind-ID fehlt." }, { status: 400 });
  }

  return NextResponse.json({
    measurements: getMeasurementsByChild(childId),
  });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = measurementSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." },
      { status: 400 },
    );
  }

  const measurement = createMeasurement({
    childId: parsed.data.childId,
    measuredAt: parsed.data.measuredAt,
    weight: parsed.data.weight,
    height: parsed.data.height,
    temperature: parsed.data.temperature,
  });
  return NextResponse.json({ measurement }, { status: 201 });
}
