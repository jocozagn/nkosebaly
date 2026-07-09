import { describe, expect, it } from "vitest";
import { getCertificateEligibility } from "@/lib/admin/store";
import { buildMinimalAdminData } from "../../../tests/fixtures/admin-data";

describe("getCertificateEligibility", () => {
  it("refuse si les leçons ne sont pas terminées", () => {
    const data = buildMinimalAdminData();
    const result = getCertificateEligibility(data, "user-1", "course-1");

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("leçons");
  });

  it("refuse si le quiz certifiant n'est pas réussi", () => {
    const data = buildMinimalAdminData();
    data.lesson_progress.push({
      id: "prog-1",
      user_id: "user-1",
      lesson_id: "lesson-1",
      course_id: "course-1",
      completed: true,
      watch_percent: 100,
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    const result = getCertificateEligibility(data, "user-1", "course-1");

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("quiz");
  });

  it("accepte quand leçons 100 % et quiz réussi", () => {
    const data = buildMinimalAdminData();
    data.lesson_progress.push({
      id: "prog-1",
      user_id: "user-1",
      lesson_id: "lesson-1",
      course_id: "course-1",
      completed: true,
      watch_percent: 100,
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    data.quiz_attempts.push({
      id: "attempt-1",
      user_id: "user-1",
      course_id: "course-1",
      score: 1,
      total: 1,
      passed: true,
      answers: [],
      created_at: "2026-01-01T00:00:00.000Z",
    });

    const result = getCertificateEligibility(data, "user-1", "course-1");

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("");
  });
});
