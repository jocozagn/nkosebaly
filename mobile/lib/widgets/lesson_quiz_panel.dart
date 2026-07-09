import 'package:flutter/material.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:video_player/video_player.dart';

/// Exercices quiz interactifs — score ≥ 70 % pour réussir.
class LessonQuizPanel extends StatefulWidget {
  const LessonQuizPanel({
    super.key,
    required this.courseId,
    required this.lessonId,
    this.isOpen = true,
    this.onHasQuiz,
    this.onSubmitted,
  });

  final String courseId;
  final String lessonId;
  final bool isOpen;
  final void Function(bool hasQuiz, Map<String, dynamic>? previous)? onHasQuiz;
  final void Function(Map<String, dynamic> result)? onSubmitted;

  @override
  State<LessonQuizPanel> createState() => _LessonQuizPanelState();
}

class _LessonQuizPanelState extends State<LessonQuizPanel> {
  bool _loading = true;
  List<Map<String, dynamic>> _items = [];
  final Map<String, dynamic> _answers = {};
  bool _submitting = false;
  Map<String, dynamic>? _result;
  Map<String, dynamic>? _lastScore;
  VideoPlayerController? _audioController;

  @override
  void initState() {
    super.initState();
    _loadMeta();
  }

  @override
  void didUpdateWidget(LessonQuizPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.isOpen && widget.isOpen && _items.isEmpty && !_loading) {
      _loadMeta();
    }
  }

  @override
  void dispose() {
    _audioController?.dispose();
    super.dispose();
  }

  Future<void> _loadMeta() async {
    final res = await BalandouApi.get(
      '/mobile/lessons/${widget.lessonId}/quiz',
      query: {'course_id': widget.courseId},
    );
    if (!mounted) return;
    final items = (res['data']?['items'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final previous = res['data']?['previous_attempt'] as Map<String, dynamic>?;
    widget.onHasQuiz?.call(items.isNotEmpty, previous);
    setState(() {
      _items = items;
      _lastScore = previous;
      _loading = false;
    });
  }

  Future<void> _playAudio(String url) async {
    await _audioController?.dispose();
    _audioController = VideoPlayerController.networkUrl(Uri.parse(url));
    await _audioController!.initialize();
    await _audioController!.play();
    setState(() {});
  }

  bool get _allAnswered {
    if (_items.isEmpty) return false;
    for (final item in _items) {
      final id = item['id'] as String;
      final answer = _answers[id];
      if (answer == null) return false;
      final type = item['type'] as String;
      if (type == 'dictation' && (answer['text'] as String? ?? '').trim().isEmpty) return false;
      if (type == 'multiple_choice' && (answer['selected'] as List?)?.isEmpty != false) return false;
      if (type == 'fill_blank_suggestions' && (answer['word'] as String? ?? '').trim().isEmpty) {
        return false;
      }
    }
    return true;
  }

  bool get _hasSubmittedDetails {
    final details = _result?['details'];
    return details is List && details.isNotEmpty;
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final answers = _items.map((item) {
      final id = item['id'] as String;
      final type = item['type'] as String;
      final raw = _answers[id] as Map<String, dynamic>;
      return {'item_id': id, 'type': type, ...raw};
    }).toList();

    final res = await BalandouApi.post(
      '/mobile/lessons/${widget.lessonId}/quiz',
      {'course_id': widget.courseId, 'answers': answers},
    );
    if (!mounted) return;
    setState(() {
      _submitting = false;
      if (res['error'] != true) {
        _result = res['data'] as Map<String, dynamic>?;
        if (_result != null) widget.onSubmitted?.call(_result!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isOpen) return const SizedBox.shrink();
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator(color: Color(0xFF7D4E2D))),
      );
    }
    if (_items.isEmpty) return const SizedBox.shrink();

    final score = (_result?['score'] as num?)?.toInt();
    final total = (_result?['total'] as num?)?.toInt();
    final passed = _result?['passed'] == true;
    final passRequired = (_result?['pass_required'] as num?)?.toInt();

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Exercice — Quiz de la leçon',
              style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF7D4E2D)),
            ),
            Text(
              '${_items.length} question(s) · Seuil : 70 %',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            if (_lastScore != null && !_hasSubmittedDetails) ...[
              const SizedBox(height: 8),
              Text(
                'Dernier score : ${_lastScore!['score']}/${_lastScore!['total']}'
                '${_lastScore!['passed'] == true ? ' — Réussi ✓' : ''}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF7D4E2D)),
              ),
            ],
            if (_hasSubmittedDetails && score != null && total != null) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: passed ? Colors.green.shade50 : Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: passed ? Colors.green.shade200 : Colors.orange.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Score : $score/$total (${((score / total) * 100).round()} %)',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: passed ? Colors.green.shade900 : Colors.orange.shade900,
                      ),
                    ),
                    Text(
                      passed
                          ? 'Bravo ! Vous avez réussi l\'exercice.'
                          : 'Il faut au moins $passRequired/$total bonnes réponses. Réessayez !',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
            ..._items.asMap().entries.map((entry) {
              final idx = entry.key;
              final item = entry.value;
              return _buildItem(idx + 1, item);
            }),
            const SizedBox(height: 8),
            if (!_hasSubmittedDetails)
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: !_allAnswered || _submitting ? null : _submit,
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
                  child: Text(_submitting ? 'Envoi...' : 'Valider mes réponses'),
                ),
              )
            else
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => setState(() {
                    _result = null;
                    _answers.clear();
                  }),
                  child: const Text('Refaire l\'exercice'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildItem(int number, Map<String, dynamic> item) {
    final id = item['id'] as String;
    final type = item['type'] as String;
    final prompt = item['prompt_text']?.toString() ?? 'Question';
    final details = _result?['details'] as List<dynamic>?;
    Map<String, dynamic>? detail;
    if (details != null) {
      for (final d in details) {
        if (d is Map && d['item_id'] == id) {
          detail = Map<String, dynamic>.from(d);
          break;
        }
      }
    }
    final isCorrect = detail?['correct'] == true;

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          border: Border.all(
            color: _hasSubmittedDetails
                ? (isCorrect ? Colors.green.shade300 : Colors.red.shade200)
                : Colors.grey.shade200,
          ),
          borderRadius: BorderRadius.circular(8),
          color: _hasSubmittedDetails
              ? (isCorrect ? Colors.green.shade50.withValues(alpha: 0.5) : Colors.red.shade50.withValues(alpha: 0.3))
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text('$number. $prompt', style: const TextStyle(fontWeight: FontWeight.w600))),
                if (_hasSubmittedDetails)
                  Icon(isCorrect ? Icons.check_circle : Icons.cancel, color: isCorrect ? Colors.green : Colors.red, size: 18),
              ],
            ),
            const SizedBox(height: 8),
            if (type == 'single_choice')
              ...((item['options'] as List<dynamic>? ?? []).asMap().entries.map((e) {
                final selected = (_answers[id] as Map?)?['selected'] == e.key;
                return ListTile(
                  dense: true,
                  enabled: !_hasSubmittedDetails,
                  title: Text(e.value.toString()),
                  leading: Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: const Color(0xFF7D4E2D)),
                  onTap: _hasSubmittedDetails ? null : () => setState(() => _answers[id] = {'selected': e.key}),
                );
              })),
            if (type == 'multiple_choice')
              ...((item['options'] as List<dynamic>? ?? []).asMap().entries.map((e) {
                final selected = ((_answers[id] as Map?)?['selected'] as List?)?.contains(e.key) ?? false;
                return CheckboxListTile(
                  dense: true,
                  value: selected,
                  title: Text(e.value.toString()),
                  onChanged: _hasSubmittedDetails
                      ? null
                      : (_) {
                          final list = List<int>.from(((_answers[id] as Map?)?['selected'] as List?) ?? []);
                          if (list.contains(e.key)) {
                            list.remove(e.key);
                          } else {
                            list.add(e.key);
                          }
                          list.sort();
                          setState(() => _answers[id] = {'selected': list});
                        },
                );
              })),
            if (type == 'audio_pick_image' || type == 'dictation') ...[
              ElevatedButton.icon(
                onPressed: () => _playAudio(item['audio_url'] as String),
                icon: const Icon(Icons.volume_up),
                label: const Text('Écouter'),
              ),
              if (type == 'dictation')
                TextField(
                  enabled: !_hasSubmittedDetails,
                  decoration: const InputDecoration(labelText: 'Écrivez le mot entendu'),
                  onChanged: (v) => setState(() => _answers[id] = {'text': v}),
                ),
              if (type == 'audio_pick_image')
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Écoutez le son, puis choisissez la bonne image (A, B, C ou D).',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                      childAspectRatio: 1,
                      children: ((item['image_options'] as List<dynamic>? ?? []).map((img) {
                        final map = Map<String, dynamic>.from(img as Map);
                        final index = map['index'] as int;
                        final selected = (_answers[id] as Map?)?['selected'] == index;
                        final label = String.fromCharCode(65 + index);
                        return GestureDetector(
                          onTap: _hasSubmittedDetails ? null : () => setState(() => _answers[id] = {'selected': index}),
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: selected ? const Color(0xFF7D4E2D) : Colors.grey.shade300,
                                width: selected ? 2 : 1,
                              ),
                              borderRadius: BorderRadius.circular(8),
                              color: selected ? const Color(0xFFF3F4F6) : Colors.white,
                            ),
                            padding: const EdgeInsets.all(6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF7D4E2D))),
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: Image.network(map['url'] as String, width: double.infinity, fit: BoxFit.cover),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      })).toList(),
                    ),
                  ],
                ),
            ],
            if (type == 'fill_blank_suggestions') ...[
              Text((item['sentence_template'] as String? ?? '').replaceAll('___', '______')),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ((item['suggestions'] as List<dynamic>? ?? []).map((word) {
                  final w = word.toString();
                  final selected = (_answers[id] as Map?)?['word'] == w;
                  return ChoiceChip(
                    label: Text(w),
                    selected: selected,
                    onSelected: _hasSubmittedDetails ? null : (_) => setState(() => _answers[id] = {'word': w}),
                  );
                })).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Charge les métadonnées quiz sans afficher le panneau (pour le bouton Exercice).
class LessonQuizMetaLoader extends StatefulWidget {
  const LessonQuizMetaLoader({
    super.key,
    required this.courseId,
    required this.lessonId,
    required this.onHasQuiz,
  });

  final String courseId;
  final String lessonId;
  final void Function(bool hasQuiz, Map<String, dynamic>? previous) onHasQuiz;

  @override
  State<LessonQuizMetaLoader> createState() => _LessonQuizMetaLoaderState();
}

class _LessonQuizMetaLoaderState extends State<LessonQuizMetaLoader> {
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await BalandouApi.get(
      '/mobile/lessons/${widget.lessonId}/quiz',
      query: {'course_id': widget.courseId},
    );
    if (!mounted) return;
    final count = (res['data']?['count'] as num?)?.toInt() ?? 0;
    final previous = res['data']?['previous_attempt'] as Map<String, dynamic>?;
    widget.onHasQuiz(count > 0, previous);
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
