import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  
  const maskedUrl = url ? `${url.substring(0, 15)}...${url.substring(url.length - 5)}` : "missing";
  const maskedKey = key ? `${key.substring(0, 12)}...${key.substring(key.length - 5)}` : "missing";

  if (!supabase) {
    return NextResponse.json({ 
      connected: false, 
      synced: false, 
      error: "Supabase client uninitialized",
      env: { url: maskedUrl, key: maskedKey }
    });
  }
  try {
    const { data, error, status, statusText } = await supabase.from("employees").select("id").limit(1);
    return NextResponse.json({ 
      connected: !error, 
      synced: !error, 
      status,
      statusText,
      error: error || null,
      data: data || null,
      env: { url: url ? maskedUrl : "missing", key: key ? maskedKey : "missing" }
    });
  } catch (err: any) {
    return NextResponse.json({ 
      connected: false, 
      synced: false, 
      error: { message: err.message || "Unknown exception", stack: err.stack },
      env: { url: url ? maskedUrl : "missing", key: key ? maskedKey : "missing" }
    });
  }
}
