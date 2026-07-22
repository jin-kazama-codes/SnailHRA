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
    const { data, error } = await supabase.from("employees").select("count", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ 
        connected: false, 
        synced: false, 
        error: error.message,
        env: { url: maskedUrl, key: maskedKey }
      });
    }
    return NextResponse.json({ 
      connected: true, 
      synced: true, 
      count: data,
      env: { url: maskedUrl, key: maskedKey }
    });
  } catch (err: any) {
    return NextResponse.json({ 
      connected: false, 
      synced: false, 
      error: err.message || "Unknown error",
      env: { url: maskedUrl, key: maskedKey }
    });
  }
}
