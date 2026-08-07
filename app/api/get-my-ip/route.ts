import { NextResponse } from "next/server";
import os from "os";

function normalizeIp(ip: string): string {
  if (!ip) return "";
  let clean = ip.trim();
  if (clean.startsWith("::ffff:")) {
    clean = clean.replace("::ffff:", "");
  }
  if (clean === "::1" || clean === "localhost") {
    clean = "127.0.0.1";
  }
  return clean;
}

function getLocalMachineIps(): string[] {
  const ips: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal && net.address) {
          ips.push(net.address);
        }
      }
    }
  } catch (e) {
    // Ignore OS network errors
  }
  return ips;
}

export async function GET(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfIp = request.headers.get("cf-connecting-ip");

    let rawClientIp = cfIp || (forwarded ? forwarded.split(",")[0].trim() : (realIp || ""));
    let clientIp = normalizeIp(rawClientIp);

    const localIps = getLocalMachineIps();

    if (!clientIp || clientIp === "127.0.0.1") {
      if (localIps.length > 0) {
        clientIp = localIps[0];
      } else {
        clientIp = "127.0.0.1";
      }
    }

    return NextResponse.json({
      ip: clientIp,
      rawIp: rawClientIp || "127.0.0.1",
      networkIps: localIps,
      isLocalhost: clientIp === "127.0.0.1"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to detect IP" }, { status: 500 });
  }
}
