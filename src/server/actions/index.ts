import "server-only";

export { registerCustomer, requestPasswordReset } from "@/server/actions/auth";
export { updateCustomerProfile, changeCustomerPassword } from "@/server/actions/profile";
export {
  listMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/server/actions/addresses";
export {
  listWishlistIds,
  listWishlistProducts,
  mergeWishlist,
  toggleWishlistItem,
  removeWishlistItem,
} from "@/server/actions/wishlist";
export { createOrder } from "@/server/actions/orders";
export { retryOrderPayment } from "@/server/payments/actions";
export { orderSubmissionSchema, type OrderSubmissionInput } from "@/server/validation/order";
export { addressInputSchema, type AddressInput } from "@/server/validation/address";
export { customerInputSchema, type CustomerInput } from "@/server/validation/customer";
