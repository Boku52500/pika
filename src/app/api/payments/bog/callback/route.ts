import { bogCallbackEnvelopeSchema } from "@/server/payments/bog/schemas";
import { getBogCallbackPublicKeyPem } from "@/server/payments/bog/publicKey";
import { verifyBogCallbackSignature } from "@/server/payments/bog/signature";
import { logError, logInfo, logWarn } from "@/server/log";
import { reconcileBogPaymentDetails } from "@/server/payments/reconcile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("Callback-Signature") ?? request.headers.get("callback-signature") ?? "";

  if (!verifyBogCallbackSignature(rawBody, signature, getBogCallbackPublicKeyPem())) {
    logWarn("bog.callback_invalid_signature", { bytes: rawBody.byteLength });
    return Response.json({ ok: false }, { status: 400 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch {
    logWarn("bog.callback_received", { reason: "invalid_json" });
    return Response.json({ ok: false }, { status: 400 });
  }

  const parsed = bogCallbackEnvelopeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    logWarn("bog.callback_received", { reason: "invalid_payload" });
    return Response.json({ ok: false }, { status: 400 });
  }

  logInfo("bog.callback_received", {
    event: parsed.data.event,
    providerOrderId: parsed.data.body.order_id,
    externalOrderId: parsed.data.body.external_order_id,
    providerStatus: parsed.data.body.order_status.key,
  });

  try {
    const result = await reconcileBogPaymentDetails(parsed.data.body);
    if (!result) {
      return Response.json({ ok: true, matched: false }, { status: 200 });
    }
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    logError("bog.callback_received", { error, providerOrderId: parsed.data.body.order_id });
    return Response.json({ ok: false }, { status: 500 });
  }
}
