import 'package:flutter/material.dart';
import 'package:nkosebaly/config/app_settings.dart';
import 'package:nkosebaly/models/djomy_payment_result.dart';
import 'package:nkosebaly/services/balandou_api.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Paiement Djomy dans l'application (WebView) — sans quitter l'app
class DjomyPaymentScreen extends StatefulWidget {
  const DjomyPaymentScreen({
    super.key,
    required this.paymentUrl,
    required this.certificateId,
    this.title = 'Paiement sécurisé',
  });

  final String paymentUrl;
  final String certificateId;
  final String title;

  @override
  State<DjomyPaymentScreen> createState() => _DjomyPaymentScreenState();
}

class _DjomyPaymentScreenState extends State<DjomyPaymentScreen> {
  late final WebViewController _controller;
  bool _isVerifying = false;
  bool _handledReturn = false;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: _handleNavigation,
          onUrlChange: (change) {
            final url = change.url;
            if (url != null) _handleReturnUrl(url);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.paymentUrl));
  }

  NavigationDecision _handleNavigation(NavigationRequest request) {
    if (_handleReturnUrl(request.url)) {
      return NavigationDecision.prevent;
    }
    return NavigationDecision.navigate;
  }

  bool _handleReturnUrl(String url) {
    if (_handledReturn || _isVerifying) return false;

    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    final baseHost = Uri.parse(AppSettings.apiUrl).host;
    if (uri.host != baseHost) return false;

    if (uri.path.contains('/dashboard/certificates/payment/return')) {
      _handledReturn = true;
      final certId = uri.queryParameters['cert_id'] ?? widget.certificateId;
      final transactionId = uri.queryParameters['transaction_id'] ??
          uri.queryParameters['transactionId'] ??
          uri.queryParameters['payment_id'];
      _verifyPayment(certId: certId, transactionId: transactionId);
      return true;
    }

    if (uri.path.contains('/dashboard/certificates/payment/cancel')) {
      _handledReturn = true;
      _closeWith(DjomyPaymentResult.cancelled);
      return true;
    }

    return false;
  }

  Future<void> _verifyPayment({required String certId, String? transactionId}) async {
    if (_isVerifying) return;
    setState(() => _isVerifying = true);

    try {
      for (var attempt = 0; attempt < 10; attempt++) {
        final params = <String, String>{'cert_id': certId};
        if (transactionId != null && transactionId.isNotEmpty) {
          params['transaction_id'] = transactionId;
        }

        final query = params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&');
        final res = await BalandouApi.get('/mobile/certificates/payment/verify?$query');

        if (res['data']?['status'] == 'paid') {
          _closeWith(DjomyPaymentResult.success);
          return;
        }

        if (res['error'] == true && res['data'] == null) {
          _closeWith(DjomyPaymentResult.failed);
          return;
        }

        if (attempt < 9) {
          await Future<void>.delayed(const Duration(seconds: 3));
        }
      }

      _closeWith(DjomyPaymentResult.pending);
    } catch (_) {
      _closeWith(DjomyPaymentResult.failed);
    }
  }

  void _closeWith(DjomyPaymentResult result) {
    if (!mounted) return;
    Navigator.of(context).pop(result);
  }

  void _handleClosePressed() {
    if (_isVerifying) return;
    _closeWith(DjomyPaymentResult.cancelled);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: const Color(0xFF7D4E2D),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Fermer',
          onPressed: _handleClosePressed,
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isVerifying)
            Container(
              color: Colors.black26,
              alignment: Alignment.center,
              child: Card(
                margin: const EdgeInsets.all(24),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      CircularProgressIndicator(color: Color(0xFF7D4E2D)),
                      SizedBox(height: 16),
                      Text('Confirmation du paiement...'),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
