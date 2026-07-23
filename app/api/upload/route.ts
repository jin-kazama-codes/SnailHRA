import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "employee-documents";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${timestamp}_${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    if (supabase) {
      try {
        // Attempt upload to Supabase storage
        let { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        // If bucket not found, attempt to create it dynamically
        if (error && (error.message?.toLowerCase().includes("not found") || error.message?.toLowerCase().includes("bucket"))) {
          try {
            await supabase.storage.createBucket(bucket, { public: true });
            const retry = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
              contentType: mimeType,
              upsert: true,
            });
            data = retry.data;
            error = retry.error;
          } catch (createErr) {
            console.warn("Auto-create bucket notice:", createErr);
          }
        }

        if (!error && data) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
          return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            path: data.path,
          });
        }
      } catch (storageErr) {
        console.warn("Supabase storage exception:", storageErr);
      }
    }

    // Base64 Data URL Fallback if S3 bucket is unconfigured
    const base64String = Buffer.from(fileBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64String}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      isBase64Fallback: true
    });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
