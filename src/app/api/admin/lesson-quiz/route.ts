import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import {
  deleteLessonQuizItem,
  getLessonQuizItemsAdmin,
  saveLessonQuizItem,
} from "@/lib/admin/store";
import type { AdminLessonQuizItem, LessonQuizMediaFile, LessonQuizType } from "@/lib/admin/types";

/** Liste / création / suppression des exercices quiz d'une leçon */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lesson_id");
  if (!lessonId) {
    return NextResponse.json({ error: true, message: "lesson_id requis" }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: await getLessonQuizItemsAdmin(lessonId) });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.lesson_id || !body?.course_id || !body?.type) {
    return NextResponse.json({ error: true, message: "lesson_id, course_id et type requis" }, { status: 400 });
  }

  const type = body.type as LessonQuizType;
  const existing = await getLessonQuizItemsAdmin(body.lesson_id as string);
  const order = existing.length + 1;

  const base = {
    id: crypto.randomUUID(),
    lesson_id: body.lesson_id as string,
    course_id: body.course_id as string,
    order,
    prompt_text: body.prompt_text?.toString() ?? "",
    active: body.active !== false,
    created_at: new Date().toISOString(),
  };

  let item: AdminLessonQuizItem | null = null;

  if (type === "single_choice") {
    const options = (body.options as string[] | undefined)?.filter(Boolean) ?? [];
    if (options.length < 2) {
      return NextResponse.json({ error: true, message: "Au moins 2 options requises" }, { status: 400 });
    }
    item = { ...base, type, options, correct_index: Number(body.correct_index ?? 0) };
  } else if (type === "multiple_choice") {
    const options = (body.options as string[] | undefined)?.filter(Boolean) ?? [];
    const correctIndices = (body.correct_indices as number[] | undefined) ?? [];
    if (options.length < 2 || correctIndices.length < 1) {
      return NextResponse.json({ error: true, message: "Options et bonnes réponses requises" }, { status: 400 });
    }
    item = { ...base, type, options, correct_indices: correctIndices };
  } else if (type === "audio_pick_image") {
    const imageOptions = (body.image_options as LessonQuizMediaFile[] | undefined) ?? [];
    if (!body.audio?.file_id || imageOptions.length !== 4) {
      return NextResponse.json(
        { error: true, message: "1 son + exactement 4 images requis" },
        { status: 400 }
      );
    }
    const correctIndex = Number(body.correct_image_index ?? 0);
    if (correctIndex < 0 || correctIndex > 3) {
      return NextResponse.json({ error: true, message: "Image correcte invalide" }, { status: 400 });
    }
    item = {
      ...base,
      type,
      audio: body.audio,
      image_options: imageOptions,
      correct_image_index: correctIndex,
    };
  } else if (type === "dictation") {
    if (!body.audio?.file_id || !body.expected_answer?.toString()?.trim()) {
      return NextResponse.json({ error: true, message: "Audio et mot attendu requis" }, { status: 400 });
    }
    item = {
      ...base,
      type,
      audio: body.audio,
      expected_answer: body.expected_answer.toString().trim(),
      accept_variants: (body.accept_variants as string[] | undefined)?.filter(Boolean),
    };
  } else if (type === "fill_blank_suggestions") {
    const suggestions = (body.suggestions as string[] | undefined)?.filter(Boolean) ?? [];
    const correctWord = body.correct_word?.toString()?.trim() ?? "";
    if (!body.sentence_template?.toString()?.trim() || suggestions.length < 2 || !correctWord) {
      return NextResponse.json(
        { error: true, message: "Phrase, suggestions et mot correct requis" },
        { status: 400 }
      );
    }
    if (!suggestions.includes(correctWord)) {
      return NextResponse.json(
        { error: true, message: "Le mot correct doit faire partie des suggestions" },
        { status: 400 }
      );
    }
    item = {
      ...base,
      type,
      sentence_template: body.sentence_template.toString(),
      suggestions,
      correct_word: correctWord,
    };
  } else {
    return NextResponse.json({ error: true, message: "Type de quiz inconnu" }, { status: 400 });
  }

  const saved = await saveLessonQuizItem(item);
  return NextResponse.json({ error: false, data: saved });
};

export const DELETE = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: true, message: "id requis" }, { status: 400 });
  }

  await deleteLessonQuizItem(id);
  return NextResponse.json({ error: false, message: "Exercice supprimé" });
};

export const dynamic = "force-dynamic";
