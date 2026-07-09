import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { saveVideoFile } from "@/lib/videos/storage";

/** Upload vidéo admin — stockage privé sur le serveur */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: true, message: "Fichier vidéo requis" }, { status: 400 });
  }

  try {
    const saved = await saveVideoFile(file);
    return NextResponse.json({ error: false, data: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de l'upload";
    return NextResponse.json({ error: true, message }, { status: 400 });
  }
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
