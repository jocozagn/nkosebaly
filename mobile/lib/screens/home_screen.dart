import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/screens/course_screen.dart';
import 'package:nkosebaly/screens/certificates_screen.dart';
import 'package:nkosebaly/screens/license_scan_screen.dart';
import 'package:nkosebaly/screens/profile_screen.dart';
import 'package:nkosebaly/screens/web_qr_scan_screen.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/courses_cache.dart';
import 'package:nkosebaly/services/license_status_cache.dart';
import 'package:nkosebaly/services/progress_sync_queue.dart';
import 'package:nkosebaly/services/secure_video_vault.dart';
import 'package:nkosebaly/services/device_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  List<Map<String, dynamic>> _courses = [];
  bool _loading = true;
  bool _isOfflineMode = false;
  String _userName = '';
  int _globalPercent = 0;
  int _issuedCerts = 0;
  String _licenseLabel = '—';
  Map<String, int> _progressByCourse = {};
  Map<String, int> _offlineCountByCourse = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ProgressSyncQueue.syncQueue();
    }
  }

  /// Charge licence + cours. En cas d'échec réseau, bascule sur le cache local.
  Future<void> _load() async {
    await ProgressSyncQueue.syncQueue();
    setState(() {
      _loading = true;
      _isOfflineMode = false;
    });

    final deviceId = await DeviceService.getOrCreateDeviceId();
    final offlineCounts = await _loadOfflineCounts();

    // 1) Licence (obligatoire)
    Map<String, dynamic>? licenseData;
    try {
      final status = await BalandouApi.get('/mobile/license/status');
      if (status['data']?['active'] != true) {
        await Get.offAll(() => const LicenseScanScreen());
        return;
      }
      licenseData = status['data'] as Map<String, dynamic>? ?? {};
      await LicenseStatusCache.save(licenseData, deviceId: deviceId);
    } catch (_) {
      final cached = await LicenseStatusCache.read(deviceId: deviceId);
      if (cached == null || !LicenseStatusCache.isActive(cached)) {
        await Get.offAll(() => const LicenseScanScreen());
        return;
      }
      licenseData = cached;
      _isOfflineMode = true;
    }

    _applyLicenseInfo(licenseData);

    // 2) Cours + progression (cache si réseau indisponible)
    try {
      final results = await Future.wait([
        BalandouApi.get('/mobile/courses'),
        BalandouApi.get('/mobile/progress'),
        BalandouApi.get('/mobile/certificates'),
      ]);

      final coursesRes = results[0];
      final progressRes = results[1];
      final certRes = results[2];

      final list = (coursesRes['data'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      var globalPercent = 0;
      final progressByCourse = <String, int>{};

      if (progressRes['error'] != true && progressRes['data'] != null) {
        final progressData = progressRes['data'] as Map<String, dynamic>;
        globalPercent = (progressData['global_percent'] as num?)?.round() ?? 0;
        final courseProgress = progressData['courses'] as List<dynamic>? ?? [];
        for (final entry in courseProgress) {
          final map = entry as Map;
          progressByCourse[map['course_id'] as String] =
              ((map['percent'] as num?)?.round() ?? 0);
        }
      }

      var issuedCerts = 0;
      if (certRes['error'] != true && certRes['data'] != null) {
        final certData = certRes['data'] as Map<String, dynamic>;
        issuedCerts = (certData['issued_count'] as num?)?.round() ?? 0;
      }

      // Sauvegarde pour consultation hors-ligne ultérieure.
      await CoursesCache.saveHome(
        deviceId: deviceId,
        courses: list,
        progressByCourse: progressByCourse,
        globalPercent: globalPercent,
        issuedCerts: issuedCerts,
      );

      setState(() {
        _courses = list;
        _globalPercent = globalPercent;
        _progressByCourse = progressByCourse;
        _issuedCerts = issuedCerts;
        _offlineCountByCourse = offlineCounts;
        _loading = false;
      });
    } catch (_) {
      await _loadFromCacheOrVault(deviceId: deviceId, offlineCounts: offlineCounts);
    }
  }

  void _applyLicenseInfo(Map<String, dynamic> data) {
    _userName = data['user_name']?.toString() ?? '';
    final expiresAt = data['expires_at']?.toString();
    final months = data['duration_months']?.toString() ?? '—';
    _licenseLabel = expiresAt != null && expiresAt.isNotEmpty ? '$months mois' : 'Active';
  }

  Future<Map<String, int>> _loadOfflineCounts() async {
    final all = await SecureVideoVault.listAll();
    final counts = <String, int>{};
    for (final meta in all) {
      counts[meta.courseId] = (counts[meta.courseId] ?? 0) + 1;
    }
    return counts;
  }

  /// Restaure la liste depuis Hive, puis complète avec les cours téléchargés.
  Future<void> _loadFromCacheOrVault({
    required String deviceId,
    required Map<String, int> offlineCounts,
  }) async {
    _isOfflineMode = true;

    final cached = await CoursesCache.readHome(deviceId: deviceId);
    var courses = <Map<String, dynamic>>[];
    var progressByCourse = <String, int>{};
    var globalPercent = 0;
    var issuedCerts = 0;

    if (cached != null) {
      courses = (cached['courses'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      final rawProgress = cached['progress_by_course'] as Map<dynamic, dynamic>? ?? {};
      progressByCourse = rawProgress.map(
        (key, value) => MapEntry(key as String, (value as num).round()),
      );
      globalPercent = (cached['global_percent'] as num?)?.round() ?? 0;
      issuedCerts = (cached['issued_certs'] as num?)?.round() ?? 0;
    }

    // Ajoute les cours qui ont des téléchargements mais ne sont pas dans le cache API.
    final knownIds = courses.map((c) => c['id'] as String).toSet();
    for (final courseId in offlineCounts.keys) {
      if (knownIds.contains(courseId)) continue;
      courses.add({
        'id': courseId,
        'title': 'Cours téléchargé',
        'level': 'Hors-ligne',
        'lessons_count': offlineCounts[courseId] ?? 0,
        '_offline_only': true,
      });
    }

    setState(() {
      _courses = courses;
      _progressByCourse = progressByCourse;
      _globalPercent = globalPercent;
      _issuedCerts = issuedCerts;
      _offlineCountByCourse = offlineCounts;
      _loading = false;
    });
  }

  Widget _statCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Expanded(
      child: Card(
        elevation: 0,
        color: color.withValues(alpha: 0.12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
              Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _offlineBanner() {
    if (!_isOfflineMode) return const SizedBox.shrink();
    return Card(
      color: const Color(0xFFFFF3E0),
      margin: const EdgeInsets.only(bottom: 16),
      child: const ListTile(
        leading: Icon(Icons.cloud_off, color: Color(0xFF7D4E2D)),
        title: Text('Mode hors-ligne', style: TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('Les cours téléchargés restent disponibles sans internet.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppSettings.appName),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            tooltip: 'Mon profil',
            onPressed: () => Get.to(() => const ProfileScreen()),
          ),
          IconButton(icon: const Icon(Icons.qr_code_scanner), onPressed: () => Get.to(() => const WebQrScanScreen())),
          IconButton(
            icon: const Icon(Icons.verified),
            tooltip: 'Certificats',
            onPressed: () => Get.to(() => const CertificatesScreen()),
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF7D4E2D)))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_userName.isNotEmpty)
                    Text(
                      'Bonjour, $_userName',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF7D4E2D)),
                    ),
                  const SizedBox(height: 16),
                  _offlineBanner(),
                  Row(
                    children: [
                      _statCard(
                        icon: Icons.menu_book,
                        label: 'Cours',
                        value: '${_courses.length}',
                        color: const Color(0xFF7D4E2D),
                      ),
                      const SizedBox(width: 8),
                      _statCard(
                        icon: Icons.trending_up,
                        label: 'Progression',
                        value: '$_globalPercent%',
                        color: const Color(0xFF4A90A4),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _statCard(
                        icon: Icons.workspace_premium,
                        label: 'Diplômes',
                        value: _issuedCerts > 0 ? '$_issuedCerts' : '—',
                        color: const Color(0xFFC9A227),
                      ),
                      const SizedBox(width: 8),
                      _statCard(
                        icon: Icons.verified_user,
                        label: 'Licence',
                        value: _licenseLabel,
                        color: const Color(0xFF7D4E2D),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text('Vos cours', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF7D4E2D))),
                  const SizedBox(height: 12),
                  if (_courses.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text(
                          'Aucun cours disponible.\nConnectez-vous une fois pour synchroniser.',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  else
                    ..._courses.map((c) {
                      final courseId = c['id'] as String;
                      final percent = _progressByCourse[courseId] ?? 0;
                      final offlineCount = _offlineCountByCourse[courseId] ?? 0;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFF7D4E2D),
                            child: Icon(Icons.play_circle, color: Colors.white),
                          ),
                          title: Text(c['title']?.toString() ?? 'Cours', style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${c['level'] ?? ''} · ${c['lessons_count'] ?? 0} leçon(s)'),
                              if (offlineCount > 0)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.download_done, size: 14, color: Color(0xFF4A90A4)),
                                      const SizedBox(width: 4),
                                      Text(
                                        '$offlineCount téléchargée(s)',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF4A90A4)),
                                      ),
                                    ],
                                  ),
                                ),
                              const SizedBox(height: 6),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: percent / 100,
                                  minHeight: 6,
                                  backgroundColor: const Color(0xFFE8DDD4),
                                  color: const Color(0xFF4A90A4),
                                ),
                              ),
                              Text('$percent% complété', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                          isThreeLine: true,
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => Get.to(() => CourseScreen(
                                courseId: courseId,
                                title: c['title']?.toString() ?? '',
                              )),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
