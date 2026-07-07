"use client";

import { useState } from "react";
import { Loader2, User } from "lucide-react";

export interface StudentProfileFormData {
  name: string;
  phone: string;
  email: string;
  city: string;
  occupation: string;
}

interface StudentProfileFieldsProps {
  values: StudentProfileFormData;
  onChange: (field: keyof StudentProfileFormData, value: string) => void;
  disabled?: boolean;
}

const defaultProfile: StudentProfileFormData = {
  name: "",
  phone: "",
  email: "",
  city: "",
  occupation: "",
};

/** Champs profil collectés à l'activation de la licence */
export const StudentProfileFields = ({
  values,
  onChange,
  disabled = false,
}: StudentProfileFieldsProps) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <User className="w-4 h-4" style={{ color: "var(--brand-brown)" }} />
      <p className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>
        Vos informations
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label htmlFor="profile-name" className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray-dark)" }}>
          Nom complet *
        </label>
        <input
          id="profile-name"
          type="text"
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          disabled={disabled}
          required
          placeholder="Ex. Mamadou Diallo"
          className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
        />
      </div>

      <div>
        <label htmlFor="profile-phone" className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray-dark)" }}>
          Téléphone *
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          disabled={disabled}
          required
          placeholder="Ex. 622 00 00 00"
          className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
        />
      </div>

      <div>
        <label htmlFor="profile-city" className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray-dark)" }}>
          Ville
        </label>
        <input
          id="profile-city"
          type="text"
          value={values.city}
          onChange={(e) => onChange("city", e.target.value)}
          disabled={disabled}
          placeholder="Ex. Conakry"
          className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
        />
      </div>

      <div>
        <label htmlFor="profile-email" className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray-dark)" }}>
          E-mail
        </label>
        <input
          id="profile-email"
          type="email"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          disabled={disabled}
          placeholder="optionnel"
          className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
        />
      </div>

      <div>
        <label htmlFor="profile-occupation" className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray-dark)" }}>
          Profession / activité
        </label>
        <input
          id="profile-occupation"
          type="text"
          value={values.occupation}
          onChange={(e) => onChange("occupation", e.target.value)}
          disabled={disabled}
          placeholder="Ex. Enseignant, étudiant..."
          className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
        />
      </div>
    </div>

    <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
      * Champs obligatoires. Ces informations permettent à l&apos;équipe de vous accompagner.
    </p>
  </div>
);

export { defaultProfile };
