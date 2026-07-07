import type { StudentProfileInput } from "@/lib/admin/types";

/** Valide les champs profil requis à l'activation */
export const validateStudentProfile = (
  profile: Partial<StudentProfileInput>
): { valid: true; data: StudentProfileInput } | { valid: false; message: string } => {
  const name = profile.name?.trim() ?? "";
  const phone = profile.phone?.trim() ?? "";

  if (name.length < 2) {
    return { valid: false, message: "Indiquez votre nom complet (2 caractères minimum)" };
  }
  if (phone.length < 8) {
    return { valid: false, message: "Indiquez un numéro de téléphone valide" };
  }

  const email = profile.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: "Adresse e-mail invalide" };
  }

  return {
    valid: true,
    data: {
      name: name.slice(0, 80),
      phone: phone.slice(0, 20),
      email: email?.slice(0, 120),
      city: profile.city?.trim().slice(0, 80),
      occupation: profile.occupation?.trim().slice(0, 80),
    },
  };
};
