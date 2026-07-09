import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

/// Lecteur vidéo standard : jauge en bas, contrôles au toucher
class LessonVideoPlayer extends StatefulWidget {
  const LessonVideoPlayer({
    super.key,
    required this.controller,
    required this.isFullscreen,
    required this.onFullscreenChanged,
  });

  final VideoPlayerController controller;
  final bool isFullscreen;
  final ValueChanged<bool> onFullscreenChanged;

  @override
  State<LessonVideoPlayer> createState() => _LessonVideoPlayerState();
}

class _LessonVideoPlayerState extends State<LessonVideoPlayer> {
  bool _showControls = true;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onVideoTick);
    _scheduleAutoHide();
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    widget.controller.removeListener(_onVideoTick);
    super.dispose();
  }

  void _onVideoTick() {
    if (mounted) setState(() {});
  }

  String _formatDuration(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (hours > 0) return '$hours:$minutes:$seconds';
    return '$minutes:$seconds';
  }

  void _scheduleAutoHide() {
    _hideTimer?.cancel();
    if (!widget.controller.value.isPlaying) return;

    _hideTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted) return;
      if (widget.controller.value.isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  void _revealControls() {
    setState(() => _showControls = true);
    _scheduleAutoHide();
  }

  void _handleVideoTap() {
    if (_showControls) {
      setState(() => _showControls = false);
      _hideTimer?.cancel();
      return;
    }
    _revealControls();
  }

  void _togglePlayPause() {
    final value = widget.controller.value;
    if (value.isPlaying) {
      widget.controller.pause();
      _hideTimer?.cancel();
      setState(() => _showControls = true);
    } else {
      widget.controller.play();
      _revealControls();
    }
  }

  Future<void> _setFullscreen(bool value) async {
    if (value) {
      await SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      await SystemChrome.setPreferredOrientations(DeviceOrientation.values);
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
    widget.onFullscreenChanged(value);
    _revealControls();
  }

  Widget _buildControlsOverlay() {
    final value = widget.controller.value;
    final position = value.position;
    final duration = value.duration;

    return IgnorePointer(
      ignoring: !_showControls,
      child: AnimatedOpacity(
        opacity: _showControls ? 1 : 0,
        duration: const Duration(milliseconds: 220),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.transparent, Colors.black54, Colors.black87],
            ),
          ),
          padding: EdgeInsets.fromLTRB(8, 24, 8, widget.isFullscreen ? 16 : 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              VideoProgressIndicator(
                widget.controller,
                allowScrubbing: true,
                padding: const EdgeInsets.symmetric(vertical: 8),
                colors: const VideoProgressColors(
                  playedColor: Color(0xFFC9A227),
                  bufferedColor: Colors.white38,
                  backgroundColor: Colors.white24,
                ),
              ),
              Row(
                children: [
                  IconButton(
                    icon: Icon(value.isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.white, size: 28),
                    onPressed: _togglePlayPause,
                  ),
                  Text(
                    _formatDuration(position),
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                  ),
                  const Text(' / ', style: TextStyle(color: Colors.white54, fontSize: 13)),
                  Text(
                    _formatDuration(duration),
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(
                      widget.isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen,
                      color: Colors.white,
                    ),
                    tooltip: widget.isFullscreen ? 'Réduire' : 'Agrandir',
                    onPressed: () => _setFullscreen(!widget.isFullscreen),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlayerSurface() {
    final aspect = widget.controller.value.isInitialized && widget.controller.value.aspectRatio > 0
        ? widget.controller.value.aspectRatio
        : 16 / 9;

    final video = widget.isFullscreen
        ? Center(child: AspectRatio(aspectRatio: aspect, child: VideoPlayer(widget.controller)))
        : AspectRatio(aspectRatio: aspect, child: VideoPlayer(widget.controller));

    return GestureDetector(
      onTap: _handleVideoTap,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        alignment: Alignment.bottomCenter,
        fit: widget.isFullscreen ? StackFit.expand : StackFit.loose,
        children: [
          video,
          if (!_showControls && !widget.controller.value.isPlaying)
            const Center(
              child: Icon(Icons.play_circle_fill, color: Colors.white70, size: 64),
            ),
          Positioned(left: 0, right: 0, bottom: 0, child: _buildControlsOverlay()),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isFullscreen) {
      return Material(
        color: Colors.black,
        child: SafeArea(child: _buildPlayerSurface()),
      );
    }

    return SizedBox(
      width: double.infinity,
      child: ColoredBox(color: Colors.black, child: _buildPlayerSurface()),
    );
  }
}
