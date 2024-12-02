import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { env } from "@/env";
import { headers } from "next/headers";

export async function GET() {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const apiKey = authHeader.split(" ")[1];

    if (apiKey !== env.AUTH_SECRET) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      );
    }

    const contracts = await db.contract.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 },
    );
  }
}