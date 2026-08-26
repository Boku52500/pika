export { registerInputSchema, loginInputSchema, profileUpdateSchema, passwordChangeSchema } from "@/server/validation/auth";
export { productInputSchema, type ProductInput } from "@/server/validation/product";
export {
  adminProductSaveSchema,
  adminCategorySaveSchema,
  adminBrandSaveSchema,
  adminPromotionSaveSchema,
  adminOrderStatusSchema,
} from "@/server/validation/admin";
export { searchQueryInputSchema, type SearchQueryInput } from "@/server/validation/search";
export { customerInputSchema, type CustomerInput } from "@/server/validation/customer";
export { addressInputSchema, type AddressInput } from "@/server/validation/address";
export { orderSubmissionSchema, type OrderSubmissionInput } from "@/server/validation/order";
