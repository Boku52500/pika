import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

/** Client-facing address shape (`address` = street, `notes` = additionalInfo). */
export const addressInputSchema = z.object({
  label: optionalText(80),
  city: z.string().trim().min(1, "აირჩიეთ ქალაქი").max(80),
  address: z.string().trim().min(1, "შეიყვანეთ მისამართი").max(200),
  building: optionalText(40),
  apartment: optionalText(40),
  entrance: optionalText(40),
  floor: optionalText(20),
  notes: optionalText(500),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressInputSchema>;
