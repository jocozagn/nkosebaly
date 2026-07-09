import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:nkosebaly/services/mobile_token_service.dart';

/// File d'attente hors-ligne pour la progression et le temps passé.
/// Les rapports sont envoyés dès que l'internet revient.
class ProgressSyncQueue {
  static const _boxName = 'progress_offline_queue';
  static bool _syncing = false;

  /// Timeout court pour ne pas bloquer l'UI si le réseau est absent
  static final Dio _quickDio = Dio(
    BaseOptions(
      baseUrl: AppSettings.apiUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 15),
      validateStatus: (_) => true,
    ),
  );

  static Future<Map<String, dynamic>> _quickPost(
    String path,
    Map<String, dynamic> body,
  ) async {
    final deviceId = await DeviceService.getOrCreateDeviceId();
    final mobileToken = await MobileTokenService.read();
    final res = await _quickDio.post<dynamic>(
      '/api$path',
      data: body,
      options: Options(
        headers: {
          if (mobileToken != null) 'X-Mobile-Token': mobileToken,
          'X-Device-Id': deviceId,
          'X-Api-Base': AppSettings.apiUrl,
          'Content-Type': 'application/json',
        },
      ),
    );
    final data = res.data;
    if (data is Map<String, dynamic>) return data;
    return {'error': true, 'message': 'Réponse invalide'};
  }

  static Future<Box<String>> _openBox() => Hive.openBox<String>(_boxName);

  static String _makeId() => DateTime.now().microsecondsSinceEpoch.toString();

  static Future<void> enqueue(Map<String, dynamic> event) async {
    final box = await _openBox();
    await box.put(_makeId(), jsonEncode(event));
  }

  /// Enregistre un heartbeat (progression + temps passé)
  static Future<void> reportProgress({
    required String courseId,
    required String lessonId,
    required int watchPercent,
    required int secondsWatched,
  }) async {
    final clientTimestamp = DateTime.now().toUtc().toIso8601String();
    final payload = {
      'course_id': courseId,
      'lesson_id': lessonId,
      'watch_percent': watchPercent,
      'seconds_watched': secondsWatched,
      'event_type': 'heartbeat',
      'source': 'mobile',
      'client_timestamp': clientTimestamp,
      'offline': true,
    };

    try {
      final res = await _quickPost('/mobile/lessons/$lessonId/progress', {
        'course_id': courseId,
        'watch_percent': watchPercent,
        'seconds_watched': secondsWatched,
        'client_timestamp': clientTimestamp,
        'event_type': 'heartbeat',
      });
      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Erreur progression');
      }
    } catch (_) {
      await enqueue(payload);
    }
  }

  /// Enregistre l'ouverture d'une leçon
  static Future<void> recordLessonOpen({
    required String courseId,
    required String lessonId,
  }) async {
    final clientTimestamp = DateTime.now().toUtc().toIso8601String();
    final payload = {
      'course_id': courseId,
      'lesson_id': lessonId,
      'event_type': 'lesson_open',
      'source': 'mobile',
      'client_timestamp': clientTimestamp,
      'offline': true,
    };

    try {
      final res = await _quickPost('/mobile/lessons/$lessonId/progress', {
        'course_id': courseId,
        'event_type': 'lesson_open',
        'client_timestamp': clientTimestamp,
      });
      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Erreur ouverture');
      }
    } catch (_) {
      await enqueue(payload);
    }
  }

  /// Envoie tous les rapports en attente (appelé au démarrage et retour réseau)
  static Future<void> syncQueue() async {
    if (_syncing) return;

    final box = await _openBox();
    if (box.isEmpty) return;

    _syncing = true;
    try {
      final events = <Map<String, dynamic>>[];
      for (final key in box.keys.toList()) {
        final raw = box.get(key);
        if (raw == null) continue;
        events.add(Map<String, dynamic>.from(jsonDecode(raw) as Map));
      }

      if (events.isEmpty) return;

      final res = await _quickPost('/mobile/progress/sync', {'events': events});
      if (res['error'] == true) return;

      await box.clear();
    } catch (_) {
      // On garde la file pour un prochain essai
    } finally {
      _syncing = false;
    }
  }

  static Future<int> pendingCount() async {
    final box = await _openBox();
    return box.length;
  }
}
