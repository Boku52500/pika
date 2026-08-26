import type { NavLink } from "@/types/product";

/**
 * Primary category navigation shown beneath the header.
 * Kept as flat links for now; each item is structured so a future mega-menu
 * (e.g. `children` grid per category) can be layered on without touching
 * the header itself.
 */
export const primaryNav: NavLink[] = [
  { id: "phones", name: "ტელეფონები", href: "/category/phones" },
  { id: "laptops", name: "ლეპტოპები", href: "/category/laptops" },
  { id: "tablets", name: "ტაბლეტები", href: "/category/tablets" },
  { id: "tv", name: "ტელევიზორები", href: "/category/tv" },
  { id: "monitors", name: "მონიტორები", href: "/category/monitors" },
  { id: "gaming", name: "გეიმინგი", href: "/category/gaming" },
  { id: "components", name: "კომპიუტერის ნაწილები", href: "/category/components" },
  { id: "accessories", name: "აქსესუარები", href: "/category/accessories" },
  { id: "audio", name: "აუდიო", href: "/category/audio" },
  { id: "smart-home", name: "სმარტ სახლი", href: "/category/smart-home" },
  { id: "network", name: "ქსელური მოწყობილობები", href: "/category/network" },
  { id: "deals", name: "აქციები", href: "/category/deals", highlight: true },
];
