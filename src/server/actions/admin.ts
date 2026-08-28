"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireAdminAction } from "@/server/auth/admin";
import { logError } from "@/server/log";
import { firstZodMessage, isUniqueConstraintError } from "@/server/actions/helpers";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import {
  adminBrandSaveSchema,
  adminCategorySaveSchema,
  adminIdSchema,
  adminOrderStatusSchema,
  adminProductImageAltSchema,
  adminProductImageReorderSchema,
  adminProductSaveSchema,
  adminPromotionSaveSchema,
} from "@/server/validation/admin";
import { parseMoneyInput } from "@/server/money";
import { stockStateFromQuantity } from "@/server/admin/stock";
import { categoryWouldCycle } from "@/server/admin/categories";
import { revalidateCatalogue, revalidateOrders, revalidatePromotions } from "@/server/admin/revalidate";
import { scheduleEmail } from "@/server/email/schedule";
import { notifyOrderStatus } from "@/server/email/notify";
import { shouldSendOrderStatusEmail } from "@/server/email/events";
import { applyInventoryEvent } from "@/server/commerce/inventory";
import { applyPromoEvent } from "@/server/commerce/promoRedemption";
import { PRODUCT_IMAGE_MAX_BYTES } from "@/lib/productImageLimits";
import {
  STORAGE_NOT_CONFIGURED,
  createProductImageObjectKey,
  deleteProductImageObject,
  getR2Config,
  processProductImage,
  ProductImageValidationError,
  publicUrlForObjectKey,
  putProductImageObject,
} from "@/server/storage";

function uniqueMessage(error: unknown): string | null {
  if (isUniqueConstraintError(error, "sku")) return "ეს SKU უკვე გამოიყენება";
  if (isUniqueConstraintError(error, "slug")) return "ეს slug უკვე გამოიყენება";
  if (isUniqueConstraintError(error, "code")) return "ეს პრომოკოდი უკვე არსებობს";
  if (isUniqueConstraintError(error)) return "ეს ჩანაწერი უკვე არსებობს";
  return null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseOptionalMoney(raw: string | undefined): Prisma.Decimal | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  return parseMoneyInput(value);
}

function parseOptionalDate(raw: string | undefined): Date | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseOptionalInt(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n)) return null;
  return n;
}

function specNumeric(value: string): Prisma.Decimal | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return new Prisma.Decimal(normalized);
}

async function upsertLocaleCopy(
  tx: Prisma.TransactionClient,
  productId: string,
  locale: "ka" | "en" | "ru",
  copy: {
    name: string;
    shortDescription?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    warranty?: string;
    deliveryEstimate?: string;
  },
  required: boolean,
) {
  const name = copy.name.trim();
  if (!name) {
    if (required) return;
    await tx.productTranslation.deleteMany({ where: { productId, locale } });
    return;
  }

  await tx.productTranslation.upsert({
    where: { productId_locale: { productId, locale } },
    create: {
      productId,
      locale,
      name,
      shortDescription: emptyToNull(copy.shortDescription),
      description: emptyToNull(copy.description),
      seoTitle: emptyToNull(copy.seoTitle),
      seoDescription: emptyToNull(copy.seoDescription),
      warranty: emptyToNull(copy.warranty),
      deliveryEstimate: emptyToNull(copy.deliveryEstimate),
    },
    update: {
      name,
      shortDescription: emptyToNull(copy.shortDescription),
      description: emptyToNull(copy.description),
      seoTitle: emptyToNull(copy.seoTitle),
      seoDescription: emptyToNull(copy.seoDescription),
      warranty: emptyToNull(copy.warranty),
      deliveryEstimate: emptyToNull(copy.deliveryEstimate),
    },
  });
}

