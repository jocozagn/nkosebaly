import 'package:flutter/widgets.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

/// Protection écran pendant une leçon :
/// - garde l'écran allumé (vidéo + lecture sans veille)
/// - FLAG_SECURE reste géré côté Android (MainActivity)
mixin ScreenProtection<T extends StatefulWidget> on State<T> {
  @override
  void initState() {
    super.initState();
    // Empêche la mise en veille automatique pendant la leçon.
    WakelockPlus.enable();
  }

  @override
  void dispose() {
    // Libère le verrou quand l'élève quitte la leçon.
    WakelockPlus.disable();
    super.dispose();
  }
}
