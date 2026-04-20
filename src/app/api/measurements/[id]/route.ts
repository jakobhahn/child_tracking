import { NextResponse } from "next/server";

import { deleteMeasurement, updateMeasurement } from "@/lib/db";
import { measurementUpdateSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const measurementId = Number(id);

  if (!Number.isInteger(measurementId)) {
    return NextResponse.json({ error: "Ungueltige ID." }, { status: 400 });
  }

  const payload = await request.json();
  const parsed = measurementUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." },
      { status: 400 },
    );
  }

  const measurement = updateMeasurement(measurementId, parsed.data);
  return NextResponse.json({ measurement });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const measurementId = Number(id);

  if (!Number.isInteger(measurementId)) {
    return NextResponse.json({ error: "Ungueltige ID." }, { status: 400 });
  }

  deleteMeasurement(measurementId);

  return new NextResponse(null, { status: 204 });
}