export async function saveAdminProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;

  const parsed = adminProductSaveSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  const data = parsed.data;
  const price = parseMoneyInput(data.price);
  const previousPrice = parseOptionalMoney(data.previousPrice);
  const badgeKind = emptyToNull(data.badgeKind);
  const stockStatus = data.stockStatus ?? stockStateFromQuantity(data.stockQuantity);

  try {
    const [brand, category] = await Promise.all([
      prisma.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }),
      prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
    ]);
    if (!brand) return { ok: false, message: "ბრენდი ვერ მოიძებნა", fieldErrors: { brandId: "აირჩიეთ არსებული ბრენდი" } };
    if (!category) {
      return { ok: false, message: "კატეგორია ვერ მოიძებნა", fieldErrors: { categoryId: "აირჩიეთ არსებული კატეგორია" } };
    }

    const saved = await prisma.$transaction(async (tx) => {
      const productData = {
        sku: data.sku,
        slug: data.slug,
        brandId: data.brandId,
        categoryId: data.categoryId,
        price,
        previousPrice,
        stockQuantity: data.stockQuantity,
        stockStatus,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        featuredSort: data.isFeatured ? (data.featuredSort ?? 0) : null,
        newArrivalSort: data.isNew ? (data.newArrivalSort ?? 0) : null,
        badgeKind,
        badgeLabel: badgeKind ? emptyToNull(data.badgeLabel) : null,
        indexable: data.indexable,
        warrantyMonths: data.warrantyMonths ?? null,
        returnDays: data.returnDays ?? null,
      };

      const product = data.id
        ? await tx.product.update({ where: { id: data.id }, data: productData })
        : await tx.product.create({ data: productData });

      await upsertLocaleCopy(tx, product.id, "ka", data.translations.ka, true);
      if (data.translations.en) await upsertLocaleCopy(tx, product.id, "en", data.translations.en, false);
      if (data.translations.ru) await upsertLocaleCopy(tx, product.id, "ru", data.translations.ru, false);

      const incomingImageIds = data.images.map((image) => image.id).filter((id): id is string => Boolean(id));
      const staleImages = await tx.productImage.findMany({
        where: {
          productId: product.id,
          ...(incomingImageIds.length ? { id: { notIn: incomingImageIds } } : {}),
        },
        select: { objectKey: true },
      });
      await tx.productImage.deleteMany({
        where: {
          productId: product.id,
          ...(incomingImageIds.length ? { id: { notIn: incomingImageIds } } : {}),
        },
      });

      for (const [index, image] of data.images.entries()) {
        const sortOrder = image.sortOrder ?? index;
        const alt = image.alt.trim() || data.translations.ka.name;
        if (image.id) {
          const existing = await tx.productImage.findFirst({
            where: { id: image.id, productId: product.id },
            select: { id: true, url: true, objectKey: true },
          });
          if (!existing) continue;
          await tx.productImage.update({
            where: { id: existing.id },
            data: {
              sortOrder,
              url: existing.objectKey ? existing.url : image.url.trim(),
            },
          });
          await tx.productImageTranslation.upsert({
            where: { imageId_locale: { imageId: existing.id, locale: "ka" } },
            create: { imageId: existing.id, locale: "ka", alt },
            update: { alt },
          });
        } else {
          const created = await tx.productImage.create({
            data: {
              productId: product.id,
              url: image.url.trim(),
              sortOrder,
              translations: { create: { locale: "ka", alt } },
            },
          });
          incomingImageIds.push(created.id);
        }
      }

      const incomingVariantIds = data.variants.map((variant) => variant.id).filter((id): id is string => Boolean(id));
      await tx.productVariant.deleteMany({
        where: {
          productId: product.id,
          ...(incomingVariantIds.length ? { id: { notIn: incomingVariantIds } } : {}),
        },
      });

      for (const variant of data.variants) {
        const priceOverride = parseOptionalMoney(variant.priceOverride);
        const optionIds = [...new Set(variant.optionIds)];
        if (optionIds.length) {
          const options = await tx.variantAttributeOption.findMany({
            where: { id: { in: optionIds } },
            select: { id: true },
          });
          if (options.length !== optionIds.length) {
            throw new Error("INVALID_VARIANT_OPTION");
          }
        }

        const variantRow = variant.id
          ? await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                sku: variant.sku,
                priceOverride,
                stockQuantity: variant.stockQuantity,
                isActive: variant.isActive,
              },
            })
          : await tx.productVariant.create({
              data: {
                productId: product.id,
                sku: variant.sku,
                priceOverride,
                stockQuantity: variant.stockQuantity,
                isActive: variant.isActive,
              },
            });

        await tx.productVariantOption.deleteMany({ where: { variantId: variantRow.id } });
        if (optionIds.length) {
          await tx.productVariantOption.createMany({
            data: optionIds.map((optionId) => ({ variantId: variantRow.id, optionId })),
          });
        }
      }

      await tx.productSpecification.deleteMany({
        where: {
          productId: product.id,
          specificationId: { notIn: data.specifications.filter((row) => row.value.trim()).map((row) => row.specificationId) },
        },
      });

      for (const spec of data.specifications) {
        const value = spec.value.trim();
        if (!value) continue;
        await tx.productSpecification.upsert({
          where: {
            productId_specificationId: { productId: product.id, specificationId: spec.specificationId },
          },
          create: {
            productId: product.id,
            specificationId: spec.specificationId,
            value,
            numericValue: specNumeric(value),
          },
          update: { value, numericValue: specNumeric(value) },
        });
      }

      return {
        id: product.id,
        staleObjectKeys: staleImages.map((row) => row.objectKey).filter((key): key is string => Boolean(key)),
      };
    });

    for (const objectKey of saved.staleObjectKeys) {
      try {
        await deleteProductImageObject(objectKey);
      } catch (error) {
        logError("admin.r2_cleanup_after_save_failed", { error });
      }
    }

    revalidateCatalogue({ productSlug: data.slug });
    return { ok: true, data: { id: saved.id } };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_VARIANT_OPTION") {
      return { ok: false, message: "არჩეული ვარიანტის მნიშვნელობა არასწორია" };
    }
    const unique = uniqueMessage(error);
    if (unique) return { ok: false, message: unique };
    logError("admin.save_product_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function deactivateAdminProduct(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "პროდუქტი ვერ მოიძებნა" };

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true },
  });
  if (!product) return { ok: false, message: "პროდუქტი ვერ მოიძებნა" };

  await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
  revalidateCatalogue({ productSlug: product.slug });
  return { ok: true };
}

