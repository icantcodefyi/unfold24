import { NextResponse } from "next/server";
import { db } from "../../../server/db";

export async function GET(request: Request) {
  try {
    // Get ownerAddress from URL search params
    const { searchParams } = new URL(request.url);
    const ownerAddress = searchParams.get("ownerAddress");

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "Owner address is required" },
        { status: 400 }
      );
    }

    // Fetch the latest contract for the owner address
    const contract = await db.contract.findFirst({
      where: {
        ownerAddress: ownerAddress,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!contract) {
      return NextResponse.json(
        { error: "No contract found for this address" },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
    
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}
