import { NextResponse } from "next/server";

const AI_BASE_URL =
  process.env.AI_API_BASE_URL ??
  process.env.NEXT_PUBLIC_AI_API_BASE_URL ??
  "http://192.168.0.186:8001";

type RouteContext = {
  params: Promise<{ cctvId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { cctvId } = await context.params;

  try {
    const requestUrl = new URL(request.url);
    const queryString = requestUrl.searchParams.toString();
    const upstreamUrl =
      AI_BASE_URL.replace(/\/$/, "") +
      "/api/cctvs/" +
      encodeURIComponent(cctvId) +
      "/bbox" +
      (queryString ? "?" + queryString : "");

    const response = await fetch(upstreamUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ detections: [], items: [], data: { detections: [] } });
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ detections: [], items: [], data: { detections: [] } });
  }
}
