import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

const money = z.number().nonnegative().finite();

const localeCopy = z.object({
  name: z.string().trim().min(1).max(200),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().optional(),
  seoTitle: z.string().trim().max(255).optional(),
  seoDescription: z.string().trim().max(500).optional(),
});

export const productInputSchema = z
  .object({
    sku: z.string().trim().min(1).max(64),
    slug,
    brandId: z.string().trim().min(1),
    categoryId: z.string().trim().min(1),
    price: money,
    previousPrice: money.nullable().optional(),
    stockQuantity: z.number().int().min(0),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isNew: z.boolean().optional(),
    indexable: z.boolean().optional(),
    canonicalOverride: z.string().trim().max(512).nullable().optional(),
    translations: z.object({
      ka: localeCopy,
      en: localeCopy.optional(),
      ru: localeCopy.optional(),
    }),
  })
  .refine((data) => data.previousPrice == null || data.previousPrice >= data.price, {
    message: "previousPrice should be greater than or equal to price when set",
    path: ["previousPrice"],
  });

export type ProductInput = z.infer<typeof productInputSchema>;
