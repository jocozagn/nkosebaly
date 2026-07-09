import { describe, expect, it } from "vitest";
import { validateStudentProfile } from "@/lib/admin/profile";

describe("validateStudentProfile", () => {
  it("accepte un profil valide minimal", () => {
    const result = validateStudentProfile({
      name: "Mamadou Diallo",
      phone: "+224620000000",
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe("Mamadou Diallo");
      expect(result.data.phone).toBe("+224620000000");
    }
  });

  it("refuse un nom trop court", () => {
    const result = validateStudentProfile({ name: "A", phone: "620000000" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("nom");
    }
  });

  it("refuse un téléphone trop court", () => {
    const result = validateStudentProfile({ name: "Test User", phone: "123" });
    expect(result.valid).toBe(false);
  });

  it("refuse un e-mail invalide", () => {
    const result = validateStudentProfile({
      name: "Test User",
      phone: "620000000",
      email: "pas-un-email",
    });
    expect(result.valid).toBe(false);
  });

  it("tronque les champs trop longs", () => {
    const result = validateStudentProfile({
      name: "A".repeat(100),
      phone: "1".repeat(30),
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name.length).toBeLessThanOrEqual(80);
      expect(result.data.phone.length).toBeLessThanOrEqual(20);
    }
  });
});
