import 'dart:io';
import 'dart:typed_data';

import 'package:encrypt/encrypt.dart' as enc;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';

class OfflineLessonMeta {
  OfflineLessonMeta({
    required this.lessonId,
    required this.courseId,
    required this.title,
    required this.fileName,
    required this.sizeBytes,
    required this.downloadedAt,
  });

  final String lessonId;
  final String courseId;
  final String title;
  final String fileName;
  final int sizeBytes;
  final String downloadedAt;

  factory OfflineLessonMeta.fromMap(Map<dynamic, dynamic> map) => OfflineLessonMeta(
        lessonId: map['lesson_id'] as String,
        courseId: map['course_id'] as String,
        title: map['title'] as String,
        fileName: map['file_name'] as String,
        sizeBytes: map['size_bytes'] as int? ?? 0,
        downloadedAt: map['downloaded_at'] as String? ?? '',
      );
}

/// Coffre vidéo chiffré — invisible galerie, lecture app uniquement
class SecureVideoVault {
  SecureVideoVault._();

  static const _vaultKeyName = 'nkosebaly_vault_aes_key';
  static const _metaBox = 'nkosebaly_offline_meta';
  static const _storage = FlutterSecureStorage();

  static Future<enc.Key> _getAesKey() async {
    final existing = await _storage.read(key: _vaultKeyName);
    if (existing != null && existing.isNotEmpty) {
      return enc.Key.fromBase64(existing);
    }
    final key = enc.Key.fromSecureRandom(32);
    await _storage.write(key: _vaultKeyName, value: key.base64);
    return key;
  }

  static Future<Directory> _vaultDir() async {
    final base = await getApplicationSupportDirectory();
    final dir = Directory('${base.path}/nkosebaly_vault');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
      await File('${dir.path}/.nomedia').create();
    }
    return dir;
  }

  static Future<Box> _metaBoxInstance() async {
    if (!Hive.isBoxOpen(_metaBox)) {
      await Hive.openBox(_metaBox);
    }
    return Hive.box(_metaBox);
  }

  static Future<void> saveEncryptedLesson({
    required String lessonId,
    required String courseId,
    required String title,
    required Uint8List rawBytes,
  }) async {
    final dir = await _vaultDir();
    final fileName = '$lessonId.enc';
    final file = File('${dir.path}/$fileName');

    final key = await _getAesKey();
    final iv = enc.IV.fromSecureRandom(16);
    final encrypter = enc.Encrypter(enc.AES(key));
    final encrypted = encrypter.encryptBytes(rawBytes, iv: iv);

    final output = Uint8List.fromList([...iv.bytes, ...encrypted.bytes]);
    await file.writeAsBytes(output, flush: true);

    final box = await _metaBoxInstance();
    await box.put(lessonId, {
      'lesson_id': lessonId,
      'course_id': courseId,
      'title': title,
      'file_name': fileName,
      'size_bytes': rawBytes.length,
      'downloaded_at': DateTime.now().toIso8601String(),
    });
  }

  static Future<bool> hasLesson(String lessonId) async {
    final box = await _metaBoxInstance();
    return box.containsKey(lessonId);
  }

  static Future<OfflineLessonMeta?> getMeta(String lessonId) async {
    final box = await _metaBoxInstance();
    final raw = box.get(lessonId);
    if (raw == null) return null;
    return OfflineLessonMeta.fromMap(Map<dynamic, dynamic>.from(raw as Map));
  }

  /// Liste toutes les leçons téléchargées (métadonnées Hive).
  static Future<List<OfflineLessonMeta>> listAll() async {
    final box = await _metaBoxInstance();
    final items = <OfflineLessonMeta>[];
    for (final key in box.keys) {
      final raw = box.get(key);
      if (raw is Map) {
        items.add(OfflineLessonMeta.fromMap(Map<dynamic, dynamic>.from(raw)));
      }
    }
    items.sort((a, b) => b.downloadedAt.compareTo(a.downloadedAt));
    return items;
  }

  /// Leçons téléchargées pour un cours donné.
  static Future<List<OfflineLessonMeta>> listByCourseId(String courseId) async {
    final all = await listAll();
    return all.where((m) => m.courseId == courseId).toList();
  }

  /// IDs des cours ayant au moins une leçon téléchargée.
  static Future<Set<String>> downloadedCourseIds() async {
    final all = await listAll();
    return all.map((m) => m.courseId).toSet();
  }

  static Future<int> countByCourseId(String courseId) async {
    final list = await listByCourseId(courseId);
    return list.length;
  }

  static Future<File> decryptToTempFile(String lessonId) async {
    final tempDir = await getTemporaryDirectory();
    final tempFile = File('${tempDir.path}/nkosebaly_play_$lessonId.mp4');

    // Réutilise le fichier temporaire s'il existe déjà (évite un re-déchiffrement long)
    if (await tempFile.exists()) {
      final cachedSize = await tempFile.length();
      if (cachedSize > 1024) return tempFile;
    }

    final meta = await getMeta(lessonId);
    if (meta == null) throw Exception('Leçon non téléchargée');

    final dir = await _vaultDir();
    final encFile = File('${dir.path}/${meta.fileName}');
    if (!await encFile.exists()) throw Exception('Fichier chiffré introuvable');

    final bytes = await encFile.readAsBytes();
    if (bytes.length < 17) throw Exception('Fichier corrompu');

    final iv = enc.IV(bytes.sublist(0, 16));
    final cipherBytes = bytes.sublist(16);
    final key = await _getAesKey();
    final encrypter = enc.Encrypter(enc.AES(key));
    final decrypted = encrypter.decryptBytes(enc.Encrypted(cipherBytes), iv: iv);

    await tempFile.writeAsBytes(decrypted, flush: true);
    return tempFile;
  }
}
