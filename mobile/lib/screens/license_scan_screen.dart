import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/screens/home_screen.dart';
import 'package:nkosebaly/screens/web_qr_scan_screen.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:nkosebaly/services/mobile_token_service.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:nkosebaly/widgets/brand_logo.dart';
import 'dart:async';

class LicenseScanScreen extends StatefulWidget {
  const LicenseScanScreen({super.key});

  @override
  State<LicenseScanScreen> createState() => _LicenseScanScreenState();
}

class _LicenseScanScreenState extends State<LicenseScanScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _occupationCtrl = TextEditingController();
  String? _qrData;
  bool _isLoading = false;
  bool _showScanner = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _cityCtrl.dispose();
    _emailCtrl.dispose();
    _occupationCtrl.dispose();
    super.dispose();
  }

  Future<void> _onQrDetected(BarcodeCapture capture) async {
    if (_qrData != null) return;
    final raw = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    if (raw == null) return;
    final parsed = BalandouApi.parseQrJson(raw);
    if (parsed?['action'] != 'activate') return;

    setState(() {
      _qrData = raw;
      _showScanner = false;
    });
  }

  Future<void> _activate() async {
    if (_qrData == null) {
      _showSnack('Scannez d\'abord votre carte PVC');
      return;
    }

    // Validation locale: on évite les erreurs serveur "champ requis"
    // et surtout on affiche une cause claire à l'élève.
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    if (name.isEmpty) {
      _showSnack('Nom complet requis');
      return;
    }
    if (phone.isEmpty) {
      _showSnack('Téléphone requis');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final deviceId = await DeviceService.getOrCreateDeviceId();
      final normalizedDeviceId = deviceId.trim();
      final res = await BalandouApi.post('/license/activate', {
        'qr_data': _qrData,
        'device_id': normalizedDeviceId,
        'name': name,
        'phone': phone,
        'email': _emailCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'occupation': _occupationCtrl.text.trim(),
      }, deviceIdOverride: normalizedDeviceId);

      if (res['error'] == true) {
        _showSnack(res['message']?.toString() ?? 'Activation échouée');
        return;
      }

      final mobileToken = res['data']?['mobile_token']?.toString();
      if (mobileToken != null && mobileToken.trim().isNotEmpty) {
        await MobileTokenService.save(mobileToken);
      }

      if (!mounted) return;
      // Vérifie immédiatement que le serveur reconnaît bien la licence.
      // Ça évite le cas "ça charge puis ça redemande de scanner" sans explication.
      Map<String, dynamic> status = await BalandouApi.get(
        '/mobile/license/status',
        deviceIdOverride: normalizedDeviceId,
      );
      if (status['error'] == true) {
        // Petit retry: parfois le serveur met quelques ms à écrire le store.
        await Future.delayed(const Duration(milliseconds: 500));
        status = await BalandouApi.get(
          '/mobile/license/status',
          deviceIdOverride: normalizedDeviceId,
        );
      }

      final active = status['data']?['active'] == true;
      if (!active) {
        _showSnack(
          status['message']?.toString() ??
              'Licence non détectée après activation. Réessayez (ou vérifiez votre connexion). '
                  '[device_id: $normalizedDeviceId]',
        );
        setState(() {
          _showScanner = true;
          _qrData = null;
        });
        return;
      }

      await Get.offAll(() => const HomeScreen());
    } catch (e) {
      // Ici: vraie erreur réseau (pas un 400/403).
      // On affiche un message plus utile que juste l'IP.
      final hint = AppSettings.apiUrl;
      _showSnack('Connexion impossible au serveur. Vérifiez votre internet puis réessayez. ($hint)');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activer ma carte'),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Connexion web',
            onPressed: () => Get.to(() => const WebQrScanScreen()),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(child: BrandLogo(size: 88)),
            const SizedBox(height: 16),
            if (_showScanner) ...[
              const Text('Scannez le QR au verso de votre carte PVC', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(height: 260, child: MobileScanner(onDetect: _onQrDetected)),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                child: const Row(children: [Icon(Icons.check_circle, color: Colors.green), SizedBox(width: 8), Text('Carte scannée ✓')]),
              ),
              TextButton(onPressed: () => setState(() { _showScanner = true; _qrData = null; }), child: const Text('Rescanner')),
            ],
            const SizedBox(height: 20),
            const Text('Vos informations', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF7D4E2D))),
            const SizedBox(height: 12),
            _field(_nameCtrl, 'Nom complet *', TextInputType.name),
            _field(_phoneCtrl, 'Téléphone *', TextInputType.phone),
            _field(_cityCtrl, 'Ville', TextInputType.text),
            _field(_emailCtrl, 'E-mail', TextInputType.emailAddress),
            _field(_occupationCtrl, 'Profession', TextInputType.text),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _isLoading ? null : _activate,
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D), padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _isLoading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Activer et commencer'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, TextInputType type) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: ctrl,
        keyboardType: type,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      ),
    );
  }
}