export async function saveAdminCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminCategorySaveSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }
  const data = parsed.data;
  const parentId = emptyToNull(data.parentId ?? "");

  if (data.id && parentId && (await categoryWouldCycle(data.id, parentId))) {
    return { ok: false, message: "კატეგორია ვერ იქნება საკუთარი მშობელი ან შთამომავალი", fieldErrors: { parentId: "აირჩიეთ სხვა მშობელი კატეგორია" } };
  }
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) return { ok: false, message: "მშობელი კატეგორია ვერ მოიძებნა", fieldErrors: { parentId: "აირჩიეთ არსებული კატეგორია" } };
  }

  const writeTranslations = async (tx: Prisma.TransactionClient, categoryId: string) => {
    await tx.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId, locale: "ka" } },
      create: {
        categoryId,
        locale: "ka",
        name: data.translations.ka.name,
        description: emptyToNull(data.translations.ka.description),
        seoTitle: emptyToNull(data.translations.ka.seoTitle),
        seoDescription: emptyToNull(data.translations.ka.seoDescription),
      },
      update: {
        name: data.translations.ka.name,
        description: emptyToNull(data.translations.ka.description),
        seoTitle: emptyToNull(data.translations.ka.seoTitle),
        seoDescription: emptyToNull(data.translations.ka.seoDescription),
      },
    });
    for (const locale of ["en", "ru"] as const) {
      const copy = data.translations[locale];
      const name = copy?.name?.trim() ?? "";
      if (!name) {
        await tx.categoryTranslation.deleteMany({ where: { categoryId, locale } });
        continue;
      }
      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId, locale } },
        create: {
          categoryId,
          locale,
          name,
          description: emptyToNull(copy?.description),
          seoTitle: emptyToNull(copy?.seoTitle),
          seoDescription: emptyToNull(copy?.seoDescription),
        },
        update: {
          name,
          description: emptyToNull(copy?.description),
          seoTitle: emptyToNull(copy?.seoTitle),
          seoDescription: emptyToNull(copy?.seoDescription),
        },
      });
    }
  };

  try {
    const id = await prisma.$transaction(async (tx) => {
      const payload = {
        slug: data.slug,
        parentId,
        imageUrl: emptyToNull(data.imageUrl),
        iconKey: emptyToNull(data.iconKey),
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        indexable: data.indexable,
      };
      const category = data.id
        ? await tx.category.update({ where: { id: data.id }, data: payload })
        : await tx.category.create({ data: payload });
      await writeTranslations(tx, category.id);
      return category.id;
    });
    revalidateCatalogue({ categorySlug: data.slug });
    return { ok: true, data: { id } };
  } catch (error) {
    const unique = uniqueMessage(error);
    if (unique) return { ok: false, message: unique };
    logError("admin.save_category_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function setAdminCategoryActive(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminIdSchema.extend({ isActive: adminCategorySaveSchema.shape.isActive }).safeParse({
    ...(typeof input === "object" && input ? input : {}),
  });
  if (!parsed.success) return { ok: false, message: "კატეგორია ვერ მოიძებნა" };

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true },
  });
  if (!category) return { ok: false, message: "კატეგორია ვერ მოიძებნა" };
  await prisma.category.update({ where: { id: category.id }, data: { isActive: parsed.data.isActive } });
  revalidateCatalogue({ categorySlug: category.slug });
  return { ok: true };
}

