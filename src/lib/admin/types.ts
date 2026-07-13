/** Types pour le panneau d'administration Balandou Wourouki */

export type CourseLevel = "debutant" | "intermediaire" | "avance";
export type CourseStatus = "draft" | "published";
export type QuizCategory = "grammaire" | "vocabulaire" | "ecriture" | "comprehension";
export type QuizDifficulty = "facile" | "moyen" | "difficile";
export type CardDurationMonths = 1 | 2 | 3 | 6 | 12;
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

/** Fichier média utilisé dans un quiz de leçon (audio ou image) */
export interface LessonQuizMediaFile {
  file_id: string;
  mime_type: string;
  original_name: string;
}

/** Types d'exercices quiz par leçon */
export type LessonQuizType =
  | "single_choice"
  | "multiple_choice"
  | "audio_pick_image"
  | "dictation"
  | "fill_blank_suggestions";

interface LessonQuizBase {
  id: string;
  lesson_id: string;
  course_id: string;
  order: number;
  type: LessonQuizType;
  prompt_text?: string;
  active: boolean;
  created_at: string;
}

/** Exercice quiz rattaché à une leçon (5 types supportés) */
export type AdminLessonQuizItem =
  | (LessonQuizBase & {
      type: "single_choice";
      options: string[];
      correct_index: number;
    })
  | (LessonQuizBase & {
      type: "multiple_choice";
      options: string[];
      correct_indices: number[];
    })
  | (LessonQuizBase & {
      type: "audio_pick_image";
      audio: LessonQuizMediaFile;
      image_options: LessonQuizMediaFile[];
      correct_image_index: number;
    })
  | (LessonQuizBase & {
      type: "dictation";
      audio: LessonQuizMediaFile;
      expected_answer: string;
      accept_variants?: string[];
    })
  | (LessonQuizBase & {
      type: "fill_blank_suggestions";
      sentence_template: string;
      suggestions: string[];
      correct_word: string;
    });

/** Réponse élève soumise pour un item de quiz leçon */
export type StudentLessonQuizAnswerPayload =
  | { item_id: string; type: "single_choice"; selected: number }
  | { item_id: string; type: "multiple_choice"; selected: number[] }
  | { item_id: string; type: "audio_pick_image"; selected: number }
  | { item_id: string; type: "dictation"; text: string }
  | { item_id: string; type: "fill_blank_suggestions"; word: string };

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
  /**
   * Accès aux cours :
   * - undefined / [] : accès à tous les cours publiés
   * - ["courseId1","courseId2"] : accès uniquement à ces cours
   */
  allowed_course_ids?: string[];
  /**
   * Prix d'achat de la carte licence (vente) — affichage/admin uniquement.
   * (Le paiement en ligne n'est pas encore branché à ce niveau.)
   */
  card_price_gnf?: number;
  /**
   * Optionnel : prix de certificat spécifique à cette carte.
   * Si absent : on utilise settings.certificate_price (global).
   */
  certificate_price_gnf?: number;
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

/** Session auth mobile (remplace le device_id) */
export interface MobileAuthSession {
  mobile_token: string;
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

/** Temps passé par un élève sur une journée (agrégé) */
export interface StudentDailyActivity {
  id: string;
  user_id: string;
  /** Format YYYY-MM-DD (fuseau client ou serveur) */
  date: string;
  total_seconds: number;
  /** Temps par leçon ce jour-là (lesson_id → secondes) */
  by_lesson: Record<string, number>;
  updated_at: string;
}

/** Statistiques de visionnage par leçon ou cours */
export interface ContentWatchStats {
  id: string;
  content_id: string;
  type: "lesson" | "course";
  course_id?: string;
  total_seconds: number;
  view_count: number;
  unique_users: string[];
  updated_at: string;
}

/** Événement envoyé par mobile/web (sync ou heartbeat) */
export interface WatchActivityPayload {
  course_id: string;
  lesson_id: string;
  watch_percent?: number;
  seconds_watched?: number;
  event_type: "heartbeat" | "lesson_open";
  source: "mobile" | "web";
  client_timestamp?: string;
  offline?: boolean;
}

/** Résumé analytics pour le tableau de bord admin */
export interface AdminAnalyticsSummary {
  days: number;
  totals: {
    watch_seconds: number;
    active_students: number;
    lesson_views: number;
  };
  students: {
    user_id: string;
    name: string;
    total_seconds: number;
    today_seconds: number;
    last_active_date?: string;
    daily: { date: string; seconds: number }[];
  }[];
  top_lessons: {
    lesson_id: string;
    lesson_title: string;
    course_title: string;
    total_seconds: number;
    view_count: number;
    unique_students: number;
  }[];
  top_courses: {
    course_id: string;
    course_title: string;
    total_seconds: number;
    view_count: number;
    unique_students: number;
  }[];
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

/** Tentative d'exercice quiz de leçon (score enregistré par élève) */
export interface StudentLessonQuizAttempt {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  score: number;
  total: number;
  passed: boolean;
  pass_required: number;
  details: { item_id: string; correct: boolean }[];
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

export interface LicensePlan {
  id: string;
  /** Durée d'accès en mois */
  duration_months: number;
  /** Prix Djomy en GNF */
  price_gnf: number;
  /** Libellé optionnel (sinon « X mois ») */
  label?: string;
  /** Formule visible à l'achat en ligne */
  active: boolean;
}

export interface AdminSettings {
  app_name: string;
  contact_email: string;
  contact_phone: string;
  commission_rate: number;
  instructor_auto_approve: boolean;
  /** @deprecated — utiliser license_plans. Conservé pour migration. */
  license_price: number;
  /** @deprecated — utiliser license_plans. Conservé pour migration. */
  license_duration_months: CardDurationMonths;
  /** Formules licence en ligne (Djomy) — plusieurs durées / prix */
  license_plans?: LicensePlan[];
  certificate_price: number;
  quiz_pass_threshold: number;
  quiz_max_attempts: number;
}

/** Commande licence payée en ligne (Djomy) */
export interface LicenseOrder {
  id: string;
  auth_token: string;
  device_id: string;
  profile_snapshot: {
    name: string;
    phone: string;
    email?: string;
    city?: string;
    occupation?: string;
  };
  amount_gnf: number;
  duration_months: number;
  payment_status: PaymentStatus;
  djomy_link_reference?: string;
  djomy_transaction_id?: string;
  license_card_id?: string;
  /** web | mobile — origine de la commande */
  source?: "web" | "mobile";
  created_at: string;
}

export interface AdminData {
  categories: AdminCategory[];
  courses: AdminCourse[];
  chapters: AdminChapter[];
  lessons: AdminLesson[];
  lesson_attachments: AdminLessonAttachment[];
  lesson_questions: AdminLessonQuestion[];
  lesson_reactions: AdminLessonReaction[];
  lesson_quiz_items: AdminLessonQuizItem[];
  quiz_questions: AdminQuizQuestion[];
  license_cards: AdminLicenseCard[];
  student_auth_sessions: StudentAuthSession[];
  mobile_auth_sessions: MobileAuthSession[];
  lesson_progress: StudentLessonProgress[];
  student_daily_activity: StudentDailyActivity[];
  content_watch_stats: ContentWatchStats[];
  quiz_attempts: StudentQuizAttempt[];
  lesson_quiz_attempts: StudentLessonQuizAttempt[];
  users: AdminUser[];
  certificates: AdminCertificate[];
  notifications: AdminNotification[];
  license_orders: LicenseOrder[];
  settings: AdminSettings;
}
