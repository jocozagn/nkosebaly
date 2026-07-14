import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/mobile_token_service.dart';

/// Gère le token mobile (perdu après réinstallation de l'app).
class MobileSessionGuard {
  MobileSessionGuard._();

  /// Retourne true si un token utilisable est disponible (local ou restauré).
  static Future<bool> ensureMobileSession() async {
    final existing = await MobileTokenService.read();
    if (existing != null && existing.isNotEmpty) return true;

    final res = await BalandouApi.post('/mobile/license/restore-session', {});
    if (res['error'] == true) return false;

    final token = res['data']?['mobile_token']?.toString().trim();
    if (token == null || token.isEmpty) return false;

    await MobileTokenService.save(token);
    return true;
  }
}