export async function saveAdminBrand(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminBrandSaveSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }
  const data = parsed.data;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const payload = {
        slug: data.slug,
        logoUrl: emptyToNull(data.logoUrl),
        indexable: data.indexable,
        sortOrder: data.sortOrder,
      };
      const brand = data.id
        ? await tx.brand.update({ where: { id: data.id }, data: payload })
        : await tx.brand.create({ data: payload });

      await tx.brandTranslation.upsert({
        where: { brandId_locale: { brandId: brand.id, locale: "ka" } },
        create: {
          brandId: brand.id,
          locale: "ka",
          name: data.translations.ka.name,
          description: emptyToNull(data.translations.ka.description),
          seoTitle: emptyToNull(data.translations.ka.seoTitle),
          seoDescription: emptyToNull(data.translations.ka.seoDescription),
        },
        update: {
          name: data.translations.ka.name,
          description: emptyToNull(data.translations.ka.description),
          seoTitle: emptyToNull(data.translations.ka.seoTitle),
          seoDescription: emptyToNull(data.translations.ka.seoDescription),
        },
      });

      for (const locale of ["en", "ru"] as const) {
        const copy = data.translations[locale];
        const name = copy?.name?.trim() ?? "";
        if (!name) {
          await tx.brandTranslation.deleteMany({ where: { brandId: brand.id, locale } });
          continue;
        }
        await tx.brandTranslation.upsert({
          where: { brandId_locale: { brandId: brand.id, locale } },
          create: {
            brandId: brand.id,
            locale,
            name,
            description: emptyToNull(copy?.description),
            seoTitle: emptyToNull(copy?.seoTitle),
            seoDescription: emptyToNull(copy?.seoDescription),
          },
          update: {
            name,
            description: emptyToNull(copy?.description),
            seoTitle: emptyToNull(copy?.seoTitle),
            seoDescription: emptyToNull(copy?.seoDescription),
          },
        });
      }

      return brand.id;
    });
    revalidateCatalogue({ brandSlug: data.slug });
    return { ok: true, data: { id } };
  } catch (error) {
    const unique = uniqueMessage(error);
    if (unique) return { ok: false, message: unique };
    logError("admin.save_brand_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function deleteAdminBrand(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "ბრენდი ვერ მოიძებნა" };

  const brand = await prisma.brand.findUnique({
    where: { id: parsed.data.id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) return { ok: false, message: "ბრენდი ვერ მოიძებნა" };
  if (brand._count.products > 0) {
    return {
      ok: false,
      message: `ბრენდის წაშლა შეუძლებელია — მასზე მიბმულია ${brand._count.products} პროდუქტი. შეცვალეთ პროდუქტების ბრენდი ან გამორთეთ პროდუქტები.`,
    };
  }

  try {
    await prisma.brand.delete({ where: { id: brand.id } });
    revalidateCatalogue();
    return { ok: true };
  } catch (error) {
    logError("admin.delete_brand_failed", { error });
    return { ok: false, message: "ბრენდის წაშლა ვერ მოხერხდა, რადგან მას სხვა ჩანაწერები უკავშირდება." };
  }
}

export async function saveAdminPromotion(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminPromotionSaveSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }
  const data = parsed.data;
  const code = data.code.trim().toUpperCase();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const payload = {
        code,
        type: data.type,
        value: parseMoneyInput(data.value),
        minOrderAmount: parseOptionalMoney(data.minOrderAmount),
        usageLimit: parseOptionalInt(data.usageLimit ?? null),
        startsAt: parseOptionalDate(data.startsAt),
        endsAt: parseOptionalDate(data.endsAt),
        isActive: data.isActive,
      };
      const promotion = data.id
        ? await tx.promotion.update({ where: { id: data.id }, data: payload })
        : await tx.promotion.create({ data: payload });

      await tx.promotionTranslation.upsert({
        where: { promotionId_locale: { promotionId: promotion.id, locale: "ka" } },
        create: {
          promotionId: promotion.id,
          locale: "ka",
          name: data.name,
          description: emptyToNull(data.description),
        },
        update: {
          name: data.name,
          description: emptyToNull(data.description),
        },
      });
      return promotion.id;
    });
    revalidatePromotions();
    return { ok: true, data: { id } };
  } catch (error) {
    const unique = uniqueMessage(error);
    if (unique) return { ok: false, message: unique };
    logError("admin.save_promotion_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function setAdminPromotionActive(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "აქცია ვერ მოიძებნა" };
  const isActive =
    typeof input === "object" && input && "isActive" in input ? Boolean((input as { isActive: unknown }).isActive) : null;
  if (isActive == null) return { ok: false, message: "არასწორი მოთხოვნა" };

  const promotion = await prisma.promotion.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
  if (!promotion) return { ok: false, message: "აქცია ვერ მოიძებნა" };
  await prisma.promotion.update({ where: { id: promotion.id }, data: { isActive } });
  revalidatePromotions();
  return { ok: true };
}

export async function updateAdminOrderStatus(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "შეკვეთის სტატუსი არასწორია" };
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true, orderStatus: true },
  });
  if (!order) return { ok: false, message: "შეკვეთა ვერ მოიძებნა" };

  if (order.orderStatus === parsed.data.orderStatus) {
    return { ok: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { orderStatus: parsed.data.orderStatus },
    });
    if (parsed.data.orderStatus === "cancelled") {
      await applyInventoryEvent(tx, order.id, "unpaid_terminal");
      await applyPromoEvent(tx, order.id, "unpaid_terminal");
    }
  });
  revalidateOrders();
  if (shouldSendOrderStatusEmail(order.orderStatus, parsed.data.orderStatus)) {
    scheduleEmail(() => notifyOrderStatus(order.id, parsed.data.orderStatus));
  }
  return { ok: true };
}

