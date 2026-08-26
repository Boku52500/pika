import type { SavedAddress } from "@/types/account";
import type { DeliveryAddress } from "@/lib/checkout";
import { getCityLabel } from "@/lib/checkout";

type AddressLike = Pick<DeliveryAddress, "city" | "address" | "building" | "apartment" | "entrance" | "floor" | "notes">;

export function toDeliveryAddress(address: SavedAddress): DeliveryAddress {
  return {
    city: address.city,
    address: address.address,
    building: address.building,
    apartment: address.apartment,
    entrance: address.entrance,
    floor: address.floor,
    notes: address.notes,
  };
}

/** Display lines for a saved or checkout address — city, street, then optional building details. */
export function formatAddressLines(address: AddressLike | null | undefined): string[] {
  if (!address) return [];
  const extras = [
    address.building ? `კორპუსი ${address.building}` : "",
    address.apartment ? `ბინა ${address.apartment}` : "",
    address.entrance ? `სადარბაზო ${address.entrance}` : "",
    address.floor ? `სართული ${address.floor}` : "",
  ].filter(Boolean);

  return [getCityLabel(address.city), address.address, extras.join(" · "), address.notes].filter(Boolean);
}
