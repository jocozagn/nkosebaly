import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:nkosebaly/services/balandou_api.dart';

/// Quiz certifiant (mobile) — parité avec le web.
/// Le serveur applique les règles: leçons 100%, tentatives max, etc.
class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key, required this.courseId, required this.courseTitle});

  final String courseId;
  final String courseTitle;

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  Map<String, dynamic>? _state;
  List<Map<String, dynamic>> _questions = [];

  /// question_id -> option index sélectionné
  final Map<String, int> _selectedByQuestion = {};

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await BalandouApi.get('/mobile/courses/${widget.courseId}/quiz');
      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Erreur');
      }

      final data = res['data'] as Map<String, dynamic>? ?? {};
      final questions = (data['questions'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      setState(() {
        _state = data;
        _questions = questions;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  bool get _canAttempt => _state?['can_attempt'] == true;

  Future<void> _submit() async {
    if (_submitting) return;
    if (!_canAttempt) return;

    // Simple validation UI avant requête.
    if (_questions.any((q) => !_selectedByQuestion.containsKey(q['id']?.toString()))) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez répondre à toutes les questions.')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final answers = _questions
          .map((q) {
            final id = q['id']?.toString() ?? '';
            return {
              'question_id': id,
              'selected': _selectedByQuestion[id] ?? -1,
            };
          })
          .toList();

      final res = await BalandouApi.post(
        '/mobile/courses/${widget.courseId}/quiz/submit',
        {'answers': answers},
      );

      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Erreur');
      }

      final result = res['data'] as Map<String, dynamic>? ?? {};
      final score = (result['score'] as num?)?.toInt() ?? 0;
      final total = (result['total'] as num?)?.toInt() ?? 0;
      final passed = result['passed'] == true;
      final passRequired = (result['pass_required'] as num?)?.toInt() ?? 0;

      if (!mounted) return;

      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(passed ? 'Félicitations !' : 'Résultat du quiz'),
          content: Text(
            passed
                ? 'Vous avez réussi.\n\nScore : $score/$total (minimum $passRequired).'
                : 'Vous n\'avez pas réussi.\n\nScore : $score/$total (minimum $passRequired).',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );

      // On recharge l’état (tentatives utilisées, passed, etc.).
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _infoLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Colors.grey))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
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
    final state = _state ?? {};
    final questionCount = (state['question_count'] as num?)?.toInt() ?? 0;
    final progress = (state['course_progress_percent'] as num?)?.toInt() ?? 0;
    final attemptsUsed = (state['attempts_used'] as num?)?.toInt() ?? 0;
    final maxAttempts = (state['max_attempts'] as num?)?.toInt() ?? 0;
    final passRequired = (state['pass_required_score'] as num?)?.toInt() ?? 0;
    final passed = state['passed'] == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quiz certifiant'),
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
                    Text(
                      widget.courseTitle,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF7D4E2D)),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _infoLine('Progression cours', '$progress%'),
                            _infoLine('Questions', '$questionCount'),
                            _infoLine('Score minimum', '$passRequired/$questionCount'),
                            _infoLine('Tentatives', '$attemptsUsed/$maxAttempts'),
                            _infoLine('Statut', passed ? 'Réussi' : _canAttempt ? 'Disponible' : 'Non disponible'),
                            const SizedBox(height: 10),
                            if (!_canAttempt)
                              const Text(
                                'Le quiz est disponible après avoir complété 100% des leçons.\n'
                                'Il peut aussi être bloqué si vous avez déjà réussi ou épuisé les tentatives.',
                                style: TextStyle(color: Colors.grey),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (_canAttempt && _questions.isEmpty)
                      const Text('Aucune question disponible.', style: TextStyle(color: Colors.grey)),
                    if (_canAttempt)
                      ..._questions.map((q) {
                        final qId = q['id']?.toString() ?? '';
                        final text = q['question_text']?.toString() ?? '';
                        final options = (q['options'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
                        final selected = _selectedByQuestion[qId];

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(text, style: const TextStyle(fontWeight: FontWeight.w700)),
                                const SizedBox(height: 10),
                                ...List.generate(options.length, (i) {
                                  return RadioListTile<int>(
                                    value: i,
                                    groupValue: selected,
                                    onChanged: _submitting
                                        ? null
                                        : (v) {
                                            if (v == null) return;
                                            setState(() {
                                              _selectedByQuestion[qId] = v;
                                            });
                                          },
                                    title: Text(options[i]),
                                    dense: true,
                                    contentPadding: EdgeInsets.zero,
                                  );
                                }),
                              ],
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: 6),
                    if (_canAttempt)
                      FilledButton(
                        onPressed: _submitting ? null : _submit,
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
                        child: Text(_submitting ? 'Envoi...' : 'Soumettre le quiz'),
                      ),
                    const SizedBox(height: 6),
                    TextButton(
                      onPressed: () => Get.back(),
                      child: const Text('Retour'),
                    ),
                  ],
                ),
    );
  }
}