export type AdminUploadedImage = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  objectKey: string | null;
};

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export async function uploadAdminProductImage(formData: FormData): Promise<ActionResult<AdminUploadedImage>> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;

  const config = getR2Config();
  if (!config) return { ok: false, message: STORAGE_NOT_CONFIGURED };

  const productId = String(formData.get("productId") ?? "").trim();
  const altRaw = String(formData.get("alt") ?? "").trim();
  const file = formData.get("file");
  if (!productId || !isUploadFile(file)) {
    return { ok: false, message: "ატვირთეთ სურათის ფაილი" };
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return { ok: false, message: "სურათი ძალიან დიდია (მაქსიმუმ 10 MB)" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      translations: { where: { locale: "ka" }, select: { name: true } },
    },
  });
  if (!product) return { ok: false, message: "პროდუქტი ვერ მოიძებნა" };

  const bytes = Buffer.from(await file.arrayBuffer());
  let processed: Buffer;
  try {
    processed = await processProductImage(bytes);
  } catch (error) {
    if (error instanceof ProductImageValidationError) return { ok: false, message: error.message };
    logError("admin.process_image_failed", { error });
    return { ok: false, message: "სურათის დამუშავება ვერ მოხერხდა" };
  }

  let objectKey: string;
  try {
    objectKey = createProductImageObjectKey(product.id);
  } catch {
    return { ok: false, message: "პროდუქტის იდენტიფიკატორი არასწორია" };
  }

  try {
    await putProductImageObject(objectKey, processed);
  } catch (error) {
    logError("admin.r2_put_failed", { error });
    return { ok: false, message: "სურათის შენახვა საცავში ვერ მოხერხდა" };
  }

  const url = publicUrlForObjectKey(config.publicBaseUrl, objectKey);
  const alt = altRaw || product.translations[0]?.name || "";

  try {
    const created = await prisma.$transaction(async (tx) => {
      const maxSort = await tx.productImage.aggregate({
        where: { productId: product.id },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
      return tx.productImage.create({
        data: {
          productId: product.id,
          url,
          objectKey,
          sortOrder,
          translations: { create: { locale: "ka", alt } },
        },
      });
    });
    revalidateCatalogue({ productSlug: product.slug });
    return {
      ok: true,
      data: { id: created.id, url: created.url, alt, sortOrder: created.sortOrder, objectKey },
    };
  } catch (error) {
    logError("admin.product_image_insert_failed", { error });
    try {
      await deleteProductImageObject(objectKey);
    } catch (cleanupError) {
      logError("admin.r2_compensation_delete_failed", { error: cleanupError });
    }
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function deleteAdminProductImage(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "სურათი ვერ მოიძებნა" };

  const image = await prisma.productImage.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, objectKey: true, product: { select: { slug: true } } },
  });
  if (!image) return { ok: false, message: "სურათი ვერ მოიძებნა" };

  await prisma.productImage.delete({ where: { id: image.id } });
  if (image.objectKey) {
    try {
      await deleteProductImageObject(image.objectKey);
    } catch (error) {
      logError("admin.r2_delete_failed", { error });
    }
  }
  revalidateCatalogue({ productSlug: image.product.slug });
  return { ok: true };
}

