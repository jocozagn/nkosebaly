import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { deleteCourse, getCourseById, saveCourse } from "@/lib/admin/store";
import type { CourseLevel, CourseStatus } from "@/lib/admin/types";

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: course });
};

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getCourseById(id);

  if (!existing) {
    return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  const updated = await saveCourse({
    ...existing,
    title: body?.title ?? existing.title,
    short_description: body?.short_description ?? existing.short_description,
    level: (body?.level as CourseLevel) ?? existing.level,
    status: (body?.status as CourseStatus) ?? existing.status,
    category_id: body?.category_id ?? existing.category_id,
    sequential_access:
      body?.sequential_access !== undefined ? body.sequential_access !== false : existing.sequential_access,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ error: false, data: updated });
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteCourse(id);

  if (!ok) {
    return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, message: "Cours supprimé" });
};
