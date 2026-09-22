import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { email, password, name } = body;

  const user = await prisma.user.create({
    data: {
      email: email || "",
      password: password || "",
      name: name || "",
    },
  });

  const token = signToken({ userId: user.id, email: user.email });

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }, token });
}
