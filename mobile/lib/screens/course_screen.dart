import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:nkosebaly/screens/lesson_screen.dart';
import 'package:nkosebaly/screens/quiz_screen.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:nkosebaly/services/courses_cache.dart';
import 'package:nkosebaly/services/secure_video_vault.dart';

class CourseScreen extends StatefulWidget {
  const CourseScreen({super.key, required this.courseId, required this.title});

  final String courseId;
  final String title;

  @override
  State<CourseScreen> createState() => _CourseScreenState();
}

class _CourseScreenState extends State<CourseScreen> {
  Map<String, dynamic>? _course;
  Map<String, Map<String, dynamic>> _lessonProgress = {};
  Set<String> _downloadedLessonIds = {};
  int _coursePercent = 0;
  bool _loading = true;
  bool _isOfflineMode = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _isOfflineMode = false;
    });

    final offlineMeta = await SecureVideoVault.listByCourseId(widget.courseId);
    final downloadedIds = offlineMeta.map((m) => m.lessonId).toSet();

    try {
      final results = await Future.wait([
        BalandouApi.get('/mobile/courses', query: {'id': widget.courseId}),
        BalandouApi.get('/mobile/progress', query: {'course_id': widget.courseId}),
      ]);

      final courseRes = results[0];
      final progressRes = results[1];

      final progressMap = <String, Map<String, dynamic>>{};
      var percent = 0;

      if (progressRes['error'] != true && progressRes['data'] != null) {
        final progressData = progressRes['data'] as Map<String, dynamic>;
        percent = (progressData['course']?['percent'] as num?)?.round() ?? 0;
        final lessons = progressData['lessons'] as List<dynamic>? ?? [];
        for (final entry in lessons) {
          final map = Map<String, dynamic>.from(entry as Map);
          progressMap[map['lesson_id'] as String] = map;
        }
      }

      final course = courseRes['data'] as Map<String, dynamic>?;

      if (course != null) {
        await CoursesCache.saveCourseDetail(
          courseId: widget.courseId,
          course: course,
          lessonProgress: progressMap,
          coursePercent: percent,
        );
      }

      setState(() {
        _course = course;
        _lessonProgress = progressMap;
        _downloadedLessonIds = downloadedIds;
        _coursePercent = percent;
        _loading = false;
      });
    } catch (_) {
      await _loadFromCache(downloadedIds: downloadedIds);
    }
  }

  /// Bascule sur le cache local ou la liste des leçons téléchargées.
  Future<void> _loadFromCache({required Set<String> downloadedIds}) async {
    _isOfflineMode = true;

    final cached = await CoursesCache.readCourseDetail(courseId: widget.courseId);
    if (cached != null) {
      final rawProgress = cached['lesson_progress'] as Map<dynamic, dynamic>? ?? {};
      final progressMap = rawProgress.map(
        (key, value) => MapEntry(
          key as String,
          Map<String, dynamic>.from(value as Map),
        ),
      );

      setState(() {
        _course = Map<String, dynamic>.from(cached['course'] as Map);
        _lessonProgress = progressMap;
        _downloadedLessonIds = downloadedIds;
        _coursePercent = (cached['course_percent'] as num?)?.round() ?? 0;
        _loading = false;
      });
      return;
    }

    // Dernier recours : afficher uniquement les leçons téléchargées.
    if (downloadedIds.isNotEmpty) {
      final offlineMeta = await SecureVideoVault.listByCourseId(widget.courseId);
      final lessons = offlineMeta
          .map((m) => {
                'id': m.lessonId,
                'title': m.title,
                'chapter_id': 'offline',
                'has_video': true,
                'duration_minutes': 0,
              })
          .toList();

      setState(() {
        _course = {
          'chapters': [
            {'id': 'offline', 'order': 1, 'title': 'Leçons téléchargées'},
          ],
          'lessons': lessons,
        };
        _lessonProgress = {};
        _downloadedLessonIds = downloadedIds;
        _coursePercent = 0;
        _loading = false;
      });
      return;
    }

    setState(() => _loading = false);
  }

  /// Une leçon est accessible hors-ligne si elle est téléchargée,
  /// ou en ligne si elle est déverrouillée côté serveur.
  bool _canOpenLesson({
    required bool hasVideo,
    required bool unlocked,
    required bool isDownloaded,
  }) {
    if (!hasVideo) return false;
    if (isDownloaded) return true;
    if (_isOfflineMode) return false;
    return unlocked;
  }

  @override
  Widget build(BuildContext context) {
    final chapters = (_course?['chapters'] as List<dynamic>? ?? []);
    final lessons = (_course?['lessons'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
        actions: [
          if (!_isOfflineMode)
            IconButton(
              icon: const Icon(Icons.quiz),
              tooltip: 'Quiz certifiant',
              onPressed: () => Get.to(
                () => QuizScreen(courseId: widget.courseId, courseTitle: widget.title),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Rafraîchir',
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF7D4E2D)))
          : _course == null
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Cours indisponible hors-ligne.\nTéléchargez des leçons avec internet, puis revenez ici.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    if (_isOfflineMode)
                      Card(
                        color: const Color(0xFFFFF3E0),
                        margin: const EdgeInsets.only(bottom: 12),
                        child: const ListTile(
                          leading: Icon(Icons.cloud_off, color: Color(0xFF7D4E2D)),
                          title: Text('Mode hors-ligne'),
                          subtitle: Text('Seules les leçons téléchargées sont lisibles.'),
                        ),
                      ),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Progression du cours : $_coursePercent%', style: const TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: _coursePercent / 100,
                                minHeight: 8,
                                backgroundColor: const Color(0xFFE8DDD4),
                                color: const Color(0xFF4A90A4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    ...chapters.map((chapter) {
                      final ch = Map<String, dynamic>.from(chapter as Map);
                      final chLessons = lessons.where((l) => l['chapter_id'] == ch['id']).toList();
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ExpansionTile(
                          initiallyExpanded: _isOfflineMode,
                          title: Text('${ch['order']}. ${ch['title']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                          children: chLessons.map((lesson) {
                            final hasVideo = lesson['has_video'] == true;
                            final lessonId = lesson['id'] as String;
                            final isDownloaded = _downloadedLessonIds.contains(lessonId);
                            final progress = _lessonProgress[lessonId];
                            final unlocked = progress?['unlocked'] != false;
                            final completed = progress?['completed'] == true;
                            final watchPercent = (progress?['watch_percent'] as num?)?.round() ?? 0;
                            final hasQuiz = lesson['has_quiz'] == true || progress?['has_quiz'] == true;
                            final quizScore = progress?['quiz_score'];
                            final quizTotal = progress?['quiz_total'];
                            final quizPassed = progress?['quiz_passed'] == true;
                            final canOpen = _canOpenLesson(
                              hasVideo: hasVideo,
                              unlocked: unlocked,
                              isDownloaded: isDownloaded,
                            );

                            return ListTile(
                              leading: Icon(
                                isDownloaded
                                    ? Icons.download_done
                                    : completed
                                        ? Icons.check_circle
                                        : unlocked
                                            ? Icons.play_circle_outline
                                            : Icons.lock_outline,
                                color: isDownloaded
                                    ? const Color(0xFF4A90A4)
                                    : completed
                                        ? Colors.green
                                        : unlocked
                                            ? const Color(0xFF7D4E2D)
                                            : Colors.grey,
                              ),
                              title: Text(lesson['title']?.toString() ?? 'Leçon'),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isDownloaded
                                        ? 'Téléchargée · lecture hors-ligne'
                                        : unlocked
                                            ? '${lesson['duration_minutes'] ?? 0} min · $watchPercent%'
                                            : 'Verrouillée — terminez la leçon précédente',
                                  ),
                                  if (hasQuiz)
                                    Text(
                                      'Exercice'
                                      '${quizScore != null && quizTotal != null ? ' · Score $quizScore/$quizTotal${quizPassed ? ' ✓' : ''}' : ''}',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF7D4E2D), fontWeight: FontWeight.w500),
                                    ),
                                ],
                              ),
                              enabled: canOpen,
                              onTap: canOpen
                                  ? () async {
                                      await Get.to(() => LessonScreen(
                                            courseId: widget.courseId,
                                            lessonId: lessonId,
                                            lessonTitle: lesson['title']?.toString() ?? '',
                                          ));
                                      if (!mounted) return;
                                      await _load();
                                    }
                                  : null,
                            );
                          }).toList(),
                        ),
                      );
                    }),
                  ],
                ),
    );
  }
}
