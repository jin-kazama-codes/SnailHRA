import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.SUPABASE_S3_REGION || "ap-southeast-1",
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.NEXT_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_ACCESS_KEY_SECRET!,
  },
  forcePathStyle: true, // Required for Supabase S3-compatible endpoint
});

const BUCKET = process.env.SUPABASE_S3_BUCKET || "employee-documents";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucketOverride = (formData.get("bucket") as string) || BUCKET;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${timestamp}_${sanitizedName}`;
    const mimeType = file.type || "application/octet-stream";

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    if (process.env.NEXT_ACCESS_KEY_ID && process.env.NEXT_ACCESS_KEY_SECRET) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketOverride,
            Key: filePath,
            Body: fileBuffer,
            ContentType: mimeType,
          })
        );

        // Build Supabase public URL for the uploaded file
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketOverride}/${filePath}`;

        return NextResponse.json({
          success: true,
          url: publicUrl,
          path: filePath,
        });
      } catch (s3Err: any) {
        console.error("S3 upload error:", s3Err?.message || s3Err);
        // Fall through to Base64 fallback
      }
    }

    // Base64 Data URL fallback if S3 is unavailable
    const base64String = Buffer.from(fileBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64String}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      isBase64Fallback: true,
    });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
