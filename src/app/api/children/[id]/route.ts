import { NextResponse } from "next/server";

import { deleteChild, getChildById, updateChild } from "@/lib/db";
import { childSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const childId = Number(id);

  if (!Number.isInteger(childId)) {
    return NextResponse.json({ error: "Ungueltige ID." }, { status: 400 });
  }

  if (!getChildById(childId)) {
    return NextResponse.json({ error: "Kind nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = childSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." },
      { status: 400 },
    );
  }

  const child = updateChild(childId, {
    name: parsed.data.name,
    birthDate: parsed.data.birthDate || null,
  });

  return NextResponse.json({ child });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const childId = Number(id);

  if (!Number.isInteger(childId)) {
    return NextResponse.json({ error: "Ungueltige ID." }, { status: 400 });
  }

  deleteChild(childId);

  return new NextResponse(null, { status: 204 });
}
