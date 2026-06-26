import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FLASK_API_BASE_URL =
  process.env.FLASK_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://192.168.0.187:5000";

export async function GET() {
  const flaskUrl = `${FLASK_API_BASE_URL.replace(/\/$/, "")}/api/realtime/incidents/recent`;

  try {
    const response = await fetch(flaskUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        count: 0,
        items: [],
        message: error instanceof Error ? error.message : "Flask realtime incidents proxy failed",
      },
      { status: 500 }
    );
  }
}
