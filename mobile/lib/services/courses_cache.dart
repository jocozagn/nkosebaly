import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';

/// Cache local des cours / progression pour le mode hors-ligne.
class CoursesCache {
  CoursesCache._();

  static const String _homeBox = 'courses_home_cache';
  static const String _detailBox = 'course_detail_cache';

  static String _homeKey(String deviceId) => 'home_$deviceId';
  static String _detailKey(String courseId) => 'detail_$courseId';

  // ── Accueil (liste des cours + progression globale) ──

  static Future<void> saveHome({
    required String deviceId,
    required List<Map<String, dynamic>> courses,
    required Map<String, int> progressByCourse,
    required int globalPercent,
    required int issuedCerts,
  }) async {
    final box = await Hive.openBox<String>(_homeBox);
    await box.put(_homeKey(deviceId), jsonEncode({
      'courses': courses,
      'progress_by_course': progressByCourse,
      'global_percent': globalPercent,
      'issued_certs': issuedCerts,
      'saved_at': DateTime.now().toIso8601String(),
    }));
  }

  static Future<Map<String, dynamic>?> readHome({required String deviceId}) async {
    final box = await Hive.openBox<String>(_homeBox);
    final raw = box.get(_homeKey(deviceId));
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  // ── Détail d'un cours (chapitres, leçons, progression) ──

  static Future<void> saveCourseDetail({
    required String courseId,
    required Map<String, dynamic> course,
    required Map<String, Map<String, dynamic>> lessonProgress,
    required int coursePercent,
  }) async {
    final box = await Hive.openBox<String>(_detailBox);
    await box.put(_detailKey(courseId), jsonEncode({
      'course': course,
      'lesson_progress': lessonProgress,
      'course_percent': coursePercent,
      'saved_at': DateTime.now().toIso8601String(),
    }));
  }

  static Future<Map<String, dynamic>?> readCourseDetail({required String courseId}) async {
    final box = await Hive.openBox<String>(_detailBox);
    final raw = box.get(_detailKey(courseId));
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }
}
