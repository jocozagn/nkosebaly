/** Types pour le panneau d'administration Balandou Wourouki */

export type CourseLevel = "debutant" | "intermediaire" | "avance";
export type CourseStatus = "draft" | "published";
export type QuizCategory = "grammaire" | "vocabulaire" | "ecriture" | "comprehension";
export type QuizDifficulty = "facile" | "moyen" | "difficile";
export type CardDurationMonths = 3 | 6 | 12;
export type CardStatus = "unused" | "active" | "expired" | "disabled";
export type PaymentStatus = "pending" | "paid";

export interface AdminCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface AdminChapter {
  id: string;
  course_id: string;
  title: string;
  order: number;
}

export interface AdminLesson {
  id: string;
  course_id: string;
  chapter_id: string;
  title: string;
  video_id?: string;
  video_url?: string;
  order: number;
  duration_minutes: number;
}

/** Pièce jointe liée à une leçon (PDF, images, documents…) */
export interface AdminLessonAttachment {
  id: string;
  lesson_id: string;
  course_id: string;
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

/** Question posée par un élève sur une leçon */
export interface AdminLessonQuestion {
  id: string;
  lesson_id: string;
  course_id: string;
  author_name: string;
  text: string;
  created_at: string;
  /** Réponse de l'administrateur */
  admin_reply?: string;
  admin_replied_at?: string;
}

/** Vote like / dislike sur une leçon */
export interface AdminLessonReaction {
  id: string;
  lesson_id: string;
  voter_id: string;
  vote: "like" | "dislike";
  created_at: string;
}

export interface AdminCourse {
  id: string;
  title: string;
  short_description: string;
  level: CourseLevel;
  status: CourseStatus;
  category_id: string;
  lessons_count: number;
  /** Si true (défaut), les leçons se débloquent une par une */
  sequential_access?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminQuizQuestion {
  id: string;
  course_id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  active: boolean;
  created_at: string;
}

export interface AdminLicenseCard {
  id: string;
  /** Référence interne admin — jamais imprimée sur la carte */
  code_text: string;
  /** Secret d'activation — encodé uniquement dans le QR verso */
  activation_token: string;
  duration_months: CardDurationMonths;
  status: CardStatus;
  device_id?: string;
  activated_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  device_id?: string;
  license_card_id?: string;
  enrolled_course_ids: string[];
  progress_percent: number;
  created_at: string;
  /** Téléphone — requis à l'activation */
  phone?: string;
  email?: string;
  city?: string;
  occupation?: string;
  /** Profil complété lors de l'activation */
  profile_completed?: boolean;
}

/** Données profil collectées à l'activation (app mobile ou web) */
export interface StudentProfileInput {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  occupation?: string;
}

export type AdminNotificationType =
  | "license_activated"
  | "lesson_question"
  | "certificate_pending"
  | "certificate_paid";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, string>;
  created_at: string;
}

/** Lien entre cookie auth web et carte licence activée */
export interface StudentAuthSession {
  auth_token: string;
  device_id: string;
  license_card_id: string;
  linked_at: string;
}

/** Progression d'un élève sur une leçon */
export interface StudentLessonProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed: boolean;
  watch_percent: number;
  completed_at?: string;
  updated_at: string;
}

/** Tentative de quiz certifiant par un élève */
export interface StudentQuizAttempt {
  id: string;
  user_id: string;
  course_id: string;
  score: number;
  total: number;
  passed: boolean;
  answers: { question_id: string; selected: number; correct: boolean }[];
  created_at: string;
}

export interface AdminCertificate {
  id: string;
  user_id: string;
  course_id: string;
  unique_code: string;
  payment_status: PaymentStatus;
  verification_hash: string;
  issued_at?: string;
  created_at: string;
  /** Date de la demande élève */
  requested_at?: string;
  /** Référence lien Djomy */
  djomy_link_reference?: string;
  /** Transaction Djomy confirmée */
  djomy_transaction_id?: string;
}

export interface AdminSettings {
  app_name: string;
  contact_email: string;
  contact_phone: string;
  commission_rate: number;
  instructor_auto_approve: boolean;
  certificate_price: number;
  quiz_pass_threshold: number;
  quiz_max_attempts: number;
}

export interface AdminData {
  categories: AdminCategory[];
  courses: AdminCourse[];
  chapters: AdminChapter[];
  lessons: AdminLesson[];
  lesson_attachments: AdminLessonAttachment[];
  lesson_questions: AdminLessonQuestion[];
  lesson_reactions: AdminLessonReaction[];
  quiz_questions: AdminQuizQuestion[];
  license_cards: AdminLicenseCard[];
  student_auth_sessions: StudentAuthSession[];
  lesson_progress: StudentLessonProgress[];
  quiz_attempts: StudentQuizAttempt[];
  users: AdminUser[];
  certificates: AdminCertificate[];
  notifications: AdminNotification[];
  settings: AdminSettings;
}
