import 'package:flutter/material.dart';

/// Logo officiel Balandou Wourouki Digital (même visuel que la plateforme web).
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 96});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/logo-balandou.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      semanticLabel: 'Logo Balandou Wourouki Digital',
    );
  }
}
