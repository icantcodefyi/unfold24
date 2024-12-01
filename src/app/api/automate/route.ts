/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextResponse } from "next/server";

interface ContractPrompt {
  prompt: string;
}

export async function POST(request: Request) {
  try {
    const { prompt }: ContractPrompt = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const response = await fetch("http://localhost:8000/generate-contract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the response stream
    const stream = response.body;
    if (!stream) {
      throw new Error("No stream available");
    }

    // Create and return a new stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in contract generation:", error);
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 },
    );
  }
}
