import { NextRequest, NextResponse } from "next/server";
import { fulfillLicensePayment, readAdminData } from "@/lib/admin/store";
import {
  getAuthToken,
  setLicenseCookies,
  setProfileCompleteCookie,
} from "@/lib/license/require-license";

/** Vérifie et confirme un paiement licence après retour Djomy */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const authToken = getAuthToken(req);
  if (!authToken) {
    return NextResponse.json({ error: true, message: "Connexion requise" }, { status: 401 });
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
  if (!order || order.auth_token !== authToken) {
    return NextResponse.json({ error: true, message: "Commande introuvable" }, { status: 404 });
  }

  if (order.payment_status === "paid" && order.license_card_id) {
    const card = data.license_cards.find((c) => c.id === order.license_card_id);
    const response = NextResponse.json({
      error: false,
      message: "Licence déjà activée",
      data: { status: "paid", license_card_id: order.license_card_id, code_text: card?.code_text },
    });
    if (card) {
      setLicenseCookies(response, order.device_id, card.id);
      setProfileCompleteCookie(response);
    }
    return response;
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
  const response = NextResponse.json({
    error: false,
    message: "Paiement confirmé — licence activée",
    data: {
      status: "paid",
      license_card_id: fulfilled.cardId,
      code_text: card?.code_text,
    },
  });

  if (card) {
    setLicenseCookies(response, order.device_id, card.id);
    setProfileCompleteCookie(response);
  }

  return response;
};
