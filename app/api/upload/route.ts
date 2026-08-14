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

function getMimeType(fileName: string, fallbackType: string): string {
  if (fallbackType && fallbackType !== "application/octet-stream" && fallbackType !== "") {
    return fallbackType;
  }
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg":
    case "jfif": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "bmp": return "image/bmp";
    case "svg": return "image/svg+xml";
    case "heic": return "image/heic";
    case "heif": return "image/heif";
    case "avif": return "image/avif";
    case "tiff":
    case "tif": return "image/tiff";
    case "pdf": return "application/pdf";
    case "doc": return "application/msword";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default: return fallbackType || "application/octet-stream";
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucketOverride = (formData.get("bucket") as string) || BUCKET;
    const folder = (formData.get("folder") as string) || "checklist-documents";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    // If a folder is specified, store under folder/timestamp_filename
    const filePath = folder
      ? `${folder}/${timestamp}_${sanitizedName}`
      : `${timestamp}_${sanitizedName}`;

    const mimeType = getMimeType(file.name, file.type || "");

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
