import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:nkosebaly/services/mobile_token_service.dart';
import 'package:nkosebaly/services/progress_sync_queue.dart';
import 'package:nkosebaly/services/secure_video_vault.dart';
import 'package:nkosebaly/utils/screen_protection.dart';
import 'package:nkosebaly/widgets/lesson_engagement_panel.dart';
import 'package:nkosebaly/widgets/lesson_quiz_panel.dart';
import 'package:nkosebaly/widgets/lesson_video_player.dart';
import 'package:video_player/video_player.dart';

class LessonScreen extends StatefulWidget {
  const LessonScreen({
    super.key,
    required this.courseId,
    required this.lessonId,
    required this.lessonTitle,
  });

  final String courseId;
  final String lessonId;
  final String lessonTitle;

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> with ScreenProtection {
  VideoPlayerController? _controller;
  bool _loading = true;
  bool _downloading = false;
  double _downloadProgress = 0;
  bool _isOffline = false;
  bool _hasDownload = false;
  bool _isFullscreen = false;
  String? _error;
  File? _tempPlayFile;
  int _lastReportedPercent = -1;
  DateTime? _lastHeartbeatAt;

  List<Map<String, dynamic>> _attachments = [];
  List<Map<String, dynamic>> _questions = [];
  Map<String, dynamic> _reactions = {'likes': 0, 'dislikes': 0, 'user_vote': null};
  String _userName = '';

  bool _hasQuiz = false;
  bool _quizOpen = false;
  bool _videoCompleted = false;
  bool _pendingQuizOpen = false;
  Map<String, dynamic>? _quizMeta;
  final GlobalKey _quizSectionKey = GlobalKey();

  String get _engagementCacheKey => '${widget.courseId}:${widget.lessonId}';

  Future<void> _saveEngagementCache(Map<String, dynamic> data) async {
    final box = await Hive.openBox<String>('lesson_engagement_cache');

    // On stocke uniquement les métadonnées (documents/questions/réactions).
    // La vidéo reste en coffre chiffré via SecureVideoVault.
    final payload = jsonEncode({
      'attachments': data['attachments'] ?? [],
      'questions': data['questions'] ?? [],
      'reactions': data['reactions'] ?? _reactions,
    });

    await box.put(_engagementCacheKey, payload);
  }

  Future<void> _loadEngagementCache() async {
    final box = await Hive.openBox<String>('lesson_engagement_cache');
    final raw = box.get(_engagementCacheKey);
    if (raw == null) return;

    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    setState(() {
      _attachments = (decoded['attachments'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      _questions = (decoded['questions'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      _reactions = Map<String, dynamic>.from((decoded['reactions'] as Map?) ?? _reactions);
    });
  }

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  @override
  void dispose() {
    _flushRemainingWatchTime();
    _controller?.removeListener(_handlePlaybackProgress);
    _controller?.dispose();
    // On garde le fichier temp déchiffré pour une réouverture plus rapide
    super.dispose();
  }

  /// Envoie le temps restant depuis le dernier heartbeat
  Future<void> _flushRemainingWatchTime() async {
    if (_lastHeartbeatAt == null || _lastReportedPercent < 0) return;
    final seconds = DateTime.now().difference(_lastHeartbeatAt!).inSeconds;
    if (seconds < 3) return;

    await ProgressSyncQueue.reportProgress(
      courseId: widget.courseId,
      lessonId: widget.lessonId,
      watchPercent: _lastReportedPercent,
      secondsWatched: seconds.clamp(1, 600),
    );
  }

  String _formatVideoError(Object e) {
    final msg = e.toString();
    if (msg.contains('Source error') || msg.contains('VideoError')) {
      return 'Impossible de lire la vidéo.\n\n'
          '• Vérifiez votre connexion internet\n'
          '• Le fichier vidéo n\'est peut-être pas encore sur le serveur\n'
          '• Réessayez ou contactez le support';
    }
    return msg;
  }

  Future<Map<String, dynamic>> _fetchLessonData({Duration? timeout}) async {
    Future<Map<String, dynamic>> request() async {
      final res = await BalandouApi.get(
        '/mobile/lessons/${widget.lessonId}',
        query: {'course_id': widget.courseId},
      );
      if (res['error'] == true) throw Exception(res['message']?.toString() ?? 'Erreur');
      return Map<String, dynamic>.from(res['data'] as Map);
    }

    if (timeout != null) return request().timeout(timeout);
    return request();
  }

  /// Rafraîchit documents/questions en arrière-plan (sans bloquer la vidéo)
  Future<void> _refreshEngagementInBackground() async {
    try {
      final data = await _fetchLessonData(timeout: const Duration(seconds: 4));
      if (!mounted) return;
      setState(() {
        _attachments = (data['attachments'] as List<dynamic>? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _questions = (data['questions'] as List<dynamic>? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _reactions = Map<String, dynamic>.from((data['reactions'] as Map?) ?? _reactions);
        _userName = data['user_name']?.toString() ?? _userName;
      });
      await _saveEngagementCache(data);
    } catch (_) {
      // Hors-ligne ou réseau lent : le cache local suffit
    }
  }

  /// Sync analytics sans bloquer l'ouverture de la leçon
  void _runBackgroundAnalytics() {
    unawaited(Future<void>(() async {
      await ProgressSyncQueue.syncQueue();
      await ProgressSyncQueue.recordLessonOpen(
        courseId: widget.courseId,
        lessonId: widget.lessonId,
      );
    }));
  }

  Future<void> _verifyStreamUrl(String streamUrl, String deviceId) async {
    final mobileToken = await MobileTokenService.read();
    // IMPORTANT:
    // Un HEAD ne renvoie pas de body => impossible de lire le message JSON du serveur en cas de 403/401.
    // On fait donc un mini GET "Range" (0-1) pour pouvoir afficher la cause exacte.
    final response = await Dio().get<List<int>>(
      streamUrl,
      options: Options(
        // X-Mobile-Token est ajouté automatiquement par BalandouApi (si présent),
        // mais ici on fait un HEAD direct. On garde au minimum X-Device-Id en fallback.
        headers: {
          if (mobileToken != null) 'X-Mobile-Token': mobileToken,
          'X-Device-Id': deviceId,
          'X-Api-Base': AppSettings.apiUrl,
          'Range': 'bytes=0-1',
        },
        validateStatus: (status) => status != null && status < 500,
        responseType: ResponseType.bytes,
      ),
    );

    final contentType = response.headers.value('content-type') ?? '';

    // Si le serveur renvoie un JSON d'erreur, on essaye de lire le message exact.
    final serverMsg = () {
      try {
        final bytes = response.data;
        if (bytes == null || bytes.isEmpty) return null;
        final raw = utf8.decode(bytes, allowMalformed: true);
        if (raw.isEmpty) return null;
        final decoded = jsonDecode(raw);
        if (decoded is Map && decoded['message'] != null) return decoded['message'].toString();
        return null;
      } catch (_) {
        return null;
      }
    }();

    if (response.statusCode == 404) {
      throw Exception(serverMsg ?? 'Vidéo introuvable sur le serveur. L\'administrateur doit uploader le fichier MP4.');
    }
    if (response.statusCode == 403) {
      throw Exception(serverMsg ?? 'Accès refusé.');
    }
    if (response.statusCode == 401) {
      throw Exception(serverMsg ?? 'Session invalide. Réactivez votre licence.');
    }
    if (!contentType.contains('video')) {
      throw Exception(serverMsg ?? 'Le serveur n\'a pas renvoyé une vidéo (erreur ${response.statusCode}).');
    }
  }

  void _handlePlaybackProgress() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    final duration = controller.value.duration;
    if (duration.inMilliseconds <= 0) return;

    final percent = (controller.value.position.inMilliseconds / duration.inMilliseconds * 100).round();
    if (percent <= _lastReportedPercent) return;
    if (percent - _lastReportedPercent < 5 && percent < 90) return;

    _lastReportedPercent = percent;
    final now = DateTime.now();
    final secondsDelta = _lastHeartbeatAt == null
        ? 15
        : now.difference(_lastHeartbeatAt!).inSeconds.clamp(1, 600);
    _lastHeartbeatAt = now;
    _reportProgress(percent, secondsDelta);

    if (percent >= 90 && !_videoCompleted) {
      setState(() {
        _videoCompleted = true;
        _pendingQuizOpen = true;
      });
      if (_hasQuiz) _openQuiz();
    }
  }

  void _handleHasQuiz(bool hasQuiz, Map<String, dynamic>? previous) {
    setState(() {
      _hasQuiz = hasQuiz;
      _quizMeta = previous;
    });
    if (hasQuiz && _pendingQuizOpen) _openQuiz();
  }

  void _openQuiz() {
    setState(() {
      _quizOpen = true;
      _pendingQuizOpen = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _quizSectionKey.currentContext;
      if (ctx != null) {
        Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
      }
    });
  }

  Future<void> _reportProgress(int percent, int secondsWatched) async {
    await ProgressSyncQueue.reportProgress(
      courseId: widget.courseId,
      lessonId: widget.lessonId,
      watchPercent: percent,
      secondsWatched: secondsWatched,
    );
  }

  Future<void> _initPlayer() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    _lastHeartbeatAt = DateTime.now();
    // Analytics en arrière-plan — ne bloque jamais la vidéo
    _runBackgroundAnalytics();

    try {
      // Vérification locale rapide (~millisecondes)
      final hasOffline = await SecureVideoVault.hasLesson(widget.lessonId);
      setState(() => _hasDownload = hasOffline);

      if (hasOffline) {
        // Cache immédiat puis lecture locale sans attendre le réseau
        await _loadEngagementCache();
        await _playOffline();
        unawaited(_refreshEngagementInBackground());
        return;
      }

      await _playOnline();
    } catch (e) {
      setState(() {
        _error = _formatVideoError(e);
        _loading = false;
      });
    }
  }

  Future<void> _playOnline() async {
    final data = await _fetchLessonData();
    final streamUrl = AppSettings.resolveMediaUrl(data['stream_url'] as String);
    final deviceId = await DeviceService.getOrCreateDeviceId();

    setState(() {
      _attachments = (data['attachments'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      _questions = (data['questions'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      _reactions = Map<String, dynamic>.from((data['reactions'] as Map?) ?? _reactions);
    });

    // Cache local pour pouvoir afficher Documents/Questions en mode hors-ligne.
    await _saveEngagementCache(data);

    await _verifyStreamUrl(streamUrl, deviceId);

    _controller?.removeListener(_handlePlaybackProgress);
    await _controller?.dispose();
    final mobileToken = await MobileTokenService.read();
    _controller = VideoPlayerController.networkUrl(
      Uri.parse(streamUrl),
      httpHeaders: {
        if (mobileToken != null) 'X-Mobile-Token': mobileToken,
        'X-Device-Id': deviceId,
        'X-Api-Base': AppSettings.apiUrl,
      },
    );

    try {
      await _controller!.initialize();
    } catch (e) {
      throw Exception(_formatVideoError(e));
    }

    _controller!.addListener(_handlePlaybackProgress);
    await _controller!.play();

    setState(() {
      _isOffline = false;
      _loading = false;
    });
  }

  Future<void> _playOffline() async {
    // Ne supprime plus le temp déchiffré : SecureVideoVault le réutilise si présent
    _tempPlayFile = await SecureVideoVault.decryptToTempFile(widget.lessonId);

    _controller?.removeListener(_handlePlaybackProgress);
    await _controller?.dispose();
    _controller = VideoPlayerController.file(_tempPlayFile!);
    await _controller!.initialize();
    _controller!.addListener(_handlePlaybackProgress);
    await _controller!.play();

    setState(() {
      _isOffline = true;
      _loading = false;
    });
  }

  Future<void> _downloadForOffline() async {
    setState(() {
      _downloading = true;
      _downloadProgress = 0;
    });

    try {
      final data = await _fetchLessonData();
      final downloadUrl = AppSettings.resolveMediaUrl(data['download_url'] as String);
      final deviceId = await DeviceService.getOrCreateDeviceId();
      final mobileToken = await MobileTokenService.read();

      final response = await Dio().get<List<int>>(
        downloadUrl,
        options: Options(
          headers: {
            if (mobileToken != null) 'X-Mobile-Token': mobileToken,
            'X-Device-Id': deviceId,
            'X-Api-Base': AppSettings.apiUrl,
          },
          responseType: ResponseType.bytes,
        ),
        onReceiveProgress: (r, t) {
          if (t > 0 && mounted) setState(() => _downloadProgress = r / t);
        },
      );

      final bytes = response.data;
      if (bytes == null) throw Exception('Téléchargement vide');

      await SecureVideoVault.saveEncryptedLesson(
        lessonId: widget.lessonId,
        courseId: widget.courseId,
        title: widget.lessonTitle,
        rawBytes: Uint8List.fromList(bytes),
      );

      if (!mounted) return;
      setState(() => _hasDownload = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Leçon téléchargée — lecture hors-ligne sécurisée')),
      );
      await _playOffline();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Échec : $e')));
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isFullscreen && _controller != null && _controller!.value.isInitialized) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: LessonVideoPlayer(
          controller: _controller!,
          isFullscreen: true,
          onFullscreenChanged: (value) => setState(() => _isFullscreen = value),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.lessonTitle, style: const TextStyle(fontSize: 16)),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
        actions: [
          if (!_downloading && !_hasDownload)
            IconButton(
              icon: const Icon(Icons.download_for_offline_outlined),
              tooltip: 'Télécharger (lecture app uniquement)',
              onPressed: _downloadForOffline,
            ),
          if (_hasDownload)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Icon(Icons.offline_pin, color: Colors.white70),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF7D4E2D)))
          : Column(
              children: [
                if (_controller != null && _controller!.value.isInitialized)
                  LessonVideoPlayer(
                    controller: _controller!,
                    isFullscreen: false,
                    onFullscreenChanged: (value) => setState(() => _isFullscreen = value),
                  )
                else
                  const AspectRatio(
                    aspectRatio: 16 / 9,
                    child: ColoredBox(color: Colors.black),
                  ),
                if (_downloading)
                  LinearProgressIndicator(value: _downloadProgress > 0 ? _downloadProgress : null),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF4E5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFF2D5A6)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.info_outline, color: Color(0xFF7D4E2D)),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Vidéo indisponible',
                                  style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF7D4E2D)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(_error!, style: const TextStyle(color: Colors.black87)),
                          const SizedBox(height: 10),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(
                              onPressed: _initPlayer,
                              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
                              child: const Text('Réessayer'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_isOffline)
                          const Chip(
                            avatar: Icon(Icons.lock, size: 16),
                            label: Text('Hors-ligne sécurisé — non exportable'),
                          ),
                        if (!_quizOpen)
                          LessonQuizMetaLoader(
                            courseId: widget.courseId,
                            lessonId: widget.lessonId,
                            onHasQuiz: _handleHasQuiz,
                          ),
                        if (_hasQuiz && !_quizOpen)
                          Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: const Icon(Icons.assignment, color: Color(0xFF7D4E2D)),
                              title: const Text('Exercice', style: TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(
                                _videoCompleted
                                    ? 'Leçon terminée — passez le quiz'
                                    : 'Quiz disponible maintenant ou après la vidéo'
                                '${_quizMeta != null ? ' · Dernier score : ${_quizMeta!['score']}/${_quizMeta!['total']}' : ''}',
                              ),
                              trailing: FilledButton(
                                onPressed: _openQuiz,
                                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7D4E2D)),
                                child: Text(_quizMeta != null ? 'Refaire' : 'Commencer'),
                              ),
                            ),
                          ),
                        KeyedSubtree(
                          key: _quizSectionKey,
                          child: LessonQuizPanel(
                            courseId: widget.courseId,
                            lessonId: widget.lessonId,
                            isOpen: _quizOpen,
                            onHasQuiz: _handleHasQuiz,
                            onSubmitted: (result) => setState(() => _quizMeta = result),
                          ),
                        ),
                        LessonEngagementPanel(
                          courseId: widget.courseId,
                          lessonId: widget.lessonId,
                          attachments: _attachments,
                          questions: _questions,
                          reactions: _reactions,
                          userName: _userName,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
