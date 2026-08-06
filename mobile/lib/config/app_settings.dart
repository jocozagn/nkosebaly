/// Configuration globale KARAMOO SEEBALI / ߞߊ߬ߙߊ߲߬ߡߐ߯ ߛߍ߰ߓߊߟߌ
class AppSettings {
  const AppSettings._();

  /// Nom N'ko — affiché en premier
  static const String nameNko = 'ߞߊ߬ߙߊ߲߬ߡߐ߯ ߛߍ߰ߓߊߟߌ';

  /// Nom latin officiel (label Android / AppBar)
  static const String appName = 'KARAMOO SEEBALI';

  /// Slogan en N'ko
  static const String taglineNko = 'ߞߊ߬ ߒߞߏ ߞߊ߬ߙߊ߲߬ ߟߊ߬ߝߙߍ ߘߐ߫';

  /// Professeur fondateur
  static const String professorNko = 'ߡߎߛߊ߫ ߓߊߟߊ߲ߘߎ߯ ߖߊߟߏ߫';
  static const String professorFrench = 'Moussa Diallo Baldé';

  static const String packageId = 'com.silycore.gandalfifow';

  /// Désactive FLAG_SECURE (Android) pour tutoriel / captures d'écran.
  /// Usage : flutter run --dart-define=ALLOW_SCREEN_CAPTURE=true
  /// Par défaut : protection active (false).
  static const bool allowScreenCapture = bool.fromEnvironment(
    'ALLOW_SCREEN_CAPTURE',
    defaultValue: false,
  );

  /// Production — https://silycor.xyz
  static String get apiUrl => 'https://silycor.xyz';

  /// Politique de confidentialité (web NKO + Play Store Adlam)
  static String get privacyPolicyUrl => '$apiUrl/politique-de-confidentialite';

  static const String contactEmail = 'diallomoussa2003@gmail.com';
  static const String contactPhone = '+224622873308';
  static const String contactPhoneNko = 'ߜߝ: +߂߂߄ ߆߂߂ ߈߇ ߃߃ ߀߈';
  static const String silycoreName = 'SILYCORE';

  /// Force stream/download vers le même hôte que l'API
  static String resolveMediaUrl(String url) {
    final api = Uri.parse(apiUrl);
    final media = Uri.parse(url);
    return media.replace(scheme: api.scheme, host: api.host, port: api.hasPort ? api.port : null).toString();
  }
}
