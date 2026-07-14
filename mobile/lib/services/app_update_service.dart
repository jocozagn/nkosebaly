import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Infos de mise à jour renvoyées par le serveur.
class AppUpdateInfo {
  const AppUpdateInfo({
    required this.updateAvailable,
    required this.latestVersion,
    required this.latestBuild,
    required this.downloadUrl,
    required this.releaseNotes,
    required this.currentVersion,
    required this.currentBuild,
  });

  final bool updateAvailable;
  final String latestVersion;
  final int latestBuild;
  final String downloadUrl;
  final String releaseNotes;
  final String currentVersion;
  final int currentBuild;
}

/// Vérifie si une nouvelle version APK est disponible sur le serveur.
class AppUpdateService {
  AppUpdateService._();

  static AppUpdateInfo? _cache;
  static Future<AppUpdateInfo?>? _pending;

  /// Pré-charge la version au démarrage (GateScreen).
  static Future<AppUpdateInfo?> check({bool force = false}) {
    if (!force && _cache != null) return Future.value(_cache);
    if (!force && _pending != null) return _pending!;

    _pending = _fetch().whenComplete(() {
      _pending = null;
    });
    return _pending!;
  }

  static Future<AppUpdateInfo?> _fetch() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version.trim();
      final currentBuild = int.tryParse(packageInfo.buildNumber.trim()) ?? 0;

      final res = await BalandouApi.get(
        '/mobile/app-version',
        query: {
          'version': currentVersion,
          'build': currentBuild.toString(),
        },
      );

      if (res['error'] == true) return _cache;

      final data = res['data'] as Map<String, dynamic>? ?? {};
      final info = AppUpdateInfo(
        updateAvailable: data['update_available'] == true,
        latestVersion: data['version']?.toString() ?? currentVersion,
        latestBuild: (data['build'] as num?)?.toInt() ?? currentBuild,
        downloadUrl: data['download_url']?.toString() ?? '${AppSettings.apiUrl}/get-app',
        releaseNotes: data['release_notes']?.toString() ?? '',
        currentVersion: currentVersion,
        currentBuild: currentBuild,
      );

      _cache = info;
      return info;
    } catch (_) {
      return _cache;
    }
  }
}
