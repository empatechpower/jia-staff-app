import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { PickedFile } from "./upload";

function fromAsset(a: { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null }): PickedFile {
  const mimeType = a.mimeType ?? "image/jpeg";
  const ext = mimeType.split("/")[1] ?? "jpg";
  return { uri: a.uri, name: a.fileName ?? `receipt-${Date.now()}.${ext}`, mimeType, size: a.fileSize ?? undefined };
}

// Returns null if the user cancels or denies permission.
export async function takePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (res.canceled || !res.assets?.[0]) return null;
  return fromAsset(res.assets[0]);
}

export async function chooseFile(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? "application/octet-stream", size: a.size ?? undefined };
}
