import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  const { cctvId } = await context.params;

  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
    <rect width="640" height="360" fill="#111827"/>
    <text x="32" y="75" fill="#e2e8f0" font-size="34" font-family="Arial" font-weight="700">${cctvId}</text>
    <text x="32" y="125" fill="#94a3b8" font-size="20" font-family="Arial">Snapshot Contract Ready</text>
  </svg>`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store"
    }
  });
}
