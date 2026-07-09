import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

/// Pièces jointes, questions et réactions — comme sur le web
class LessonEngagementPanel extends StatefulWidget {
  const LessonEngagementPanel({
    super.key,
    required this.courseId,
    required this.lessonId,
    required this.attachments,
    required this.questions,
    required this.reactions,
    this.userName = '',
  });

  final String courseId;
  final String lessonId;
  final List<Map<String, dynamic>> attachments;
  final List<Map<String, dynamic>> questions;
  final Map<String, dynamic> reactions;
  final String userName;

  @override
  State<LessonEngagementPanel> createState() => _LessonEngagementPanelState();
}

class _LessonEngagementPanelState extends State<LessonEngagementPanel> {
  late List<Map<String, dynamic>> _questions;
  late Map<String, dynamic> _reactions;
  final _questionController = TextEditingController();
  final _authorController = TextEditingController();
  bool _submittingQuestion = false;
  bool _voting = false;
  String? _downloadingId;

  // Actions à synchroniser quand l'internet revient (mode hors-ligne).
  Box<String>? _queueBox;
  bool _queueSyncing = false;
  Timer? _syncTimer;
  int _pendingQueueCount = 0;

  @override
  void initState() {
    super.initState();
    _questions = List<Map<String, dynamic>>.from(widget.questions);
    _reactions = Map<String, dynamic>.from(widget.reactions);
    _authorController.text = widget.userName;
    _initOfflineQueue();
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    _questionController.dispose();
    _authorController.dispose();
    super.dispose();
  }

  String _makeActionId() => DateTime.now().microsecondsSinceEpoch.toString();

