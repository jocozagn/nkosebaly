import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import {
  getAdminNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/admin/store";

/** Liste des notifications admin */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const notifications = await getAdminNotifications();
  const unreadCount = await getUnreadNotificationCount();

  return NextResponse.json({
    error: false,
    data: {
      notifications: unreadOnly ? notifications.filter((n) => !n.read) : notifications,
      unread_count: unreadCount,
    },
  });
};

/** Marquer une ou toutes les notifications comme lues */
export const PATCH = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  if (body?.all === true) {
    await markAllNotificationsRead();
    return NextResponse.json({ error: false, message: "Toutes les notifications lues" });
  }

  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: true, message: "id requis" }, { status: 400 });
  }

  const ok = await markNotificationRead(id);
  if (!ok) {
    return NextResponse.json({ error: true, message: "Notification introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, message: "Notification lue" });
};
