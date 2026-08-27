"use server";

import { cookies, headers } from "next/headers";
import { prisma } from "@/server/db";
import { getSessionCustomer } from "@/server/auth/session";
import { clientIpFromHeaders, consumeRateLimit } from "@/server/auth/rateLimit";
import { logError } from "@/server/log";
import { orderSubmissionSchema } from "@/server/validation/order";
import { firstZodMessage } from "@/server/actions/helpers";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { moneyToNumber, numberToMoney } from "@/server/money";
import { deliveryMethods, getDeliveryMethodFee } from "@/lib/checkout";
import { DEFAULT_LOCALE } from "@/server/locale";
import { ORDER_CONFIRM_COOKIE } from "@/server/account/orders";
import { asProductVisual, asTone } from "@/lib/orderView";
import { randomBytes } from "node:crypto";
import { bogConfigured, BOG_NOT_CONFIGURED_MESSAGE } from "@/server/payments/bog/config";
import { createPendingCardPayment, PaymentUserError, startBogPaymentForOrder } from "@/server/payments/initiate";
import { scheduleEmail } from "@/server/email/schedule";
import { notifyOrderConfirmation } from "@/server/email/notify";

class OrderUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderUserError";
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const nonce = randomBytes(2).toString("hex").toUpperCase();
  return `PIKA-${stamp}-${nonce}`;
}

function pickName(translations: { locale: string; name: string }[], fallback: string): string {
  return translations.find((row) => row.locale === DEFAULT_LOCALE)?.name ?? translations[0]?.name ?? fallback;
}

type SelectedAxis = { attributeSlug: string; optionSlug: string };

function variantMatches(
  variant: {
    options: Array<{
      option: { slug: string; attribute: { slug: string } };
    }>;
  },
  selected: SelectedAxis[],
): boolean {
  if (variant.options.length !== selected.length) return false;
  return selected.every((sel) =>
    variant.options.some(
      (entry) => entry.option.attribute.slug === sel.attributeSlug && entry.option.slug === sel.optionSlug,
    ),
  );
}

