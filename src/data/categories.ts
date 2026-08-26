import type { Category } from "@/types/product";

/** Featured category shortcuts shown on the homepage. */
export const featuredCategories: Category[] = [
  { id: "phones", name: "ტელეფონები", href: "/category/phones", visual: "phone", productCount: 412 },
  { id: "laptops", name: "ლეპტოპები", href: "/category/laptops", visual: "laptop", productCount: 268 },
  { id: "tablets", name: "ტაბლეტები", href: "/category/tablets", visual: "tablet", productCount: 134 },
  { id: "tv", name: "ტელევიზორები", href: "/category/tv", visual: "tv", productCount: 156 },
  { id: "monitors", name: "მონიტორები", href: "/category/monitors", visual: "monitor", productCount: 189 },
  { id: "gaming", name: "გეიმინგი", href: "/category/gaming", visual: "gaming", productCount: 231 },
  { id: "audio", name: "აუდიო", href: "/category/audio", visual: "audio", productCount: 298 },
  { id: "smart-home", name: "სმარტ სახლი", href: "/category/smart-home", visual: "smart-home", productCount: 97 },
];

/**
 * Full category catalogue (mirrors `primaryNav` ids) used by the category
 * (PLP) route so every nav/footer link resolves to a real page, even for
 * categories that don't yet have a dedicated homepage shortcut.
 */
export const allCategories: Category[] = [
  {
    id: "phones",
    name: "ტელეფონები",
    href: "/category/phones",
    visual: "phone",
    productCount: 412,
    description: "სმარტფონები Apple, Samsung, Xiaomi და სხვა წამყვანი ბრენდებისგან — ორიგინალი პროდუქცია ოფიციალური გარანტიით.",
  },
  {
    id: "laptops",
    name: "ლეპტოპები",
    href: "/category/laptops",
    visual: "laptop",
    productCount: 268,
    description: "ლეპტოპები სამუშაოსთვის, სწავლისთვის და გეიმინგისთვის — მსუბუქი ულტრაბუქებიდან მძლავრ სამუშაო სადგურებამდე.",
  },
  {
    id: "tablets",
    name: "ტაბლეტები",
    href: "/category/tablets",
    visual: "tablet",
    productCount: 134,
    description: "ტაბლეტები გართობისთვის, შემოქმედებისთვის და პროდუქტიულობისთვის.",
  },
  {
    id: "tv",
    name: "ტელევიზორები",
    href: "/category/tv",
    visual: "tv",
    productCount: 156,
    description: "OLED და 4K ტელევიზორები საუკეთესო სურათისა და ხმის ხარისხით შენი სახლისთვის.",
  },
  {
    id: "monitors",
    name: "მონიტორები",
    href: "/category/monitors",
    visual: "monitor",
    productCount: 189,
    description: "მონიტორები სამუშაოსთვის და გეიმინგისთვის — მაღალი განახლების სიხშირით და ზუსტი ფერგადაცემით.",
  },
  {
    id: "gaming",
    name: "გეიმინგი",
    href: "/category/gaming",
    visual: "gaming",
    productCount: 231,
    description: "გეიმინგ ლეპტოპები, კონსოლები და აქსესუარები საუკეთესო თამაშის გამოცდილებისთვის.",
  },
  {
    id: "components",
    name: "კომპიუტერის ნაწილები",
    href: "/category/components",
    visual: "components",
    productCount: 174,
    description: "პროცესორები, დედაპლატები, ვიდეობარათები და სხვა კომპონენტები კომპიუტერის ასაწყობად.",
  },
  {
    id: "accessories",
    name: "აქსესუარები",
    href: "/category/accessories",
    visual: "accessory",
    productCount: 203,
    description: "მაუსები, კლავიატურები და სხვა აქსესუარები ყოველდღიური გამოყენებისთვის.",
  },
  {
    id: "audio",
    name: "აუდიო",
    href: "/category/audio",
    visual: "audio",
    productCount: 298,
    description: "საყურეები, დინამიკები და აუდიო სისტემები საუკეთესო ხმის ხარისხისთვის.",
  },
  {
    id: "smart-home",
    name: "სმარტ სახლი",
    href: "/category/smart-home",
    visual: "smart-home",
    productCount: 97,
    description: "სმარტ განათება, სენსორები და მოწყობილობები, რომლებიც შენს სახლს უფრო მოსახერხებელს ხდის.",
  },
  {
    id: "network",
    name: "ქსელური მოწყობილობები",
    href: "/category/network",
    visual: "network",
    productCount: 88,
    description: "როუტერები და მეშ Wi-Fi სისტემები სტაბილური და სწრაფი ინტერნეტისთვის.",
  },
  {
    id: "deals",
    name: "აქციები",
    href: "/category/deals",
    visual: "phone",
    description: "შეზღუდული დროით მოქმედი ფასდაკლებები ტექნიკის ყველა კატეგორიაზე.",
  },
];
