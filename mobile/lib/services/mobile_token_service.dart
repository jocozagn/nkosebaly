import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Token d'auth mobile (remplace le device_id).
/// Stocké localement pour authentifier les appels API via header `X-Mobile-Token`.
class MobileTokenService {
  MobileTokenService._();

  static const _storage = FlutterSecureStorage();
  static const _key = 'nkosebaly_mobile_token';

  static Future<void> save(String token) async {
    final normalized = token.trim();
    if (normalized.isEmpty) return;
    await _storage.write(key: _key, value: normalized);
  }

  static Future<String?> read() async {
    final raw = await _storage.read(key: _key);
    final normalized = (raw ?? '').trim();
    if (normalized.isEmpty) return null;
    return normalized;
  }

  static Future<void> clear() async {
    await _storage.delete(key: _key);
  }
}

