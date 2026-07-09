import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:nkosebaly/screens/license_scan_screen.dart';
import 'package:nkosebaly/services/balandou_api.dart';

/// Écran profil — consultation et modification après activation.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _occupationCtrl = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  int _progressPercent = 0;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _cityCtrl.dispose();
    _occupationCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      final status = await BalandouApi.get('/mobile/license/status');
      if (status['data']?['active'] != true) {
        await Get.offAll(() => const LicenseScanScreen());
        return;
      }

      final res = await BalandouApi.get('/mobile/profile');
      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Erreur profil');
      }

      final data = res['data'] as Map<String, dynamic>? ?? {};
      _nameCtrl.text = data['name']?.toString() ?? '';
      _phoneCtrl.text = data['phone']?.toString() ?? '';
      _emailCtrl.text = data['email']?.toString() ?? '';
      _cityCtrl.text = data['city']?.toString() ?? '';
      _occupationCtrl.text = data['occupation']?.toString() ?? '';
      _progressPercent = (data['progress_percent'] as num?)?.round() ?? 0;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    if (name.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nom et téléphone sont obligatoires')),
      );
      return;
    }

    setState(() => _saving = true);

    try {
      final res = await BalandouApi.patch('/mobile/profile', {
        'name': name,
        'phone': phone,
        'email': _emailCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'occupation': _occupationCtrl.text.trim(),
      });

      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Enregistrement impossible');
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil mis à jour')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  InputDecoration _fieldDecoration(String label, {bool required = false}) {
    return InputDecoration(
      labelText: required ? '$label *' : label,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      focusedBorder: const OutlineInputBorder(
        borderSide: BorderSide(color: Color(0xFF7D4E2D), width: 2),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon profil'),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF7D4E2D)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  color: const Color(0xFFFAF7F4),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const Icon(Icons.trending_up, color: Color(0xFF7D4E2D)),
                        const SizedBox(width: 12),
                        Text(
                          'Progression globale : $_progressPercent%',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF7D4E2D),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _nameCtrl,
                  decoration: _fieldDecoration('Nom complet', required: true),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneCtrl,
                  decoration: _fieldDecoration('Téléphone', required: true),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _emailCtrl,
                  decoration: _fieldDecoration('E-mail'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _cityCtrl,
                  decoration: _fieldDecoration('Ville'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _occupationCtrl,
                  decoration: _fieldDecoration('Profession / activité'),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF7D4E2D),
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Enregistrer'),
                ),
              ],
            ),
    );
  }
}
