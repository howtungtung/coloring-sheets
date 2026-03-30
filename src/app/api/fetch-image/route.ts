import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only HTTP/HTTPS URLs allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ColoringSheetGenerator/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream returned ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "URL does not point to an image" }, { status: 400 });
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json({ error: "Image exceeds 10MB limit" }, { status: 413 });
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "Image exceeds 10MB limit" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
