import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { moneyToNumber, tetriToNumber } from "@/server/money";
import {
  confirmedRefundedTetri,
  isRefundablePaymentStatus,
  remainingRefundableTetri,
} from "@/server/payments/refundable";
import { LOW_STOCK_THRESHOLD } from "@/server/admin/stock";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export async function getAdminDashboard() {
  const pendingStatuses: OrderStatus[] = ["pending", "confirmed", "processing"];

  const [
    productCount,
    activeProductCount,
    lowStockCount,
    outOfStockCount,
    orderCount,
    pendingOrderCount,
    recentOrders,
    paidTotals,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({
      where: { stockQuantity: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
    }),
    prisma.product.count({ where: { stockQuantity: { lte: 0 } } }),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: { in: pendingStatuses } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: "paid" },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return {
    productCount,
    activeProductCount,
    lowStockCount,
    outOfStockCount,
    orderCount,
    pendingOrderCount,
    paidOrderCount: paidTotals._count,
    paidOrderTotal: paidTotals._sum.total == null ? 0 : moneyToNumber(paidTotals._sum.total),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
      isGuest: !order.customerId,
      itemCount: order._count.items,
      total: moneyToNumber(order.total),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
    })),
  };
}

export type AdminOrderListFilters = {
  q?: string;
  orderStatus?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
  page?: number;
};

export const ADMIN_ORDER_PAGE_SIZE = 20;

export async function listAdminOrders(filters: AdminOrderListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = ADMIN_ORDER_PAGE_SIZE;
  const q = filters.q?.trim();
  const where: Prisma.OrderWhereInput = {};

  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { customerFirstName: { contains: q, mode: "insensitive" } },
      { customerLastName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filters.orderStatus && filters.orderStatus !== "all") {
    where.orderStatus = filters.orderStatus;
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    where.paymentStatus = filters.paymentStatus;
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      isGuest: !order.customerId,
      itemCount: order._count.items,
      total: moneyToNumber(order.total),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      deliveryMethod: order.deliveryMethod,
    })),
  };
}

type VariantAxis = {
  attributeSlug?: string;
  attributeLabel?: string;
  optionSlug?: string;
  optionLabel?: string;
};

type ItemSnapshot = {
  axes?: VariantAxis[];
  brand?: string;
  slug?: string;
  visual?: string;
  tone?: number;
};

function parseSnapshot(value: unknown): ItemSnapshot {
  if (!value || typeof value !== "object") return {};
  return value as ItemSnapshot;
}

export async function getAdminOrder(id: string) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { orderNumber: id }] },
    include: {
      items: true,
      customer: { select: { id: true, email: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { refunds: { orderBy: { createdAt: "desc" } } },
      },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    customerId: order.customerId,
    isGuest: !order.customerId,
    customerAccountEmail: order.customer?.email ?? null,
    customerFirstName: order.customerFirstName,
    customerLastName: order.customerLastName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    city: order.city,
    street: order.street,
    building: order.building,
    apartment: order.apartment,
    entrance: order.entrance,
    floor: order.floor,
    additionalInfo: order.additionalInfo,
    deliveryMethod: order.deliveryMethod,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    subtotal: moneyToNumber(order.subtotal),
    discount: moneyToNumber(order.discount),
    deliveryFee: moneyToNumber(order.deliveryFee),
    total: moneyToNumber(order.total),
    promoCode: order.promoCode,
    installmentMonths: order.installmentMonths,
    payments: order.payments.map((payment) => {
      const refunds = payment.refunds.map((refund) => ({
        id: refund.id,
        amount: moneyToNumber(refund.amount),
        status: refund.status,
        providerActionId: refund.providerActionId,
        providerStatus: refund.providerStatus,
        providerMessage: refund.providerMessage,
        adminNote: refund.adminNote,
        lastError: refund.lastError,
        createdAt: refund.createdAt.toISOString(),
        completedAt: refund.completedAt?.toISOString() ?? null,
      }));
      const refundedTetri = confirmedRefundedTetri({
        refunds: payment.refunds,
        providerRefundAmount: payment.providerRefundAmount,
      });
      const remainingTetri = remainingRefundableTetri({
        paymentAmount: payment.amount,
        paymentStatus: payment.status,
        refunds: payment.refunds,
        providerRefundAmount: payment.providerRefundAmount,
      });
      const canRefund =
        payment.provider === "bog" &&
        Boolean(payment.providerOrderId) &&
        isRefundablePaymentStatus(payment.status) &&
        remainingTetri > 0;
      return {
        id: payment.id,
        provider: payment.provider,
        providerOrderId: payment.providerOrderId,
        status: payment.status,
        providerStatus: payment.providerStatus,
        method: payment.method,
        amount: moneyToNumber(payment.amount),
        refundedAmount: tetriToNumber(refundedTetri),
        remainingAmount: tetriToNumber(remainingTetri),
        canRefund,
        currency: payment.currency,
        transactionId: payment.transactionId,
        authCode: payment.authCode,
        responseCode: payment.responseCode,
        responseDescription: payment.responseDescription,
        rejectReason: payment.rejectReason,
        lastError: payment.lastError,
        createdAt: payment.createdAt.toISOString(),
        completedAt: payment.completedAt?.toISOString() ?? null,
        refunds,
      };
    }),
    items: order.items.map((item) => {
      const snapshot = parseSnapshot(item.selectedVariants);
      const axes = Array.isArray(snapshot.axes) ? snapshot.axes : [];
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: moneyToNumber(item.unitPrice),
        lineTotal: moneyToNumber(item.lineTotal),
        visual: snapshot.visual ?? null,
        tone: snapshot.tone ?? 1,
        slug: snapshot.slug ?? null,
        brand: snapshot.brand ?? null,
        variants: axes.map((axis) => ({
          attribute: axis.attributeLabel || axis.attributeSlug || "",
          option: axis.optionLabel || axis.optionSlug || "",
        })),
      };
    }),
  };
}
