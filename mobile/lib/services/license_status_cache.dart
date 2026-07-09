import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';
import 'package:nkosebaly/services/device_service.dart';

class LicenseStatusCache {
  LicenseStatusCache._();

  static const String _boxName = 'license_status_cache';

  /// key = deviceId
  static String _makeKey(String deviceId) => deviceId;

  static Future<void> save(Map<String, dynamic> statusData, {required String deviceId}) async {
    final box = await Hive.openBox<String>(_boxName);
    await box.put(_makeKey(deviceId), jsonEncode(statusData));
  }

  static Future<Map<String, dynamic>?> read({required String deviceId}) async {
    final box = await Hive.openBox<String>(_boxName);
    final raw = box.get(_makeKey(deviceId));
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static bool isActive(Map<String, dynamic> statusData) {
    final active = statusData['active'] == true;
    if (!active) return false;

    final expiresAt = statusData['expires_at']?.toString();
    if (expiresAt == null || expiresAt.isEmpty) {
      // Si on n'a pas d'expiration, on considère que c'est actif.
      // La vérification "strict" sera possible quand internet revient.
      return true;
    }

    final expires = DateTime.tryParse(expiresAt);
    if (expires == null) return true;
    return expires.isAfter(DateTime.now());
  }

  /// Convenience : lit deviceId automatiquement
  static Future<Map<String, dynamic>?> readForCurrentDevice() async {
    final deviceId = await DeviceService.getOrCreateDeviceId();
    return read(deviceId: deviceId);
  }
}

