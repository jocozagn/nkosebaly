import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/screens/home_screen.dart';
import 'package:nkosebaly/screens/web_qr_scan_screen.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:nkosebaly/services/mobile_token_service.dart';
import 'package:nkosebaly/widgets/brand_logo.dart';
import 'package:url_launcher/url_launcher.dart';

class _LicensePlanOption {
  const _LicensePlanOption({
    required this.id,
    required this.durationMonths,
    required this.priceGnf,
    required this.label,
  });

  final String id;
  final int durationMonths;
  final int priceGnf;
  final String label;
}

/// Activation licence mobile — QR code, achat Djomy ou code carte
class LicenseScanScreen extends StatefulWidget {
  const LicenseScanScreen({super.key});

  @override
  State<LicenseScanScreen> createState() => _LicenseScanScreenState();
}

class _LicenseScanScreenState extends State<LicenseScanScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _occupationCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();

  String? _qrData;
  String? _pendingOrderId;
  bool _isLoading = false;
  bool _isPaying = false;
  bool _showScanner = true;
  List<_LicensePlanOption> _plans = [];
  int _selectedDurationMonths = 3;
  bool _djomyEnabled = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadPricing();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _cityCtrl.dispose();
    _emailCtrl.dispose();
    _occupationCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadPricing() async {
    try {
      final res = await BalandouApi.get('/license/pricing');
      if (res['error'] == true) return;
      final data = res['data'] as Map<String, dynamic>?;
      if (data == null) return;

      final rawPlans = data['plans'] as List<dynamic>?;
      final parsedPlans = <_LicensePlanOption>[];

      if (rawPlans != null) {
        for (final item in rawPlans) {
          if (item is! Map) continue;
          final duration = (item['duration_months'] as num?)?.toInt() ?? 0;
          final price = (item['price_gnf'] as num?)?.toInt() ?? 0;
          if (duration <= 0 || price <= 0) continue;
          parsedPlans.add(_LicensePlanOption(
            id: item['id']?.toString() ?? 'plan-$duration',
            durationMonths: duration,
            priceGnf: price,
            label: item['label']?.toString() ?? '$duration mois',
          ));
        }
      }

      // Rétrocompatibilité API ancienne (prix unique)
      if (parsedPlans.isEmpty) {
        final legacyPrice = (data['license_price'] as num?)?.toInt() ?? 0;
        final legacyDuration = (data['license_duration_months'] as num?)?.toInt() ?? 3;
        if (legacyPrice > 0) {
          parsedPlans.add(_LicensePlanOption(
            id: 'legacy',
            durationMonths: legacyDuration,
            priceGnf: legacyPrice,
            label: '$legacyDuration mois',
          ));
        }
      }

      setState(() {
        _plans = parsedPlans;
        _djomyEnabled = data['djomy_enabled'] == true;
        if (parsedPlans.isNotEmpty) {
          _selectedDurationMonths = parsedPlans.first.durationMonths;
        }
      });
    } catch (_) {
      // Tarif optionnel — l'onglet achat affichera un message
    }
  }

  String? _validateProfile() {
    if (_nameCtrl.text.trim().isEmpty) return 'Nom complet requis';
    if (_phoneCtrl.text.trim().isEmpty) return 'Téléphone requis';
    return null;
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

  Future<void> _finishActivation(Map<String, dynamic> res, String deviceId) async {
    final mobileToken = res['data']?['mobile_token']?.toString();
    if (mobileToken != null && mobileToken.trim().isNotEmpty) {
      await MobileTokenService.save(mobileToken);
    }

    if (!mounted) return;

    Map<String, dynamic> status = await BalandouApi.get(
      '/mobile/license/status',
      deviceIdOverride: deviceId,
    );
    if (status['error'] == true) {
      await Future.delayed(const Duration(milliseconds: 500));
      status = await BalandouApi.get('/mobile/license/status', deviceIdOverride: deviceId);
    }

    if (status['data']?['active'] != true) {
      _showSnack(
        status['message']?.toString() ??
            'Licence non détectée après activation. Réessayez.',
      );
      return;
    }

    await Get.offAll(() => const HomeScreen());
  }

  Future<void> _activate({String? qrData, String? licenseCode}) async {
    final profileError = _validateProfile();
    if (profileError != null) {
      _showSnack(profileError);
      return;
    }

    if (qrData == null && (licenseCode == null || licenseCode.trim().isEmpty)) {
      _showSnack('Code licence ou QR requis');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final deviceId = (await DeviceService.getOrCreateDeviceId()).trim();
      final body = <String, dynamic>{
        'device_id': deviceId,
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'occupation': _occupationCtrl.text.trim(),
      };
      if (qrData != null) body['qr_data'] = qrData;
      if (licenseCode != null) body['license_code'] = licenseCode.trim();

      final res = await BalandouApi.post('/license/activate', body, deviceIdOverride: deviceId);

      if (res['error'] == true) {
        _showSnack(res['message']?.toString() ?? 'Activation échouée');
        return;
      }

      await _finishActivation(res, deviceId);
    } catch (_) {
      _showSnack('Connexion impossible au serveur. (${AppSettings.apiUrl})');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _payLicense() async {
    final profileError = _validateProfile();
    if (profileError != null) {
      _showSnack(profileError);
      return;
    }
    if (!_djomyEnabled) {
      _showSnack('Paiement en ligne indisponible pour le moment');
      return;
    }

    if (_plans.isEmpty) {
      _showSnack('Aucune formule licence disponible');
      return;
    }

    setState(() => _isPaying = true);

    try {
      final deviceId = (await DeviceService.getOrCreateDeviceId()).trim();
      final res = await BalandouApi.post('/mobile/license/pay', {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'occupation': _occupationCtrl.text.trim(),
        'duration_months': _selectedDurationMonths,
      }, deviceIdOverride: deviceId);

      if (res['error'] == true) {
        _showSnack(res['message']?.toString() ?? 'Paiement impossible');
        return;
      }

      final paymentUrl = res['data']?['paymentUrl']?.toString();
      final orderId = res['data']?['orderId']?.toString();
      if (paymentUrl == null || paymentUrl.isEmpty) {
        _showSnack('Lien de paiement indisponible');
        return;
      }

      setState(() => _pendingOrderId = orderId);

      final launched = await launchUrl(Uri.parse(paymentUrl), mode: LaunchMode.externalApplication);
      if (!launched) {
        _showSnack('Impossible d\'ouvrir le navigateur de paiement');
        return;
      }

      if (!mounted) return;
      _showPaymentReturnDialog();
    } catch (e) {
      _showSnack(e.toString());
    } finally {
      if (mounted) setState(() => _isPaying = false);
    }
  }

  void _showPaymentReturnDialog() {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Paiement en cours'),
        content: const Text(
          'Terminez le paiement dans le navigateur, puis revenez ici et appuyez sur « Vérifier mon paiement ».',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Plus tard')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _verifyPayment();
            },
            child: const Text('Vérifier mon paiement'),
          ),
        ],
      ),
    );
  }

  Future<void> _verifyPayment() async {
    setState(() => _isLoading = true);

    try {
      final deviceId = (await DeviceService.getOrCreateDeviceId()).trim();

      if (_pendingOrderId != null) {
        final verify = await BalandouApi.get(
          '/mobile/license/payment/verify?order_id=$_pendingOrderId',
          deviceIdOverride: deviceId,
        );
        if (verify['data']?['status'] == 'paid') {
          final token = verify['data']?['mobile_token']?.toString();
          if (token != null && token.isNotEmpty) {
            await MobileTokenService.save(token);
          }
          await Get.offAll(() => const HomeScreen());
          return;
        }
      }

      final status = await BalandouApi.get('/mobile/license/status', deviceIdOverride: deviceId);
      if (status['data']?['active'] == true) {
        await Get.offAll(() => const HomeScreen());
        return;
      }

      _showSnack('Paiement non confirmé. Réessayez dans quelques instants.');
    } catch (_) {
      _showSnack('Vérification impossible. Vérifiez votre connexion.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activer ma licence'),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFD4AF37),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          // Ordre : QR (défaut) → Acheter → Code
          tabs: const [
            Tab(text: 'QR code', icon: Icon(Icons.qr_code_scanner)),
            Tab(text: 'Acheter', icon: Icon(Icons.shopping_cart)),
            Tab(text: 'Code', icon: Icon(Icons.tag)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.language),
            tooltip: 'Connexion web',
            onPressed: () => Get.to(() => const WebQrScanScreen()),
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildQrTab(),
          _buildBuyTab(),
          _buildCodeTab(),
        ],
      ),
    );
  }

  Widget _buildScrollTab({required List<Widget> children}) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Center(child: BrandLogo(size: 72)),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildProfileSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Vos informations', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF7D4E2D))),
        const SizedBox(height: 12),
        _field(_nameCtrl, 'Nom complet *', TextInputType.name),
        _field(_phoneCtrl, 'Téléphone *', TextInputType.phone),
        _field(_cityCtrl, 'Ville', TextInputType.text),
        _field(_emailCtrl, 'E-mail', TextInputType.emailAddress),
        _field(_occupationCtrl, 'Profession', TextInputType.text),
        const SizedBox(height: 20),
      ],
    );
  }

  /// Onglet 1 — scan QR (ouvert par défaut)
  Widget _buildQrTab() {
    return _buildScrollTab(
      children: [
        if (_showScanner) ...[
          const Text('Scannez le QR code au verso de votre carte', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(height: 220, child: MobileScanner(onDetect: _onQrDetected)),
          ),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
            child: const Row(children: [Icon(Icons.check_circle, color: Colors.green), SizedBox(width: 8), Text('QR code scanné ✓')]),
          ),
          TextButton(
            onPressed: () => setState(() { _showScanner = true; _qrData = null; }),
            child: const Text('Rescanner'),
          ),
        ],
        const SizedBox(height: 16),
        _buildProfileSection(),
        FilledButton(
          onPressed: _isLoading ? null : () => _activate(qrData: _qrData),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D), padding: const EdgeInsets.symmetric(vertical: 14)),
          child: _isLoading
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Activer avec le QR code'),
        ),
      ],
    );
  }

  /// Onglet 2 — achat en ligne Djomy (plusieurs formules)
  Widget _buildBuyTab() {
    return _buildScrollTab(
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Licence numérique — choisissez votre formule',
                style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF7D4E2D)),
              ),
              const SizedBox(height: 10),
              if (_plans.isEmpty)
                const Text('Chargement des tarifs...')
              else
                ..._plans.map((plan) {
                  final selected = _selectedDurationMonths == plan.durationMonths;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: InkWell(
                      onTap: () => setState(() => _selectedDurationMonths = plan.durationMonths),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: selected ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: selected ? const Color(0xFF7D4E2D) : Colors.grey.shade300,
                            width: selected ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(plan.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text(
                              '${_formatGnf(plan.priceGnf)} GNF',
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF7D4E2D)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              const SizedBox(height: 4),
              Text('Paiement sécurisé via Djomy', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
            ],
          ),
        ),
        if (!_djomyEnabled) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8)),
            child: const Text('Paiement en ligne indisponible. Utilisez un code licence ou contactez-nous.'),
          ),
        ],
        const SizedBox(height: 16),
        _buildProfileSection(),
        FilledButton.icon(
          onPressed: (_isPaying || !_djomyEnabled || _plans.isEmpty) ? null : _payLicense,
          icon: _isPaying
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.payment),
          label: Text(_isPaying ? 'Ouverture...' : 'Payer en ligne'),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D), padding: const EdgeInsets.symmetric(vertical: 14)),
        ),
        if (_pendingOrderId != null) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _isLoading ? null : _verifyPayment,
            icon: const Icon(Icons.refresh),
            label: const Text('J\'ai payé — vérifier'),
          ),
        ],
      ],
    );
  }

  /// Onglet 3 — code carte (champ code en haut, avant le profil)
  Widget _buildCodeTab() {
    return _buildScrollTab(
      children: [
        const Text('Code imprimé sur la carte', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        TextField(
          controller: _codeCtrl,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'Code licence *',
            hintText: 'NKO-AB12-XY34',
            helperText: 'Format NKO-XXXX-XXXX',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 20),
        _buildProfileSection(),
        FilledButton(
          onPressed: _isLoading ? null : () => _activate(licenseCode: _codeCtrl.text),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D), padding: const EdgeInsets.symmetric(vertical: 14)),
          child: _isLoading
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Activer avec mon code'),
        ),
      ],
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
