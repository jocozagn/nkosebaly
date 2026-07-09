import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getCourses, saveCourse } from "@/lib/admin/store";
import type { AdminCourse, CourseLevel, CourseStatus } from "@/lib/admin/types";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const courses = await getCourses();
  return NextResponse.json({ error: false, data: courses });
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.title) {
    return NextResponse.json({ error: true, message: "Titre requis" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const course: AdminCourse = {
    id: crypto.randomUUID(),
    title: body.title,
    short_description: body.short_description ?? "",
    level: (body.level as CourseLevel) ?? "debutant",
    status: (body.status as CourseStatus) ?? "draft",
    category_id: body.category_id ?? "",
    lessons_count: 0,
    sequential_access: body.sequential_access !== false,
    created_at: now,
    updated_at: now,
  };

  const saved = await saveCourse(course);
  return NextResponse.json({ error: false, data: saved });
};
