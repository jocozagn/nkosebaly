import { NextRequest, NextResponse } from "next/server";
import {
  getStudentUserByDeviceId,
  isStudentProfileComplete,
  registerStudentProfile,
} from "@/lib/admin/store";
import { validateStudentProfile } from "@/lib/admin/profile";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Profil élève — app mobile */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const user = deviceCheck.user ?? (await getStudentUserByDeviceId(deviceCheck.deviceId));

  if (!user) {
    return NextResponse.json({
      error: false,
      data: {
        name: "",
        phone: "",
        email: "",
        city: "",
        occupation: "",
        profile_completed: false,
        progress_percent: 0,
      },
    });
  }

  return NextResponse.json({
    error: false,
    data: {
      name: user.name,
      phone: user.phone ?? "",
      email: user.email ?? "",
      city: user.city ?? "",
      occupation: user.occupation ?? "",
      profile_completed: isStudentProfileComplete(user),
      progress_percent: user.progress_percent,
    },
  });
};

/** Met à jour le profil élève — app mobile */
export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const body = await req.json().catch(() => ({}));
  const profileCheck = validateStudentProfile({
    name: body?.name,
    phone: body?.phone,
    email: body?.email,
    city: body?.city,
    occupation: body?.occupation,
  });

  if (!profileCheck.valid) {
    return NextResponse.json({ error: true, message: profileCheck.message }, { status: 400 });
  }

  const user = await registerStudentProfile(
    deviceCheck.deviceId,
    deviceCheck.card.id,
    profileCheck.data,
    { notifyAdmin: false }
  );

  return NextResponse.json({
    error: false,
    message: "Profil enregistré",
    data: {
      name: user.name,
      phone: user.phone,
      email: user.email,
      city: user.city,
      occupation: user.occupation,
      profile_completed: true,
      progress_percent: user.progress_percent,
    },
  });
};
