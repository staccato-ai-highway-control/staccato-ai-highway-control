import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ cctvId: string }>;
};

export async function GET(request: Request, _context: RouteContext) {
  const requestUrl = new URL(request.url);
  const sourceUrl = requestUrl.searchParams.get("source_url");

  if (!sourceUrl) {
    return NextResponse.json({ success: false, message: "source_url is required" }, { status: 400 });
  }

  try {
    const headers = new Headers();
    const range = request.headers.get("range");
    if (range) headers.set("range", range);

    const response = await fetch(sourceUrl, {
      headers,
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { success: false, message: "CCTV stream request failed" },
        { status: response.status || 502 }
      );
    }

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");

    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "CCTV stream request failed" },
      { status: 502 }
    );
  }
}
