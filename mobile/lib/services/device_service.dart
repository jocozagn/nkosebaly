import 'dart:io';

import 'package:android_id/android_id.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

/// Identifiant appareil persistant — lié à la licence PVC
class DeviceService {
  DeviceService._();

  static const _storage = FlutterSecureStorage();
  static const _deviceIdKey = 'nkosebaly_device_id';

  static Future<String> getOrCreateDeviceId() async {
    // Toujours retourner un id stable et IDENTIQUE entre tous les appels.
    // On lit d'abord le cache (secure storage), sinon on calcule puis on sauvegarde.
    final existing = await _storage.read(key: _deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;

    // Option A :
    // Sur Android, on utilise ANDROID_ID (stable sur le même téléphone même après réinstallation).
    // On le sauvegarde pour éviter tout mismatch si le plugin échoue ponctuellement.
    if (Platform.isAndroid) {
      try {
        const androidIdPlugin = AndroidId();
        final androidId = await androidIdPlugin.getId();
        final normalized = (androidId ?? '').trim();
        if (normalized.isNotEmpty) {
          final id = 'android-$normalized';
          await _storage.write(key: _deviceIdKey, value: id);
          return id;
        }
      } catch (_) {
        // Fallback plus bas
      }
    }

    final id = const Uuid().v4();
    await _storage.write(key: _deviceIdKey, value: id);
    return id;
  }
}