export async function createOrder(
  input: unknown,
): Promise<ActionResult<{ orderNumber: string; redirectUrl?: string }>> {
  const parsed = orderSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  const session = await getSessionCustomer();
  const payload = parsed.data;
  const ip = clientIpFromHeaders(await headers());
  if (!(await consumeRateLimit(`checkout:ip:${ip}`, 20, 15 * 60 * 1000))) {
    return { ok: false, message: "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით." };
  }
  if (payload.paymentMethod === "card") {
    if (!(await consumeRateLimit(`payment:ip:${ip}`, 10, 15 * 60 * 1000))) {
      return { ok: false, message: "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით." };
    }
    if (!bogConfigured()) {
      return { ok: false, message: BOG_NOT_CONFIGURED_MESSAGE };
    }
  }
  const promoCode = payload.promoCode?.trim().toUpperCase() || null;

  try {
    const placed = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(payload.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: {
          translations: true,
          brand: { include: { translations: true } },
          variants: {
            where: { isActive: true },
            include: {
              options: {
                include: {
                  option: {
                    include: {
                      translations: true,
                      attribute: { include: { translations: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (products.length !== productIds.length) {
        throw new OrderUserError("ერთ-ერთი პროდუქტი აღარ არის ხელმისაწვდომი.");
      }

      const byId = new Map(products.map((product) => [product.id, product]));
      const lineSnapshots: Array<{
        productId: string;
        productName: string;
        sku: string;
        selectedVariants: object;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
        variantId: string | null;
      }> = [];

      for (const item of payload.items) {
        const product = byId.get(item.productId);
        if (!product) throw new OrderUserError("ერთ-ერთი პროდუქტი აღარ არის ხელმისაწვდომი.");

        const selected = item.selectedVariants ?? [];
        const productName = pickName(product.translations, product.slug);
        const brandName = pickName(product.brand.translations, "");
        const visual = asProductVisual(product.illustrationKey);
        const tone = asTone(product.illustrationTone);

        let unitPrice = moneyToNumber(product.price);
        let sku = product.sku;
        let stock = product.stockQuantity;
        let variantId: string | null = null;
        let axes: Array<{ attributeSlug: string; attributeLabel: string; optionSlug: string; optionLabel: string }> =
          [];

        if (product.variants.length > 0) {
          const match = product.variants.find((variant) => variantMatches(variant, selected));
          if (!match) {
            throw new OrderUserError(`${productName} — არჩეული ვარიანტი აღარ არის ხელმისაწვდომი.`);
          }
          variantId = match.id;
          sku = match.sku;
          stock = match.stockQuantity;
          unitPrice = moneyToNumber(match.priceOverride ?? product.price);
          axes = match.options.map((entry) => ({
            attributeSlug: entry.option.attribute.slug,
            attributeLabel: pickName(entry.option.attribute.translations, entry.option.attribute.slug),
            optionSlug: entry.option.slug,
            optionLabel: pickName(entry.option.translations, entry.option.slug),
          }));
        }

        if (item.quantity > stock) {
          throw new OrderUserError(`სამწუხაროდ, ${productName} ამჟამად არ არის საკმარისი რაოდენობით.`);
        }

        if (variantId) {
          const updated = await tx.productVariant.updateMany({
            where: { id: variantId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (updated.count !== 1) {
            throw new OrderUserError(`სამწუხაროდ, ${productName} ამჟამად არ არის საკმარისი რაოდენობით.`);
          }
        } else {
          const updated = await tx.product.updateMany({
            where: { id: product.id, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (updated.count !== 1) {
            throw new OrderUserError(`სამწუხაროდ, ${productName} ამჟამად არ არის საკმარისი რაოდენობით.`);
          }
        }

        const lineTotal = round2(unitPrice * item.quantity);
        lineSnapshots.push({
          productId: product.id,
          productName,
          sku,
          selectedVariants: {
            axes,
            brand: brandName,
            slug: product.slug,
            visual,
            tone,
          },
          unitPrice,
          quantity: item.quantity,
          lineTotal,
          variantId,
        });
      }

      const subtotal = round2(lineSnapshots.reduce((sum, line) => sum + line.lineTotal, 0));
      let discount = 0;
      let storedPromo: string | null = null;

      if (promoCode) {
        const promotion = await tx.promotion.findFirst({
          where: { code: promoCode, isActive: true },
        });
        const now = new Date();
        const inWindow =
          Boolean(promotion) &&
          (!promotion?.startsAt || promotion.startsAt <= now) &&
          (!promotion?.endsAt || promotion.endsAt >= now);
        const underLimit = !promotion?.usageLimit || promotion.usedCount < promotion.usageLimit;
        const minOk =
          !promotion?.minOrderAmount || subtotal >= moneyToNumber(promotion.minOrderAmount);

        if (!promotion || !inWindow || !underLimit || !minOk) {
          throw new OrderUserError("პრომოკოდი არასწორია ან ვადაგასულია");
        }

        if (promotion.type === "percentage") {
          discount = round2(subtotal * (moneyToNumber(promotion.value) / 100));
        } else {
          discount = Math.min(subtotal, moneyToNumber(promotion.value));
        }
        storedPromo = promotion.code;
        await tx.promotion.update({
          where: { id: promotion.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const payableSubtotal = Math.max(0, round2(subtotal - discount));
      const delivery = deliveryMethods.find((method) => method.id === payload.deliveryMethod);
      if (!delivery) throw new OrderUserError("აირჩიეთ მიწოდების მეთოდი");
      const deliveryFee = getDeliveryMethodFee(delivery, payableSubtotal);
      const total = Math.max(0, round2(payableSubtotal + deliveryFee));

      let number = generateOrderNumber();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await tx.order.findUnique({ where: { orderNumber: number }, select: { id: true } });
        if (!clash) break;
        number = generateOrderNumber();
      }

      const order = await tx.order.create({
        data: {
          orderNumber: number,
          customerId: session?.id ?? null,
          customerFirstName: payload.customer.firstName,
          customerLastName: payload.customer.lastName,
          customerEmail: payload.customer.email,
          customerPhone: payload.customer.phone,
          city: payload.address.city,
          street: payload.address.street,
          building: payload.address.building,
          apartment: payload.address.apartment,
          entrance: payload.address.entrance,
          floor: payload.address.floor,
          additionalInfo: payload.address.additionalInfo,
          deliveryMethod: payload.deliveryMethod,
          paymentMethod: payload.paymentMethod,
          paymentStatus: payload.paymentMethod === "card" ? "pending" : "unpaid",
          orderStatus: "pending",
          subtotal: numberToMoney(subtotal),
          discount: numberToMoney(discount),
          deliveryFee: numberToMoney(deliveryFee),
          total: numberToMoney(total),
          promoCode: storedPromo,
          installmentMonths: payload.paymentMethod === "installment" ? payload.installmentMonths ?? null : null,
          items: {
            create: lineSnapshots.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              sku: line.sku,
              selectedVariants: line.selectedVariants,
              unitPrice: numberToMoney(line.unitPrice),
              quantity: line.quantity,
              lineTotal: numberToMoney(line.lineTotal),
            })),
          },
        },
      });

      if (payload.paymentMethod === "card") {
        await createPendingCardPayment(tx, { id: order.id, total: order.total });
      }

      return { orderNumber: order.orderNumber, orderId: order.id, paymentMethod: payload.paymentMethod };
    });

    const jar = await cookies();
    jar.set(ORDER_CONFIRM_COOKIE, placed.orderNumber, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });

    scheduleEmail(() => notifyOrderConfirmation(placed.orderId));

    if (placed.paymentMethod === "card") {
      try {
        const { redirectUrl } = await startBogPaymentForOrder(placed.orderId);
        return { ok: true, data: { orderNumber: placed.orderNumber, redirectUrl } };
      } catch (error) {
        if (error instanceof PaymentUserError) {
          return { ok: false, message: error.message, orderNumber: placed.orderNumber };
        }
        logError("order.payment_start_failed", { error, orderNumber: placed.orderNumber });
        return { ok: false, message: GENERIC_SERVER_ERROR, orderNumber: placed.orderNumber };
      }
    }

    return { ok: true, data: { orderNumber: placed.orderNumber } };
  } catch (error) {
    if (error instanceof OrderUserError) {
      return { ok: false, message: error.message };
    }
    logError("order.create_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}
