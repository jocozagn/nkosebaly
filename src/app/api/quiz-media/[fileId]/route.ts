import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { attachmentExists, getAttachmentFilePath } from "@/lib/attachments/storage";
import { isAdminRequest } from "@/lib/admin/auth";
import { getActiveLicenseByMobileToken } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Sert un fichier média quiz (audio/image) — licence ou admin requis */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
): Promise<NextResponse> => {
  const { fileId } = await params;
  const mimeType = req.nextUrl.searchParams.get("mime") ?? "application/octet-stream";

  let authorized = isAdminRequest(req);

  const mobileTokenQuery = req.nextUrl.searchParams.get("mobile_token")?.trim();
  if (!authorized && mobileTokenQuery) {
    const license = await getActiveLicenseByMobileToken(mobileTokenQuery);
    authorized = Boolean(license);
  }

  if (!authorized) {
    const mobileCheck = await requireMobileDevice(req);
    authorized = mobileCheck.ok;
  }

  if (!authorized) {
    const licenseCheck = await requireActiveLicense(req);
    authorized = licenseCheck.ok;
  }

  if (!authorized) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const exists = await attachmentExists(fileId, mimeType);
  if (!exists) {
    return NextResponse.json({ error: true, message: "Fichier introuvable" }, { status: 404 });
  }

  const filePath = getAttachmentFilePath(fileId, mimeType);
  const stream = createReadStream(filePath);

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
