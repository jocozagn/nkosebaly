import 'package:flutter/material.dart';
import 'package:nkosebaly/config/app_settings.dart';

/// En-tête de marque — nom N'ko, nom latin, slogan et professeur
class BrandTitle extends StatelessWidget {
  const BrandTitle({
    super.key,
    this.compact = false,
    this.showProfessor = true,
    this.showContact = false,
    this.center = true,
  });

  final bool compact;
  final bool showProfessor;
  final bool showContact;
  final bool center;

  @override
  Widget build(BuildContext context) {
    final align = center ? CrossAxisAlignment.center : CrossAxisAlignment.start;
    final textAlign = center ? TextAlign.center : TextAlign.start;

    return Column(
      crossAxisAlignment: align,
      children: [
        Text(
          AppSettings.nameNko,
          textAlign: textAlign,
          style: TextStyle(
            fontSize: compact ? 16 : 20,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF7D4E2D),
            height: 1.25,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          AppSettings.appName,
          textAlign: textAlign,
          style: TextStyle(
            fontSize: compact ? 11 : 13,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.6,
            color: const Color(0xFF5C3A21),
          ),
        ),
        if (!compact) ...[
          const SizedBox(height: 6),
          Text(
            AppSettings.taglineNko,
            textAlign: textAlign,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.3),
          ),
        ],
        if (showProfessor) ...[
          const SizedBox(height: 8),
          Text(
            AppSettings.professorNko,
            textAlign: textAlign,
            style: TextStyle(fontSize: compact ? 11 : 12, fontWeight: FontWeight.w600, color: const Color(0xFF7D4E2D)),
          ),
          Text(
            AppSettings.professorFrench,
            textAlign: textAlign,
            style: TextStyle(fontSize: compact ? 10 : 11, color: Colors.grey.shade600),
          ),
        ],
        if (showContact) ...[
          const SizedBox(height: 8),
          Text(
            AppSettings.contactPhoneNko,
            textAlign: textAlign,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
          ),
        ],
      ],
    );
  }
}
