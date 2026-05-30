import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  const { cctvId } = await context.params;
  const upstreamUrl = new URL(
    `/internal/cameras/${encodeURIComponent(cctvId)}/detections`,
    AI_VM_BASE_URL.replace(/\/$/, "")
  );

  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? { success: false, error: "Invalid AI VM response" }, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        camera_id: cctvId,
        error: error instanceof Error ? error.message : "Failed to fetch CCTV detections",
      },
      { status: 502 }
    );
  }
}
