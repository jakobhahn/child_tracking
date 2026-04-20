import { NextResponse } from "next/server";

import { createChild, getChildren } from "@/lib/db";
import { childSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json({ children: getChildren().map((child) => child) });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = childSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." },
      { status: 400 },
    );
  }

  const child = createChild({
    name: parsed.data.name,
    birthDate: parsed.data.birthDate || null,
  });

  return NextResponse.json({ child }, { status: 201 });
}
