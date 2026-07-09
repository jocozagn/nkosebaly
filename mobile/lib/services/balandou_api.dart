import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/services/device_service.dart';
import 'package:nkosebaly/services/mobile_token_service.dart';

/// Client HTTP vers le backend Next.js Balandou
class BalandouApi {
  BalandouApi._();

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: AppSettings.apiUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(minutes: 10),
      // Important:
      // Le backend renvoie souvent des 400/401/403 avec un JSON { error: true, message: "..." }.
      // Par défaut, Dio lève une exception sur ces statuts -> l'app affiche un message réseau confus.
      // On accepte tous les codes HTTP pour pouvoir afficher la vraie cause (message) côté UI.
      validateStatus: (_) => true,
    ),
  );

  static Future<Map<String, String>> _headers({String? deviceIdOverride}) async {
    final deviceId = (deviceIdOverride ?? await DeviceService.getOrCreateDeviceId()).trim();
    final mobileToken = await MobileTokenService.read();
    return {
      // Nouveau: auth par token (prioritaire côté serveur)
      if (mobileToken != null) 'X-Mobile-Token': mobileToken,
      // Fallback: ancien mécanisme (compat)
      'X-Device-Id': deviceId,
      'X-Api-Base': AppSettings.apiUrl,
      'Content-Type': 'application/json',
    };
  }

  static Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
    String? deviceIdOverride,
  }) async {
    final res = await _dio.get<dynamic>(
      '/api$path',
      queryParameters: query,
      options: Options(headers: await _headers(deviceIdOverride: deviceIdOverride)),
    );
    final data = res.data;
    if (data is Map<String, dynamic>) return data;
    // Cas rare: serveur qui renvoie HTML/texte (proxy, 502, maintenance...)
    // On normalise pour que l'UI affiche une erreur claire.
    return {
      'error': true,
      'message': 'Réponse serveur invalide (HTTP ${res.statusCode ?? "?"}). Réessayez.',
    };
  }

  static Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    String? deviceIdOverride,
  }) async {
    final res = await _dio.post<dynamic>(
      '/api$path',
      data: body,
      options: Options(headers: await _headers(deviceIdOverride: deviceIdOverride)),
    );
    final data = res.data;
    if (data is Map<String, dynamic>) return data;
    return {
      'error': true,
      'message': 'Réponse serveur invalide (HTTP ${res.statusCode ?? "?"}). Réessayez.',
    };
  }

  static Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body, {
    String? deviceIdOverride,
  }) async {
    final res = await _dio.patch<dynamic>(
      '/api$path',
      data: body,
      options: Options(headers: await _headers(deviceIdOverride: deviceIdOverride)),
    );
    final data = res.data;
    if (data is Map<String, dynamic>) return data;
    return {
      'error': true,
      'message': 'Réponse serveur invalide (HTTP ${res.statusCode ?? "?"}). Réessayez.',
    };
  }

  static Map<String, dynamic>? parseQrJson(String raw) {
    try {
      return jsonDecode(raw.trim()) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}
