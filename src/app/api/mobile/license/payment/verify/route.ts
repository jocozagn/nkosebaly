import { NextRequest, NextResponse } from "next/server";
import {
  createMobileAuthSession,
  fulfillLicensePayment,
  readAdminData,
} from "@/lib/admin/store";

const DEVICE_HEADER = "x-device-id";

/** Vérifie un paiement licence mobile après retour Djomy */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const deviceId = req.headers.get(DEVICE_HEADER)?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: true, message: "X-Device-Id requis" }, { status: 401 });
  }

  const orderId = req.nextUrl.searchParams.get("order_id");
  const transactionId =
    req.nextUrl.searchParams.get("transaction_id") ??
    req.nextUrl.searchParams.get("transactionId") ??
    req.nextUrl.searchParams.get("payment_id");

  if (!orderId) {
    return NextResponse.json({ error: true, message: "order_id requis" }, { status: 400 });
  }

  const data = await readAdminData();
  const order = data.license_orders.find((o) => o.id === orderId);
  if (!order || order.device_id !== deviceId) {
    return NextResponse.json({ error: true, message: "Commande introuvable" }, { status: 404 });
  }

  if (order.payment_status === "paid" && order.license_card_id) {
    const card = data.license_cards.find((c) => c.id === order.license_card_id);
    const mobileSession = await createMobileAuthSession(order.license_card_id);
    return NextResponse.json({
      error: false,
      message: "Licence déjà activée",
      data: {
        status: "paid",
        license_card_id: order.license_card_id,
        code_text: card?.code_text,
        mobile_token: mobileSession.mobile_token,
      },
    });
  }

  if (!transactionId) {
    return NextResponse.json({
      error: false,
      message: "Paiement en cours de confirmation",
      data: { status: "pending", order_id: orderId },
    });
  }

  const fulfilled = await fulfillLicensePayment(orderId, transactionId);
  if (!fulfilled.success) {
    return NextResponse.json({
      error: false,
      message: fulfilled.message,
      data: { status: "pending", order_id: orderId },
    });
  }

  const freshData = await readAdminData();
  const card = freshData.license_cards.find((c) => c.id === fulfilled.cardId);
  const mobileSession = await createMobileAuthSession(fulfilled.cardId);

  return NextResponse.json({
    error: false,
    message: "Paiement confirmé — licence activée",
    data: {
      status: "paid",
      license_card_id: fulfilled.cardId,
      code_text: card?.code_text,
      mobile_token: mobileSession.mobile_token,
    },
  });
};
