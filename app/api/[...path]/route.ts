import { NextRequest, NextResponse } from "next/server";

function getBackendUrl() {
  if (process.env.BACKEND_API_URL) return process.env.BACKEND_API_URL;
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:4000/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://skyroute-server.onrender.com/api";
}


async function handleProxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const subPath = path ? path.join("/") : "";
  const search = request.nextUrl.search || "";
  const backendBase = getBackendUrl();
  const targetUrl = `${backendBase.replace(/\/+$/, "")}/${subPath}${search}`;


  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Exclude host/origin headers so backend server processes request without CORS rejection
    if (!["host", "origin", "referer", "connection"].includes(lower)) {
      headers.set(key, value);
    }
  });

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        responseHeaders.set(key, value);
      }
    });

    // Forward all Set-Cookie headers from backend
    if (backendRes.headers.getSetCookie) {
      const setCookies = backendRes.headers.getSetCookie();
      setCookies.forEach((cookieStr) => {
        responseHeaders.append("set-cookie", cookieStr);
      });
    } else {
      const cookie = backendRes.headers.get("set-cookie");
      if (cookie) {
        responseHeaders.set("set-cookie", cookie);
      }
    }

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy error connecting to backend";
    return NextResponse.json(
      { error: { code: "proxy_error", message } },
      { status: 502 },
    );
  }
}


export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
