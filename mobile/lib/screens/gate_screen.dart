import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:nkosebaly/screens/home_screen.dart';
import 'package:nkosebaly/screens/license_scan_screen.dart';
import 'package:nkosebaly/services/app_update_service.dart';
import 'package:nkosebaly/services/license_status_cache.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:nkosebaly/services/mobile_session_guard.dart';
import 'package:nkosebaly/widgets/brand_logo.dart';
import 'package:nkosebaly/widgets/brand_title.dart';

class GateScreen extends StatefulWidget {
  const GateScreen({super.key});

  @override
  State<GateScreen> createState() => _GateScreenState();
}

class _GateScreenState extends State<GateScreen> {
  @override
  void initState() {
    super.initState();
    // Pré-charge la version APK pendant la vérification licence.
    AppUpdateService.check();
    _checkLicense();
  }

  Future<void> _checkLicense() async {
    final deviceId = await DeviceService.getOrCreateDeviceId();
    try {
      final res = await BalandouApi.get('/mobile/license/status');
      final active = res['data']?['active'] == true;
      if (!mounted) return;
      if (active) {
        final hasSession = await MobileSessionGuard.ensureMobileSession();
        if (!hasSession) {
          await Get.offAll(() => const LicenseScanScreen());
          return;
        }
        await LicenseStatusCache.save(res['data'] as Map<String, dynamic>, deviceId: deviceId);
        await Get.offAll(() => const HomeScreen());
      } else {
        await Get.offAll(() => const LicenseScanScreen());
      }
    } catch (_) {
      // Offline : on utilise la dernière réponse connue.
      final cached = await LicenseStatusCache.read(deviceId: deviceId);
      if (!mounted) return;
      if (cached != null && LicenseStatusCache.isActive(cached)) {
        final hasSession = await MobileSessionGuard.ensureMobileSession();
        if (hasSession) {
          await Get.offAll(() => const HomeScreen());
        } else {
          await Get.offAll(() => const LicenseScanScreen());
        }
      } else {
        await Get.offAll(() => const LicenseScanScreen());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const BrandLogo(size: 120),
            const SizedBox(height: 20),
            const BrandTitle(showProfessor: true, showContact: true),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: Color(0xFF7D4E2D)),
          ],
        ),
      ),
    );
  }
}
