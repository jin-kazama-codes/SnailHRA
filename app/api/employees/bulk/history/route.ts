import { NextResponse } from "next/server";
import { loadDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  try {
    const db = loadDatabase();
    let uploads = db.excelUploads || [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("excel_uploads")
          .select("*")
          .order("uploaded_at", { ascending: false });

        if (!error && data && data.length > 0) {
          uploads = data.map((item: any) => ({
            id: item.id,
            filename: item.filename,
            uploadedAt: item.uploaded_at,
            uploadedByName: item.uploaded_by_name || "Admin",
            uploadedById: item.uploaded_by_id || "",
            recordCount: item.record_count || 0,
            detectedCustomFields: item.detected_custom_fields || [],
            status: item.status || "Success",
            fileData: item.file_data || ""
          }));
        }
      } catch (sbErr) {
        console.warn("Supabase excel_uploads fetch warning:", sbErr);
      }
    }

    // Ensure sorted date-wise with newest uploads on top
    const sortedUploads = [...uploads].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json({ uploads: sortedUploads });
  } catch (error: any) {
    console.error("Failed to fetch upload history:", error);
    return NextResponse.json({ error: "Failed to fetch upload history" }, { status: 500 });
  }
}
