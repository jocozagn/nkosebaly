import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:nkosebaly/screens/license_scan_screen.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:url_launcher/url_launcher.dart';

class CertificatesScreen extends StatefulWidget {
  const CertificatesScreen({super.key});

  @override
  State<CertificatesScreen> createState() => _CertificatesScreenState();
}

class _CertificatesScreenState extends State<CertificatesScreen> {
  bool _loading = true;
  bool _paying = false;
  String? _error;

  List<Map<String, dynamic>> _certificates = [];
  List<Map<String, dynamic>> _eligibility = [];
  int _issuedCount = 0;
  int _certificatePrice = 0;

  String get _boxName => 'certificates_cache';

  Future<String> _cacheKey() async {
    final deviceId = await DeviceService.getOrCreateDeviceId();
    return 'certificates_$deviceId';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final box = await Hive.openBox<String>(_boxName);
    final cacheKey = await _cacheKey();

    try {
      final status = await BalandouApi.get('/mobile/license/status');
      if (status['data']?['active'] != true) {
        await Get.offAll(() => const LicenseScanScreen());
        return;
      }

      final res = await BalandouApi.get('/mobile/certificates');
      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Erreur API');
      }

      final data = res['data'] as Map<String, dynamic>;
      final certificates = (data['certificates'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      final eligibility = (data['eligibility'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      setState(() {
        _certificates = certificates;
        _eligibility = eligibility;
        _issuedCount = (data['issued_count'] as num?)?.toInt() ?? 0;
        _certificatePrice = (data['certificate_price'] as num?)?.toInt() ?? 0;
      });

      // Cache local : utile si l'utilisateur consulte sans internet.
      await box.put(cacheKey, jsonEncode(data));
    } catch (e) {
      final raw = box.get(cacheKey);
      if (raw != null) {
        final decoded = jsonDecode(raw) as Map<String, dynamic>;
        setState(() {
          _certificates = (decoded['certificates'] as List<dynamic>? ?? [])
              .map((el) => Map<String, dynamic>.from(el as Map))
              .toList();
          _eligibility = (decoded['eligibility'] as List<dynamic>? ?? [])
              .map((el) => Map<String, dynamic>.from(el as Map))
              .toList();
          _issuedCount = (decoded['issued_count'] as num?)?.toInt() ?? 0;
          _certificatePrice = (decoded['certificate_price'] as num?)?.toInt() ?? 0;
        });
        setState(() => _error = null);
      } else {
        setState(() {
          _error = e.toString();
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _copy(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copié')),
    );
  }

  String _formatGnf(int amount) {
    final s = amount.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final pos = s.length - i;
      buf.write(s[i]);
      if (pos > 1 && pos % 3 == 1) buf.write(' ');
    }
    return buf.toString();
  }

  Future<void> _payCertificate(String courseId) async {
    setState(() => _paying = true);

    try {
      final res = await BalandouApi.post('/mobile/certificates/pay', {
        'course_id': courseId,
      });

      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Paiement impossible');
      }

      final paymentUrl = res['data']?['paymentUrl']?.toString();
      if (paymentUrl == null || paymentUrl.isEmpty) {
        throw Exception('Lien de paiement indisponible');
      }

      final uri = Uri.parse(paymentUrl);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        throw Exception('Impossible d\'ouvrir le navigateur de paiement');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  void _showCertificateDetails(Map<String, dynamic> cert) {
    final title = cert['course_title']?.toString() ?? 'Cours';
    final uniqueCode = cert['unique_code']?.toString() ?? '';
    final status = cert['payment_status']?.toString() ?? '';
    final issuedAt = cert['issued_at']?.toString() ?? '';
    final requestedAt = cert['requested_at']?.toString() ?? '';
    final verificationHash = cert['verification_hash']?.toString() ?? '';

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Statut : $status', style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              if (uniqueCode.isNotEmpty) ...[
                const Text('Code unique', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 4),
                SelectableText(uniqueCode),
                const SizedBox(height: 10),
                FilledButton(
                  onPressed: () => _copy(uniqueCode),
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
                  child: const Text('Copier le code'),
                ),
              ],
              const SizedBox(height: 14),
              if (verificationHash.isNotEmpty) ...[
                const Text('Vérification', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 4),
                SelectableText(verificationHash),
                const SizedBox(height: 10),
              ],
              if (issuedAt.isNotEmpty) ...[
                const Text('Délivré le', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 4),
                Text(issuedAt),
              ] else if (requestedAt.isNotEmpty) ...[
                const Text('Demande', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 4),
                Text(requestedAt),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  Widget _certCard(Map<String, dynamic> cert) {
    final courseTitle = cert['course_title']?.toString() ?? 'Cours';
    final status = cert['payment_status']?.toString() ?? '';
    final uniqueCode = cert['unique_code']?.toString() ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: const Icon(Icons.verified, color: Color(0xFFC9A227)),
        title: Text(courseTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(
          status.isNotEmpty ? 'Statut : $status' : uniqueCode.isNotEmpty ? 'Code : $uniqueCode' : '',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _showCertificateDetails(cert),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Certificats'),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Rafraîchir',
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF7D4E2D)))
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(16), child: Text(_error!)))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_issuedCount > 0)
                      Text('Certificats délivrés : $_issuedCount',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF7D4E2D))),
                    if (_issuedCount == 0)
                      const Text('Aucun certificat délivré pour le moment.',
                          style: TextStyle(color: Colors.grey)),
                    if (_certificatePrice > 0)
                      const SizedBox(height: 6),
                    if (_certificatePrice > 0)
                      Text('Prix du certificat : ${_formatGnf(_certificatePrice)} GNF',
                          style: const TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    ..._certificates.map(_certCard),
                    const SizedBox(height: 8),
                    const Divider(),
                    const SizedBox(height: 12),
                    const Text('Éligibilité',
                        style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF7D4E2D))),
                    const SizedBox(height: 8),
                    if (_eligibility.isEmpty)
                      const Text('Aucune information d’éligibilité.', style: TextStyle(color: Colors.grey))
                    else
                      ..._eligibility.map((e) {
                        final courseId = e['course_id']?.toString() ?? '';
                        final courseTitle = e['course_title']?.toString() ?? 'Cours';
                        final reason = e['reason']?.toString() ?? '';
                        final status = e['status']?.toString() ?? 'none';
                        final eligible = e['eligible'] as bool? ?? false;
                        final awaitingPayment = e['awaiting_payment'] as bool? ?? false;
                        final certificateId = e['certificate_id']?.toString();

                        if (status == 'issued' && certificateId != null) {
                          return const SizedBox.shrink();
                        }

                        if (status == 'pending') {
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            color: const Color(0xFFFFF8E1),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(courseTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  const SizedBox(height: 4),
                                  Text(
                                    awaitingPayment
                                        ? 'Paiement en attente — finalisez pour recevoir votre certificat.'
                                        : 'Demande en cours de validation.',
                                    style: const TextStyle(fontSize: 12, color: Colors.black87),
                                  ),
                                  if (awaitingPayment) ...[
                                    const SizedBox(height: 10),
                                    FilledButton.icon(
                                      onPressed: _paying ? null : () => _payCertificate(courseId),
                                      icon: _paying
                                          ? const SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                            )
                                          : const Icon(Icons.payment),
                                      label: Text(_paying ? 'Ouverture...' : 'Reprendre le paiement'),
                                      style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        }

                        if (!eligible) {
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: const Icon(Icons.info_outline, color: Colors.grey),
                              title: Text(courseTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(reason.isNotEmpty ? reason : 'Non éligible pour le moment'),
                            ),
                          );
                        }

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          color: const Color(0xFFFFFDF5),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.workspace_premium, color: Color(0xFFC9A227)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        courseTitle,
                                        style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF7D4E2D)),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _certificatePrice > 0
                                      ? 'Cours et quiz validés. Paiement sécurisé Djomy — ${_formatGnf(_certificatePrice)} GNF'
                                      : 'Cours et quiz validés. Paiement sécurisé via Djomy.',
                                  style: const TextStyle(fontSize: 12, color: Colors.black87),
                                ),
                                const SizedBox(height: 10),
                                FilledButton.icon(
                                  onPressed: _paying ? null : () => _payCertificate(courseId),
                                  icon: _paying
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                        )
                                      : const Icon(Icons.payment),
                                  label: Text(
                                    _paying
                                        ? 'Ouverture...'
                                        : _certificatePrice > 0
                                            ? 'Payer ${_formatGnf(_certificatePrice)} GNF'
                                            : 'Payer le certificat',
                                  ),
                                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: 24),
                    Text(
                      'Astuce : utilisez votre code unique pour vérifier le certificat sur la plateforme web.',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
    );
  }
}

