import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:nkosebaly/services/mobile_token_service.dart';

class WebQrScanScreen extends StatefulWidget {
  const WebQrScanScreen({super.key});

  @override
  State<WebQrScanScreen> createState() => _WebQrScanScreenState();
}

class _WebQrScanScreenState extends State<WebQrScanScreen> {
  bool _done = false;

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_done) return;
    final raw = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    if (raw == null) return;

    Map<String, dynamic>? data;
    try {
      data = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return;
    }

    if (data['action'] != 'web_login' || data['session_token'] == null) return;
    _done = true;

    // Connexion web : le serveur lie la licence via X-Mobile-Token (carte PVC déjà activée)
    final mobileToken = await MobileTokenService.read();
    if (mobileToken == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Activez d\'abord votre carte PVC dans l\'application, puis rescannez le QR web.',
          ),
        ),
      );
      _done = false;
      return;
    }

    final deviceId = await DeviceService.getOrCreateDeviceId();
    try {
      final res = await BalandouApi.post('/web-session/confirm', {
        'session_token': data['session_token'],
        'device_id': deviceId,
        'mobile_token': mobileToken,
      });

      if (!mounted) return;
      final ok = res['error'] != true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ok ? 'Connexion web confirmée ✓' : (res['message']?.toString() ?? 'Échec'))),
      );
      Get.back();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau')));
      _done = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Connexion web'),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Scannez le QR affiché sur le site web.', textAlign: TextAlign.center),
          ),
          Expanded(child: MobileScanner(onDetect: _onDetect)),
        ],
      ),
    );
  }
}
