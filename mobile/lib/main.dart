import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/screens/gate_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await Hive.initFlutter();
  runApp(const NkosebalyApp());
}

class NkosebalyApp extends StatelessWidget {
  const NkosebalyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: AppSettings.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7D4E2D)),
        useMaterial3: true,
      ),
      home: const GateScreen(),
    );
  }
}
