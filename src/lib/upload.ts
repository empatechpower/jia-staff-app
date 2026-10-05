import { Platform } from "react-native";

// Same unsigned Cloudinary preset the web app uses for receipts and certificates.
const CLOUD = "diwozc824";
const PRESET = "qbxh6ddv";

export type PickedFile = { uri: string; name: string; mimeType: string; size?: number };

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

export function validateFile(f: PickedFile): string | null {
  if (!ALLOWED.includes(f.mimeType)) return "Only images and PDF files are supported.";
  if ((f.size ?? 0) > MAX_BYTES) return "File must be under 10 MB.";
  return null;
}

export async function uploadToCloudinary(f: PickedFile): Promise<string> {
  const form = new FormData();
  form.append("file", { uri: f.uri, name: f.name, type: f.mimeType } as any);
  form.append("upload_preset", PRESET);
  form.append("folder", "bloom-community");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/upload`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json", "X-Platform": Platform.OS },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message ?? `Upload failed (${res.status})`);
  return data.secure_url as string;
}
