import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ connected: false, synced: false, error: "Supabase client uninitialized" });
  }
  try {
    const { data, error } = await supabase.from("employees").select("count", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ connected: false, synced: false, error: error.message });
    }
    return NextResponse.json({ connected: true, synced: true, count: data });
  } catch (err: any) {
    return NextResponse.json({ connected: false, synced: false, error: err.message });
  }
}
