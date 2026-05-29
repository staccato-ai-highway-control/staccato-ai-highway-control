import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  const { cctvId } = await context.params;

  return NextResponse.json({
    success: true,
    camera_id: cctvId,
    frame_id: Date.now(),
    timestamp: new Date().toISOString(),
    frame_width: 1280,
    frame_height: 720,
    detections: []
  });
}
