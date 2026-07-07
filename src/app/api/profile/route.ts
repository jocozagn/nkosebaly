import { NextRequest, NextResponse } from "next/server";
import {
  getStudentProfileByAuthToken,
  isStudentProfileComplete,
  registerStudentProfile,
} from "@/lib/admin/store";
import { validateStudentProfile } from "@/lib/admin/profile";
import {
  getDeviceId,
  requireActiveLicense,
  setProfileCompleteCookie,
} from "@/lib/license/require-license";

/** Profil de l'élève connecté */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const user = await getStudentProfileByAuthToken(licenseCheck.authToken);

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

  const response = NextResponse.json({
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

  if (isStudentProfileComplete(user)) {
    setProfileCompleteCookie(response);
  }

  return response;
};

/** Complète ou met à jour le profil élève */
export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const deviceId = getDeviceId(req);
  if (!deviceId) {
    return NextResponse.json({ error: true, message: "Appareil non identifié" }, { status: 400 });
  }

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
    deviceId,
    licenseCheck.card.id,
    profileCheck.data,
    { notifyAdmin: false }
  );

  const response = NextResponse.json({
    error: false,
    message: "Profil enregistré",
    data: {
      name: user.name,
      phone: user.phone,
      email: user.email,
      city: user.city,
      occupation: user.occupation,
      profile_completed: true,
    },
  });

  setProfileCompleteCookie(response);
  return response;
};
