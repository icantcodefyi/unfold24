/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextResponse } from "next/server";

interface ContractPrompt {
  prompt: string;
}

export async function POST(request: Request) {
  try {
    const { prompt }: ContractPrompt = await request.json();
    let contractAbi: string | null = null;
    let contractBytecode: string | null = null;
    let contractCode: string | null = null;
    let contractArgs: string | null = null;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      "https://5a62-163-47-210-23.ngrok-free.app/generate-contract",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let buffer = '';
    const transformStream = new TransformStream({
      transform: async (chunk, controller) => {
        const text = new TextDecoder().decode(chunk);
        buffer += text;

        // Split by newlines, keeping any incomplete line in the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('event: status')) {
            controller.enqueue(line + '\n');
            continue;
          }

          if (line.startsWith('data: ')) {
            try {
              // Attempt to parse the JSON data
              const jsonStr = line.slice(6).trim();
              const statusData = JSON.parse(jsonStr);

              // Update contract data based on agent responses
              if (statusData.agent === "Compiler" && statusData.status === "success") {
                contractAbi = statusData.data.abi;
                contractBytecode = statusData.data.bytecode;
              } else if (statusData.agent === "Developer" && statusData.status === "completed") {
                contractCode = statusData.data.contract_code;
              } else if (statusData.agent === "ContractManager" && statusData.status === "completed") {
                console.log(statusData.data);
                if (statusData.data.constructor_params) {
                  contractArgs = JSON.stringify(statusData.data.constructor_params);
                }
              }

              console.log("Contract ABI:", JSON.stringify(contractAbi).slice(0, 10) + "...");
              console.log("Contract Bytecode:", contractBytecode?.slice(0, 10) + "...");
              console.log("Contract Code:", contractCode?.slice(0, 10) + "...");
              console.log("Contract Args:", JSON.stringify(contractArgs).slice(0, 10) + "...");

              if (contractAbi && contractBytecode && contractCode && contractArgs) {
                console.log("Contract data collection is complete");
              }

              // Forward the complete line to the client
              controller.enqueue(line + '\n');
            } catch (e) {
              console.error("Error parsing status data:", e);
              // Don't forward invalid JSON to the client
            }
          }
        }
      },
      flush: (controller) => {
        // Handle any remaining data in the buffer
        if (buffer.trim()) {
          try {
            if (buffer.startsWith('data: ')) {
              const statusData = JSON.parse(buffer.slice(6).trim());
              controller.enqueue(buffer + '\n');
            }
          } catch (e) {
            console.error("Error parsing final buffer:", e);
          }
        }
      }
    });

    // Pipe the response through the transform stream
    const readableStream = response.body;
    if (!readableStream) {
      throw new Error("No stream available");
    }

    await readableStream.pipeThrough(transformStream);

    // Return the transformed stream
    return new Response(transformStream.readable, {
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