  Future<void> _initOfflineQueue() async {
    _queueBox = await Hive.openBox<String>('engagement_offline_queue');
    _refreshPendingQueueCount();
    await _syncQueue(); // tentative immédiate

    // On réessaie en arrière-plan si l'élève reste sur l'écran.
    _syncTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      if (_pendingQueueCount > 0) {
        await _syncQueue();
      }
    });
  }

  void _refreshPendingQueueCount() {
    final box = _queueBox;
    if (box == null) return;
    setState(() => _pendingQueueCount = box.length);
  }

  Future<void> _enqueueAction(Map<String, dynamic> action) async {
    if (_queueBox == null) return;
    final actionId = _makeActionId();
    await _queueBox!.put(actionId, jsonEncode(action));
    if (mounted) _refreshPendingQueueCount();
  }

  Future<void> _syncQueue() async {
    final box = _queueBox;
    if (box == null || _queueSyncing) return;

    if (box.isEmpty) return;
    _queueSyncing = true;

    try {
      final keys = box.keys.toList().cast<String>();
      for (final key in keys) {
        final raw = box.get(key);
        if (raw == null) continue;

        final action = jsonDecode(raw) as Map<String, dynamic>;
        final type = action['type'] as String?;
        try {
          final queuedLessonId = (action['lesson_id'] as String?)?.trim() ?? widget.lessonId;
          final queuedCourseId = (action['course_id'] as String?)?.trim() ?? widget.courseId;

          if (type == 'reaction') {
            final vote = action['vote'] as String?;
            if (vote != 'like' && vote != 'dislike') throw Exception('vote invalide');
            final res = await BalandouApi.post('/mobile/lessons/$queuedLessonId/reactions', {
              'vote': vote,
              'course_id': queuedCourseId,
            });
            if (res['error'] == true) throw Exception(res['message']?.toString() ?? 'Erreur reaction');
          } else if (type == 'question') {
            final text = action['text'] as String?;
            final authorName = action['author_name'] as String?;
            if (text == null || text.trim().isEmpty) throw Exception('text invalide');

            final res = await BalandouApi.post('/mobile/lessons/$queuedLessonId/questions', {
              'text': text,
              'author_name': (authorName ?? '').trim(),
              'course_id': queuedCourseId,
            });
            if (res['error'] == true) throw Exception(res['message']?.toString() ?? 'Erreur question');
          } else {
            // Action inconnue : on supprime pour éviter une boucle infinie
            await box.delete(key);
            continue;
          }

          // Succès : on supprime du cache hors-ligne
          await box.delete(key);
        } catch (_) {
          // Si on échoue, on garde le reste en file.
          // Au prochain timer, on retest.
          continue;
        }
      }
    } finally {
      _queueSyncing = false;
      _refreshPendingQueueCount();
    }

    // Une fois synchronisé, on rafraîchit les questions/réactions depuis le serveur.
    await _refreshQuestionsAndReactions();
  }

  Future<void> _refreshQuestionsAndReactions() async {
    try {
      final res = await BalandouApi.get(
        '/mobile/lessons/${widget.lessonId}',
        query: {'course_id': widget.courseId},
      );
      if (res['error'] == true || res['data'] == null) return;
      final data = res['data'] as Map<String, dynamic>;

      if (!mounted) return;
      setState(() {
        _questions = (data['questions'] as List<dynamic>? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _reactions = Map<String, dynamic>.from((data['reactions'] as Map?) ?? _reactions);
      });
    } catch (_) {
      // Toujours silencieux : si toujours offline, on laisse la file d'actions.
    }
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes o';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} Ko';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} Mo';
  }

  String _formatDate(String iso) {
    final date = DateTime.tryParse(iso);
    if (date == null) return '';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  Future<void> _handleVote(String vote) async {
    if (_voting) return;
    setState(() => _voting = true);
    try {
      final res = await BalandouApi.post('/mobile/lessons/${widget.lessonId}/reactions', {
        'vote': vote,
        'course_id': widget.courseId,
      });
      if (res['error'] != true && res['data'] != null) {
        setState(() => _reactions = Map<String, dynamic>.from(res['data'] as Map));
      }
    } catch (_) {
      // Offline : on garde le vote en file et on met à jour l'UI immédiatement.
      final previousVote = _reactions['user_vote'] as String?;
      if (previousVote != vote) {
        final likes = (_reactions['likes'] as num?)?.toInt() ?? 0;
        final dislikes = (_reactions['dislikes'] as num?)?.toInt() ?? 0;

        var nextLikes = likes;
        var nextDislikes = dislikes;
        if (previousVote == 'like') nextLikes = (nextLikes - 1).clamp(0, 1 << 30);
        if (previousVote == 'dislike') nextDislikes = (nextDislikes - 1).clamp(0, 1 << 30);
        if (vote == 'like') nextLikes += 1;
        if (vote == 'dislike') nextDislikes += 1;

        setState(() {
          _reactions = {
            ..._reactions,
            'likes': nextLikes,
            'dislikes': nextDislikes,
            'user_vote': vote,
          };
        });

        await _enqueueAction({
          'type': 'reaction',
          'lesson_id': widget.lessonId,
          'course_id': widget.courseId,
          'vote': vote,
          'created_at': DateTime.now().toIso8601String(),
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Vote enregistré hors-ligne. Synchronisation dès que possible.')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _voting = false);
    }
  }

  Future<void> _submitQuestion() async {
    final text = _questionController.text.trim();
    if (text.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Écrivez au moins 3 caractères')),
      );
      return;
    }

    setState(() => _submittingQuestion = true);
    try {
      final res = await BalandouApi.post('/mobile/lessons/${widget.lessonId}/questions', {
        'text': text,
        'author_name': _authorController.text.trim(),
        'course_id': widget.courseId,
      });

      if (res['error'] == true) {
        throw Exception(res['message']?.toString() ?? 'Erreur');
      }

      setState(() {
        _questions.insert(0, Map<String, dynamic>.from(res['data'] as Map));
        _questionController.clear();
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Question envoyée')),
      );
    } catch (_) {
      // Offline : on garde la question en file et on l'affiche en attente.
      final authorName = _authorController.text.trim().isNotEmpty
          ? _authorController.text.trim()
          : 'Étudiant';
      final actionId = _makeActionId();

      setState(() {
        _questions.insert(
          0,
          {
            'id': 'pending-$actionId',
            'author_name': authorName,
            'text': text,
            'created_at': DateTime.now().toIso8601String(),
            'admin_reply': null,
            'admin_replied_at': null,
            'pending': true,
          },
        );
        _questionController.clear();
      });

      await _enqueueAction({
        'type': 'question',
        'lesson_id': widget.lessonId,
        'course_id': widget.courseId,
        'text': text,
        'author_name': authorName,
        'created_at': DateTime.now().toIso8601String(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Question enregistrée hors-ligne. Synchronisation dès que possible.')),
        );
      }
    } finally {
      if (mounted) setState(() => _submittingQuestion = false);
    }
  }

  Future<void> _downloadAttachment(Map<String, dynamic> att) async {
    final id = att['id'] as String;
    final name = att['original_name']?.toString() ?? 'document';
    setState(() => _downloadingId = id);

    try {
      final deviceId = await DeviceService.getOrCreateDeviceId();
      final url = AppSettings.resolveMediaUrl(att['download_url'] as String);
      final dir = await getApplicationDocumentsDirectory();
      final savePath = '${dir.path}/$name';

      await Dio().download(
        url,
        savePath,
        options: Options(headers: {'X-Device-Id': deviceId, 'X-Api-Base': AppSettings.apiUrl}),
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Téléchargé : $name')),
      );
      await OpenFilex.open(savePath);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec téléchargement : $e')),
      );
    } finally {
      if (mounted) setState(() => _downloadingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userVote = _reactions['user_vote'] as String?;
    final likes = (_reactions['likes'] as num?)?.toInt() ?? 0;
    final dislikes = (_reactions['dislikes'] as num?)?.toInt() ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Cette vidéo vous a plu ?', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF7D4E2D))),
        const SizedBox(height: 8),
        Row(
          children: [
            FilterChip(
              label: Text('👍 $likes'),
              selected: userVote == 'like',
              onSelected: _voting ? null : (_) => _handleVote('like'),
            ),
            const SizedBox(width: 8),
            FilterChip(
              label: Text('👎 $dislikes'),
              selected: userVote == 'dislike',
              onSelected: _voting ? null : (_) => _handleVote('dislike'),
            ),
          ],
        ),
        if (widget.attachments.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Row(
            children: [
              Icon(Icons.attach_file, size: 18, color: Color(0xFF7D4E2D)),
              SizedBox(width: 6),
              Text('Documents de la leçon', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF7D4E2D))),
            ],
          ),
          const SizedBox(height: 8),
          ...widget.attachments.map((att) {
            final id = att['id'] as String;
            final isLoading = _downloadingId == id;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const Icon(Icons.description_outlined, color: Color(0xFF7D4E2D)),
                title: Text(att['original_name']?.toString() ?? 'Fichier', maxLines: 2, overflow: TextOverflow.ellipsis),
                subtitle: Text(_formatFileSize((att['size_bytes'] as num?)?.toInt() ?? 0)),
                trailing: isLoading
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.download),
                onTap: isLoading ? null : () => _downloadAttachment(att),
              ),
            );
          }),
        ],
        const SizedBox(height: 20),
        const Row(
          children: [
            Icon(Icons.chat_bubble_outline, size: 18, color: Color(0xFF7D4E2D)),
            SizedBox(width: 6),
            Text('Poser une question', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF7D4E2D))),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _authorController,
          decoration: const InputDecoration(
            labelText: 'Votre prénom (optionnel)',
            border: OutlineInputBorder(),
            isDense: true,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _questionController,
          maxLines: 3,
          maxLength: 1000,
          decoration: const InputDecoration(
            labelText: 'Votre question sur cette leçon',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            onPressed: _submittingQuestion ? null : _submitQuestion,
            icon: _submittingQuestion
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send, size: 18),
            label: Text(_submittingQuestion ? 'Envoi...' : 'Envoyer'),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
          ),
        ),
        const SizedBox(height: 16),
        if (_questions.isEmpty)
          const Text('Aucune question pour le moment.', style: TextStyle(color: Colors.grey, fontSize: 13))
        else
          ..._questions.map((q) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                color: const Color(0xFFF8F4F0),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(q['author_name']?.toString() ?? 'Étudiant', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF7D4E2D))),
                          Text(_formatDate(q['created_at']?.toString() ?? ''), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(q['text']?.toString() ?? ''),
                      if (q['pending'] == true)
                        const Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            'En attente de connexion...',
                            style: TextStyle(fontSize: 12, color: Colors.orange),
                          ),
                        ),
                      if (q['admin_reply'] != null && (q['admin_reply'] as String).isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.green.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Réponse de l\'équipe', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.green)),
                              const SizedBox(height: 4),
                              Text(q['admin_reply']?.toString() ?? '', style: TextStyle(color: Colors.green.shade900)),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              )),
      ],
    );
  }
}
