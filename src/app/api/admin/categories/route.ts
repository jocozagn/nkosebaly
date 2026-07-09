import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getCategories, saveCategory } from "@/lib/admin/store";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const categories = await getCategories();
  return NextResponse.json({ error: false, data: categories });
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.name) {
    return NextResponse.json({ error: true, message: "Nom requis" }, { status: 400 });
  }

  const category = await saveCategory({
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description ?? "",
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ error: false, data: category });
};
