import 'package:flutter/material.dart';
import 'package:nkosebaly/services/app_update_service.dart';
import 'package:url_launcher/url_launcher.dart';

/// Bandeau « Nouvelle version disponible » avec bouton de téléchargement APK.
class AppUpdateBanner extends StatefulWidget {
  const AppUpdateBanner({super.key});

  @override
  State<AppUpdateBanner> createState() => _AppUpdateBannerState();
}

class _AppUpdateBannerState extends State<AppUpdateBanner> {
  AppUpdateInfo? _info;
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final info = await AppUpdateService.check();
    if (!mounted) return;
    if (info != null && info.updateAvailable) {
      setState(() => _info = info);
    }
  }

  Future<void> _handleUpdate() async {
    final url = _info?.downloadUrl.trim();
    if (url == null || url.isEmpty) return;

    final uri = Uri.parse(url);
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir le lien de téléchargement')),
      );
    }
  }

  void _handleDismiss() {
    setState(() => _dismissed = true);
  }

  @override
  Widget build(BuildContext context) {
    if (_dismissed || _info == null || !_info!.updateAvailable) {
      return const SizedBox.shrink();
    }

    final info = _info!;

    return Card(
      color: const Color(0xFFFFF8E1),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.system_update, color: Color(0xFF7D4E2D)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Nouvelle version disponible',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF7D4E2D),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Version ${info.latestVersion} (build ${info.latestBuild}) — '
                        'vous avez ${info.currentVersion} (build ${info.currentBuild})',
                        style: const TextStyle(fontSize: 12, color: Colors.black87),
                      ),
                      if (info.releaseNotes.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          info.releaseNotes,
                          style: const TextStyle(fontSize: 12, color: Colors.black54),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  tooltip: 'Plus tard',
                  onPressed: _handleDismiss,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: _handleUpdate,
                  icon: const Icon(Icons.download, size: 18),
                  label: const Text('Mettre à jour'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF7D4E2D),
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: _handleDismiss,
                  child: const Text('Plus tard'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