export async function reorderAdminProductImages(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminProductImageReorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "სურათების რიგი არასწორია" };

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, slug: true, images: { select: { id: true } } },
  });
  if (!product) return { ok: false, message: "პროდუქტი ვერ მოიძებნა" };

  const existingIds = new Set(product.images.map((row) => row.id));
  if (parsed.data.orderedIds.length !== existingIds.size) {
    return { ok: false, message: "სურათების რიგი არ ემთხვევა არსებულ ჩანაწერებს" };
  }
  if (parsed.data.orderedIds.some((id) => !existingIds.has(id))) {
    return { ok: false, message: "სურათი ამ პროდუქტს არ ეკუთვნის" };
  }

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.productImage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  revalidateCatalogue({ productSlug: product.slug });
  return { ok: true };
}

export async function updateAdminProductImageAlt(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const parsed = adminProductImageAltSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Alt ტექსტი არასწორია" };

  const image = await prisma.productImage.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, product: { select: { slug: true, translations: { where: { locale: "ka" }, select: { name: true } } } } },
  });
  if (!image) return { ok: false, message: "სურათი ვერ მოიძებნა" };

  const alt = parsed.data.alt.trim() || image.product.translations[0]?.name || "";
  await prisma.productImageTranslation.upsert({
    where: { imageId_locale: { imageId: image.id, locale: "ka" } },
    create: { imageId: image.id, locale: "ka", alt },
    update: { alt },
  });
  revalidateCatalogue({ productSlug: image.product.slug });
  return { ok: true };
}

export async function adminSignOut() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/login" });
}
