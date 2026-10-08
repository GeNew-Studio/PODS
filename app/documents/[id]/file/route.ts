import fs from "fs";
import path from "path";
import { getDocument } from "@/lib/db";
import { uploadsDir } from "@/lib/documents";

const types: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document?.signedStoredName) return new Response("Not found", { status: 404 });
  const root = path.resolve(uploadsDir);
  const filePath = path.resolve(root, document.signedStoredName);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) return new Response("Not found", { status: 404 });
  const bytes = fs.readFileSync(filePath);
  const extension = path.extname(document.signedStoredName).toLowerCase();
  return new Response(bytes, {
    headers: {
      "Content-Type": types[extension] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${document.signedFileName ?? document.signedStoredName}"`,
    },
  });
}
