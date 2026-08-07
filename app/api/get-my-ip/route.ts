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

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
  }
  return false;
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
    const vercelIp = request.headers.get("x-vercel-forwarded-for");

    let rawClientIp = cfIp || vercelIp || (forwarded ? forwarded.split(",")[0].trim() : (realIp || ""));
    let clientIp = normalizeIp(rawClientIp);

    const localIps = getLocalMachineIps();
    let publicIp = "";

    // If client IP from header is public, use it directly as publicIp
    if (clientIp && !isPrivateIp(clientIp)) {
      publicIp = clientIp;
    } else {
      // Fallback: fetch public WAN IP from ipify if running locally or behind private proxy
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.ip) {
            publicIp = normalizeIp(data.ip);
          }
        }
      } catch (e) {
        // Ignore fallback errors
      }
    }

    const finalPrimaryIp = publicIp || clientIp || (localIps.length > 0 ? localIps[0] : "127.0.0.1");

    return NextResponse.json({
      ip: finalPrimaryIp,
      publicIp: publicIp || finalPrimaryIp,
      localIp: localIps.length > 0 ? localIps[0] : "127.0.0.1",
      networkIps: localIps,
      isPrivate: isPrivateIp(clientIp)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to detect IP" }, { status: 500 });
  }
}
