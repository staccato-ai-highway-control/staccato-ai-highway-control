import { NextRequest } from "next/server";

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
    `/snapshots/${encodeURIComponent(cctvId)}/latest.jpg`,
    AI_VM_BASE_URL.replace(/\/$/, "")
  );

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    return new Response("Snapshot not available", {
      status: response.status || 502,
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
