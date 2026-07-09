/// Configuration globale Nkosebaly / Balandou
class AppSettings {
  const AppSettings._();

  // Nom affiché sur l'application Android
  static const String appName = 'Karamoo Sêebaly';
  static const String packageId = 'com.silycore.nkosebaly';

  /// Production — https://silycor.xyz
  static String get apiUrl => 'https://silycor.xyz';

  static const String contactEmail = 'diallomoussa2003@gmail.com';
  static const String contactPhone = '+224622873308';
  static const String silycoreName = 'SILYCORE';

  /// Force stream/download vers le même hôte que l'API (évite nko.guineachippingexpress.com si DNS pas prêt)
  static String resolveMediaUrl(String url) {
    final api = Uri.parse(apiUrl);
    final media = Uri.parse(url);
    return media.replace(scheme: api.scheme, host: api.host, port: api.hasPort ? api.port : null).toString();
  }
}
