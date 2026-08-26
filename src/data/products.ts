import type { Product } from "@/types/product";

/**
 * Warranty/delivery copy shared by every flagship PDP entry below, kept as
 * constants so the wording stays perfectly consistent across products.
 */
const standardDelivery = { estimate: "თბილისში — 1 დღეში, რეგიონებში — 1-დან 3 დღემდე", returnDays: 14 };

/**
 * Mock product catalogue. Shapes mirror what a real Product API would
 * eventually return, so this file can be swapped for a data-fetching layer
 * later without changing any UI component.
 */
export const featuredProducts: Product[] = [
  {
    id: "p-1",
    slug: "apple-iphone-15-pro-128",
    brand: "Apple",
    name: "iPhone 15 Pro 128GB",
    category: "phones",
    visual: "phone",
    tone: 4,
    secondaryVisual: "accessory",
    storage: "128GB",
    rating: 4.8,
    reviewCount: 342,
    price: 3299,
    previousPrice: 3799,
    installment: { months: 24, monthlyPrice: 138 },
    availability: "in-stock",
    badge: { kind: "bestseller" },
    sku: "MTQH3ZE/A",
    images: [
      { visual: "phone", tone: 4 },
      { visual: "accessory", tone: 3 },
      { visual: "phone", tone: 2 },
      { visual: "phone", tone: 5 },
    ],
    installmentOptions: [
      { months: 6, monthlyPrice: 550 },
      { months: 12, monthlyPrice: 275 },
      { months: 24, monthlyPrice: 138 },
    ],
    warranty: "24 თვე ოფიციალური გარანტია Apple-ისგან",
    shortDescription: "ტიტანის კორპუსი, A17 Pro ჩიპი და პროფესიონალური კამერის სისტემა — Apple-ის ყველაზე მძლავრი iPhone.",
    description:
      "iPhone 15 Pro აერთიანებს ავიაკოსმოსური ხარისხის ტიტანის კორპუსს, A17 Pro ჩიპსეტს და პროფესიონალურ სამკამერიან სისტემას 48MP მთავარი სენსორით. Action ღილაკი გაძლევთ სწრაფ წვდომას საყვარელ ფუნქციებზე, ხოლო USB-C პორტი მხარს უჭერს გადაცემის მაღალ სიჩქარეს. შესრულებული საქართველოში ოფიციალური იმპორტიორის მიერ, სრული საგარანტიო მხარდაჭერით.",
    keyFeatures: [
      "A17 Pro ჩიპი — უსწრაფესი შესრულება სმარტფონებში",
      "პროფესიონალური სამკამერიანი სისტემა 48MP გარჩევადობით",
      "ტიტანის კორპუსი — მსუბუქი და გამძლე",
      "Action ღილაკი სწრაფი წვდომისთვის",
      "USB-C პორტი USB 3 სიჩქარით",
      "Face ID უსაფრთხო ავტორიზაციისთვის",
    ],
    specs: [
      {
        group: "ზოგადი",
        items: [
          { label: "ბრენდი", value: "Apple" },
          { label: "მოდელი", value: "iPhone 15 Pro" },
          { label: "გამოშვების წელი", value: "2023" },
          { label: "ფერი", value: "ბუნებრივი ტიტანი" },
        ],
      },
      {
        group: "ეკრანი",
        items: [
          { label: "ზომა", value: "6.1\"" },
          { label: "ტექნოლოგია", value: "Super Retina XDR OLED" },
          { label: "განახლების სიხშირე", value: "120Hz (ProMotion)" },
          { label: "სიკაშკაშე", value: "2000 ნიტი (მაქს.)" },
        ],
      },
      {
        group: "პროცესორი",
        items: [
          { label: "ჩიპსეტი", value: "Apple A17 Pro" },
          { label: "CPU", value: "6 ბირთვი" },
          { label: "GPU", value: "6 ბირთვი" },
        ],
      },
      {
        group: "მეხსიერება",
        items: [
          { label: "შიდა მეხსიერება", value: "128GB" },
          { label: "ოპერატიული მეხსიერება", value: "8GB" },
          { label: "მეხსიერების გაფართოება", value: "არ არის" },
        ],
      },
      {
        group: "კამერა",
        items: [
          { label: "მთავარი კამერა", value: "48MP + 12MP + 12MP" },
          { label: "წინა კამერა", value: "12MP" },
          { label: "ვიდეო", value: "4K 60fps, ProRes" },
          { label: "ოპტიკური ზუმი", value: "3x" },
        ],
      },
      {
        group: "კავშირი",
        items: [
          { label: "SIM", value: "Nano-SIM + eSIM" },
          { label: "Wi-Fi", value: "Wi-Fi 6E" },
          { label: "Bluetooth", value: "5.3" },
          { label: "პორტი", value: "USB-C (USB 3)" },
        ],
      },
      {
        group: "ბატარეა",
        items: [
          { label: "ვიდეო დაკვრა", value: "23 საათამდე" },
          { label: "დამტენი", value: "MagSafe / USB-C, 20W სწრაფი დატენვა" },
        ],
      },
      {
        group: "ზომები",
        items: [
          { label: "წონა", value: "187გ" },
          { label: "მასალა", value: "ტიტანი და მინა" },
          { label: "წყალგამძლეობა", value: "IP68" },
        ],
      },
    ],
    whatsIncluded: ["iPhone 15 Pro", "USB-C to USB-C კაბელი", "SIM ამომღები ხელსაწყო", "დოკუმენტაცია"],
    delivery: standardDelivery,
    variants: [
      {
        id: "color",
        label: "ფერი",
        options: [
          { value: "natural", label: "ბუნებრივი ტიტანი", swatch: "#8f8a80" },
          { value: "blue", label: "ლურჯი ტიტანი", swatch: "#3c4a5c" },
          { value: "white", label: "თეთრი ტიტანი", swatch: "#e5e2da" },
          { value: "black", label: "შავი ტიტანი", swatch: "#2b2b2c" },
        ],
      },
      {
        id: "storage",
        label: "მეხსიერება",
        options: [
          { value: "128gb", label: "128GB" },
          { value: "256gb", label: "256GB" },
          { value: "512gb", label: "512GB" },
        ],
      },
    ],
    relatedIds: ["ph-2", "ph-3", "ph-4", "ph-7"],
  },
  {
    id: "p-2",
    slug: "samsung-galaxy-s24-256",
    brand: "Samsung",
    name: "Galaxy S24 256GB",
    category: "phones",
    visual: "phone",
    tone: 2,
    secondaryVisual: "accessory",
    storage: "256GB",
    ram: "8GB",
    rating: 4.6,
    reviewCount: 218,
    price: 2599,
    previousPrice: 2899,
    installment: { months: 24, monthlyPrice: 109 },
    availability: "in-stock",
  },
  {
    id: "p-3",
    slug: "asus-rog-strix-g16",
    brand: "ASUS",
    name: "ROG Strix G16 RTX 4060",
    category: "gaming",
    visual: "gaming",
    tone: 5,
    secondaryVisual: "keyboard",
    rating: 4.7,
    reviewCount: 96,
    price: 4199,
    previousPrice: 4799,
    installment: { months: 24, monthlyPrice: 175 },
    availability: "in-stock",
    badge: { kind: "custom", label: "გეიმერული არჩევანი" },
    sku: "G614JI-RTX4060",
    images: [
      { visual: "gaming", tone: 5 },
      { visual: "keyboard", tone: 4 },
      { visual: "gaming", tone: 3 },
      { visual: "components", tone: 5 },
    ],
    installmentOptions: [
      { months: 12, monthlyPrice: 350 },
      { months: 24, monthlyPrice: 175 },
      { months: 36, monthlyPrice: 117 },
    ],
    warranty: "24 თვე ოფიციალური გარანტია",
    shortDescription: "16\" QHD 240Hz დისპლეი, Intel Core i9 და RTX 4060 — მძლავრი გეიმინგ ლეპტოპი მაღალი კადრების სიხშირისთვის.",
    description:
      "ROG Strix G16 შექმნილია გამარჯვებისთვის — Intel Core i9-13980HX პროცესორი და NVIDIA GeForce RTX 4060 ერთად უზრუნველყოფენ სტაბილურ მაღალ FPS-ს თანამედროვე თამაშებში. 16-inch QHD+ ეკრანი 240Hz განახლების სიხშირით გადმოსცემს ყოველ დეტალს გამჭვირვალედ, ხოლო გაუმჯობესებული გაგრილების სისტემა ინარჩუნებს სტაბილურ შესრულებას ხანგრძლივი სესიების დროსაც.",
    keyFeatures: [
      "Intel Core i9-13980HX პროცესორი",
      "NVIDIA GeForce RTX 4060 8GB გრაფიკული ბარათი",
      "16\" QHD+ დისპლეი 240Hz განახლების სიხშირით",
      "32GB DDR5 ოპერატიული მეხსიერება",
      "გაუმჯობესებული 4-ვენტილატორიანი გაგრილების სისტემა",
      "RGB განათებადი კლავიატურა",
    ],
    specs: [
      {
        group: "ზოგადი",
        items: [
          { label: "ბრენდი", value: "ASUS" },
          { label: "სერია", value: "ROG Strix" },
          { label: "ოპერაციული სისტემა", value: "Windows 11 Home" },
        ],
      },
      {
        group: "ეკრანი",
        items: [
          { label: "ზომა", value: "16\"" },
          { label: "გარჩევადობა", value: "2560×1600 (QHD+)" },
          { label: "განახლების სიხშირე", value: "240Hz" },
        ],
      },
      {
        group: "პროცესორი",
        items: [
          { label: "მოდელი", value: "Intel Core i9-13980HX" },
          { label: "ბირთვები", value: "24 (8P + 16E)" },
          { label: "მაქს. სიხშირე", value: "5.6GHz" },
        ],
      },
      {
        group: "მეხსიერება",
        items: [
          { label: "ოპერატიული მეხსიერება", value: "32GB DDR5" },
          { label: "დისკი", value: "1TB NVMe SSD" },
          { label: "გრაფიკული ბარათი", value: "NVIDIA GeForce RTX 4060 8GB" },
        ],
      },
      {
        group: "კავშირი",
        items: [
          { label: "Wi-Fi", value: "Wi-Fi 6E" },
          { label: "Bluetooth", value: "5.3" },
          { label: "პორტები", value: "USB-C (Thunderbolt 4), 3× USB-A, HDMI 2.1" },
        ],
      },
      {
        group: "ბატარეა",
        items: [
          { label: "ტევადობა", value: "90Wh" },
          { label: "დამტენი", value: "240W ადაპტერი" },
        ],
      },
      {
        group: "ზომები",
        items: [
          { label: "წონა", value: "2.5კგ" },
          { label: "სისქე", value: "26.9მმ" },
        ],
      },
    ],
    whatsIncluded: ["ლეპტოპი ROG Strix G16", "240W დამტენი ადაპტერი", "დოკუმენტაცია"],
    delivery: standardDelivery,
    variants: [
      {
        id: "storage",
        label: "დისკი",
        options: [
          { value: "1tb", label: "1TB SSD" },
          { value: "2tb", label: "2TB SSD" },
        ],
      },
    ],
    relatedIds: ["p-10", "p-18", "p-19", "p-14"],
  },
  {
    id: "p-4",
    slug: "apple-macbook-air-m3",
    brand: "Apple",
    name: "MacBook Air 13\" M3 8/256",
    category: "laptops",
    visual: "laptop",
    tone: 1,
    storage: "256GB",
    ram: "8GB",
    rating: 4.9,
    reviewCount: 187,
    price: 3599,
    installment: { months: 24, monthlyPrice: 150 },
    availability: "in-stock",
    sku: "MRXQ3ZE/A",
    images: [
      { visual: "laptop", tone: 1 },
      { visual: "laptop", tone: 2 },
      { visual: "keyboard", tone: 1 },
      { visual: "laptop", tone: 5 },
    ],
    installmentOptions: [
      { months: 12, monthlyPrice: 300 },
      { months: 24, monthlyPrice: 150 },
    ],
    warranty: "24 თვე ოფიციალური გარანტია Apple-ისგან",
    shortDescription: "M3 ჩიპი, ვენტილატორის გარეშე, 18 საათამდე ბატარეა — ულტრამსუბუქი ლეპტოპი ყოველდღიური სამუშაოსთვის.",
    description:
      "MacBook Air 13\" M3 ჩიპით გთავაზობთ საოცარ შესრულებას სრულ სიჩუმეში — ვენტილატორის გარეშე დიზაინი ნიშნავს ხმაურის ან გახურების გარეშე მუშაობას. 13.6-inch Liquid Retina დისპლეი, 18 საათამდე ბატარეის ხანგრძლივობა და 1.24კგ წონა მას იდეალურ თანამგზავრად აქცევს სამუშაოსთვის, სწავლისა თუ შემოქმედებისთვის ნებისმიერ ადგილას.",
    keyFeatures: [
      "Apple M3 ჩიპი 8-ბირთვიანი CPU-ით",
      "ვენტილატორის გარეშე — სრულიად ჩუმი მუშაობა",
      "18 საათამდე ბატარეის ხანგრძლივობა",
      "13.6\" Liquid Retina დისპლეი",
      "1.24კგ წონა — მარტივად გადასატანი",
      "MagSafe დამტენი და 2× Thunderbolt/USB 4 პორტი",
    ],
    specs: [
      {
        group: "ზოგადი",
        items: [
          { label: "ბრენდი", value: "Apple" },
          { label: "მოდელი", value: "MacBook Air 13\" (M3, 2024)" },
          { label: "ოპერაციული სისტემა", value: "macOS" },
          { label: "ფერი", value: "ვარსკვლავური ნაცრისფერი" },
        ],
      },
      {
        group: "ეკრანი",
        items: [
          { label: "ზომა", value: "13.6\"" },
          { label: "ტექნოლოგია", value: "Liquid Retina" },
          { label: "გარჩევადობა", value: "2560×1664" },
        ],
      },
      {
        group: "პროცესორი",
        items: [
          { label: "ჩიპსეტი", value: "Apple M3" },
          { label: "CPU", value: "8 ბირთვი" },
          { label: "GPU", value: "8 ბირთვი" },
        ],
      },
      {
        group: "მეხსიერება",
        items: [
          { label: "ოპერატიული მეხსიერება", value: "8GB უნიფიცირებული" },
          { label: "დისკი", value: "256GB SSD" },
        ],
      },
      {
        group: "კავშირი",
        items: [
          { label: "Wi-Fi", value: "Wi-Fi 6E" },
          { label: "Bluetooth", value: "5.3" },
          { label: "პორტები", value: "2× Thunderbolt/USB 4, MagSafe 3" },
        ],
      },
      {
        group: "ბატარეა",
        items: [
          { label: "ხანგრძლივობა", value: "18 საათამდე" },
          { label: "დამტენი", value: "30W USB-C ადაპტერი" },
        ],
      },
      {
        group: "ზომები",
        items: [
          { label: "წონა", value: "1.24კგ" },
          { label: "სისქე", value: "11.3მმ" },
        ],
      },
    ],
    whatsIncluded: ["MacBook Air 13\"", "30W USB-C დამტენი ადაპტერი", "USB-C დამტენი კაბელი", "დოკუმენტაცია"],
    delivery: standardDelivery,
    variants: [
      {
        id: "color",
        label: "ფერი",
        options: [
          { value: "midnight", label: "ღამისფერი", swatch: "#33373d" },
          { value: "starlight", label: "ვარსკვლავური", swatch: "#e8e0d0" },
          { value: "silver", label: "ვერცხლისფერი", swatch: "#e5e5e5" },
          { value: "space-gray", label: "კოსმოსური ნაცრისფერი", swatch: "#6e6e70" },
        ],
      },
      {
        id: "storage",
        label: "მეხსიერება",
        options: [
          { value: "256gb", label: "256GB" },
          { value: "512gb", label: "512GB" },
        ],
      },
    ],
    relatedIds: ["p-10", "p-3", "p-16", "p-7"],
  },
  {
    id: "p-5",
    slug: "lg-oled-c4-55",
    brand: "LG",
    name: "OLED evo C4 55\" 4K",
    category: "tv",
    visual: "tv",
    tone: 5,
    rating: 4.8,
    reviewCount: 74,
    price: 3299,
    previousPrice: 3899,
    availability: "low-stock",
    sku: "OLED55C4",
    images: [
      { visual: "tv", tone: 5 },
      { visual: "tv", tone: 2 },
      { visual: "tv", tone: 3 },
    ],
    installmentOptions: [
      { months: 12, monthlyPrice: 275 },
      { months: 24, monthlyPrice: 138 },
    ],
    warranty: "36 თვე ოფიციალური გარანტია",
    shortDescription: "OLED evo პანელი, α9 AI პროცესორი Gen7 და 120Hz — კინოხარისხის სურათი და გეიმინგისთვის მზა ეკრანი.",
    description:
      "OLED evo C4 გთავაზობთ სრულყოფილ შავს, უსასრულო კონტრასტსა და ცხოვრებისეულ ფერებს α9 AI პროცესორის მე-7 თაობის წყალობით. 120Hz განახლების სიხშირე და 4× HDMI 2.1 პორტი მას გეიმერების საყვარელ არჩევანად აქცევს, ხოლო webOS პლატფორმა უზრუნველყოფს წვდომას ყველა პოპულარულ სტრიმინგ სერვისზე.",
    keyFeatures: [
      "OLED evo პანელი — სრულყოფილი შავი და უსასრულო კონტრასტი",
      "α9 AI პროცესორი Gen7 სურათის დამუშავებისთვის",
      "120Hz განახლების სიხშირე გეიმინგისთვის",
      "4× HDMI 2.1 პორტი — VRR, ALLM მხარდაჭერით",
      "Dolby Vision და Dolby Atmos",
      "webOS — ყველა სტრიმინგ სერვისი ერთად",
    ],
    specs: [
      {
        group: "ზოგადი",
        items: [
          { label: "ბრენდი", value: "LG" },
          { label: "სერია", value: "OLED evo C4" },
          { label: "სმარტ პლატფორმა", value: "webOS 24" },
        ],
      },
      {
        group: "ეკრანი",
        items: [
          { label: "ზომა", value: "55\"" },
          { label: "გარჩევადობა", value: "4K UHD (3840×2160)" },
          { label: "პანელი", value: "OLED evo" },
          { label: "განახლების სიხშირე", value: "120Hz" },
          { label: "HDR", value: "Dolby Vision, HDR10, HLG" },
        ],
      },
      {
        group: "კავშირი",
        items: [
          { label: "HDMI", value: "4× HDMI 2.1" },
          { label: "USB", value: "3× USB" },
          { label: "Wi-Fi", value: "Wi-Fi 6" },
          { label: "Bluetooth", value: "5.1" },
        ],
      },
      {
        group: "ბატარეა",
        items: [{ label: "კვება", value: "220-240V, ~150W" }],
      },
      {
        group: "ზომები",
        items: [
          { label: "წონა (სამაგრის გარეშე)", value: "16.5კგ" },
          { label: "სისქე", value: "46.9მმ" },
        ],
      },
    ],
    whatsIncluded: ["ტელევიზორი OLED evo C4", "მაგნიური Wi-Fi ანტენა", "დისტანციური მართვის პულტი Magic Remote", "სამაგრი ფეხები", "დოკუმენტაცია"],
    delivery: standardDelivery,
    variants: [
      {
        id: "size",
        label: "ზომა",
        options: [
          { value: "48", label: "48\"" },
          { value: "55", label: "55\"" },
          { value: "65", label: "65\"" },
        ],
      },
    ],
    relatedIds: ["p-7", "p-16"],
  },
  {
    id: "p-6",
    slug: "sony-wh-1000xm5",
    brand: "Sony",
    name: "WH-1000XM5 საყურე",
    category: "audio",
    visual: "audio",
    tone: 3,
    secondaryVisual: "accessory",
    rating: 4.7,
    reviewCount: 261,
    price: 899,
    previousPrice: 1099,
    availability: "in-stock",
    sku: "WH1000XM5/B",
    images: [
      { visual: "audio", tone: 3 },
      { visual: "accessory", tone: 2 },
      { visual: "audio", tone: 1 },
      { visual: "audio", tone: 5 },
    ],
    installmentOptions: [
      { months: 6, monthlyPrice: 150 },
      { months: 12, monthlyPrice: 75 },
    ],
    warranty: "12 თვე ოფიციალური გარანტია",
    shortDescription: "ინდუსტრიის საუკეთესო ხმაურის ჩახშობა, 30 საათი ბატარეა და კრისტალურად სუფთა ხმა ზარებისთვის.",
    description:
      "WH-1000XM5 იყენებს ორ პროცესორს და რვა მიკროფონს ინდუსტრიაში წამყვანი ხმაურის ჩახშობისთვის, ხოლო ახალი დინამიკის დრაივერები გადმოსცემენ დახვეწილ, დეტალურ ხმას ბასის სიღრმით. 30 საათამდე ბატარეის რესურსი და სწრაფი დატენვა (3 წუთი = 3 საათი მოსმენა) მას იდეალურ თანამგზავრად აქცევს მოგზაურობისა და ყოველდღიური გამოყენებისთვის.",
    keyFeatures: [
      "ინდუსტრიის წამყვანი აქტიური ხმაურის ჩახშობა",
      "30 საათამდე მუშაობა ერთ დატენვაზე",
      "8 მიკროფონი კრისტალურად სუფთა ზარებისთვის",
      "სწრაფი დატენვა — 3 წუთი = 3 საათი მოსმენა",
      "მრავალწერტილოვანი Bluetooth დაკავშირება",
      "მორგებადი ხმის პროფილი აპლიკაციიდან",
    ],
    specs: [
      {
        group: "ზოგადი",
        items: [
          { label: "ბრენდი", value: "Sony" },
          { label: "ტიპი", value: "დახურული ტიპის, უსადენო" },
        ],
      },
      {
        group: "კავშირი",
        items: [
          { label: "Bluetooth", value: "5.2" },
          { label: "კოდეკები", value: "SBC, AAC, LDAC" },
          { label: "სადენიანი რეჟიმი", value: "3.5მმ AUX კაბელით" },
        ],
      },
      {
        group: "ბატარეა",
        items: [
          { label: "მუშაობის ხანგრძლივობა", value: "30 საათამდე (ANC ჩართული)" },
          { label: "დატენვა", value: "USB-C, სწრაფი დატენვის ფუნქციით" },
        ],
      },
      {
        group: "ზომები",
        items: [
          { label: "წონა", value: "250გ" },
          { label: "დასაკეცი დიზაინი", value: "კი, შემთხვევის ჩათვლით" },
        ],
      },
    ],
    whatsIncluded: ["საყურეები WH-1000XM5", "მატარებელი ჩანთა", "USB-C დამტენი კაბელი", "3.5მმ აუდიო კაბელი", "სახელმძღვანელო"],
    delivery: standardDelivery,
    variants: [
      {
        id: "color",
        label: "ფერი",
        options: [
          { value: "black", label: "შავი", swatch: "#1c1c1e" },
          { value: "silver", label: "ვერცხლისფერი", swatch: "#d8d3c7" },
        ],
      },
    ],
    relatedIds: ["p-17", "p-11"],
  },
  {
    id: "p-7",
    slug: "samsung-odyssey-g7-27",
    brand: "Samsung",
    name: "Odyssey G7 27\" 240Hz",
    category: "monitors",
    visual: "monitor",
    tone: 2,
    rating: 4.5,
    reviewCount: 58,
    price: 1349,
    installment: { months: 12, monthlyPrice: 112 },
    availability: "in-stock",
    sku: "LC27G75TQSR",
    images: [
      { visual: "monitor", tone: 2 },
      { visual: "monitor", tone: 4 },
      { visual: "monitor", tone: 1 },
    ],
    installmentOptions: [
      { months: 6, monthlyPrice: 225 },
      { months: 12, monthlyPrice: 112 },
    ],
    warranty: "36 თვე ოფიციალური გარანტია",
    shortDescription: "1000R მოხრილი QHD პანელი 240Hz სიხშირით — სისწრაფე და ჩაძირვა თამაშისთვის.",
    description:
      "Odyssey G7 გთავაზობთ 1000R მოხრილ QHD პანელს, რომელიც ბუნებრივად მოირგება თვალის ხედვის არეს სრული ჩაძირვის შესაქმნელად. 240Hz განახლების სიხშირე და 1ms რეაგირების დრო გამორიცხავს ბუნდოვნებას სწრაფი მოძრაობის დროს, ხოლო AMD FreeSync Premium Pro ტექნოლოგია აღმოფხვრის ეკრანის დახევას.",
    keyFeatures: [
      "1000R მოხრილი პანელი სრული ჩაძირვისთვის",
      "240Hz განახლების სიხშირე, 1ms რეაგირების დრო",
      "QHD (2560×1440) გარჩევადობა",
      "AMD FreeSync Premium Pro",
      "შესამჩნევი Height/Tilt/Swivel სამაგრი",
    ],
    specs: [
      {
        group: "ეკრანი",
        items: [
          { label: "ზომა", value: "27\"" },
          { label: "გარჩევადობა", value: "2560×1440 (QHD)" },
          { label: "პანელი", value: "VA, 1000R მოხრილი" },
          { label: "განახლების სიხშირე", value: "240Hz" },
          { label: "რეაგირების დრო", value: "1ms (GtG)" },
        ],
      },
      {
        group: "კავშირი",
        items: [
          { label: "პორტები", value: "2× HDMI 2.0, 1× DisplayPort 1.4" },
          { label: "USB", value: "2× USB 3.0" },
        ],
      },
      {
        group: "ზომები",
        items: [
          { label: "წონა (სამაგრით)", value: "6.9კგ" },
          { label: "VESA", value: "100×100მმ" },
        ],
      },
    ],
    whatsIncluded: ["მონიტორი Odyssey G7", "კვების კაბელი", "DisplayPort კაბელი", "დოკუმენტაცია"],
    delivery: standardDelivery,
    relatedIds: ["p-16", "p-3"],
  },
  {
    id: "p-8",
    slug: "xiaomi-pad-6",
    brand: "Xiaomi",
    name: "Pad 6 128GB Wi-Fi",
    category: "tablets",
    visual: "tablet",
    tone: 1,
    rating: 4.4,
    reviewCount: 133,
    price: 799,
    previousPrice: 949,
    availability: "in-stock",
  },
  {
    id: "p-17",
    slug: "apple-airpods-pro-2",
    brand: "Apple",
    name: "AirPods Pro 2",
    category: "audio",
    visual: "audio",
    tone: 1,
    rating: 4.9,
    reviewCount: 401,
    price: 699,
    availability: "in-stock",
    badge: { kind: "top-seller" },
  },
  {
    id: "p-18",
    slug: "asus-rog-strix-rtx4070",
    brand: "ASUS",
    name: "ROG Strix RTX 4070 12GB",
    category: "components",
    visual: "components",
    tone: 5,
    rating: 4.8,
    reviewCount: 63,
    price: 2199,
    installment: { months: 24, monthlyPrice: 92 },
    availability: "low-stock",
    badge: { kind: "limited" },
  },
];

export const newArrivals: Product[] = [
  {
    id: "p-9",
    slug: "apple-iphone-16",
    brand: "Apple",
    name: "iPhone 16 128GB",
    category: "phones",
    visual: "phone",
    tone: 3,
    storage: "128GB",
    rating: 4.9,
    reviewCount: 41,
    price: 3499,
    installment: { months: 24, monthlyPrice: 146 },
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "p-10",
    slug: "lenovo-legion-5-pro",
    brand: "Lenovo",
    name: "Legion 5 Pro RTX 4070",
    category: "gaming",
    visual: "gaming",
    tone: 5,
    rating: 4.6,
    reviewCount: 22,
    price: 4599,
    installment: { months: 24, monthlyPrice: 192 },
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "p-11",
    slug: "jbl-flip-6",
    brand: "JBL",
    name: "Flip 6 დინამიკი",
    category: "audio",
    visual: "audio",
    tone: 4,
    rating: 4.5,
    reviewCount: 89,
    price: 329,
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "p-12",
    slug: "tp-link-deco-x55",
    brand: "TP-Link",
    name: "Deco X55 Mesh Wi-Fi 6 (2-pack)",
    category: "network",
    visual: "network",
    tone: 1,
    rating: 4.6,
    reviewCount: 34,
    price: 549,
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "p-13",
    slug: "philips-hue-starter-kit",
    brand: "Philips",
    name: "Hue Starter Kit E27 x3",
    category: "smart-home",
    visual: "smart-home",
    tone: 2,
    rating: 4.7,
    reviewCount: 47,
    price: 429,
    availability: "low-stock",
    isNew: true,
  },
  {
    id: "p-14",
    slug: "asus-tuf-b760m",
    brand: "ASUS",
    name: "TUF Gaming B760M-Plus",
    category: "components",
    visual: "components",
    tone: 5,
    rating: 4.4,
    reviewCount: 16,
    price: 549,
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "p-15",
    slug: "logitech-mx-master-3s",
    brand: "Logitech",
    name: "MX Master 3S მაუსი",
    category: "accessories",
    visual: "accessory",
    tone: 3,
    rating: 4.8,
    reviewCount: 112,
    price: 289,
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "p-19",
    slug: "logitech-g-pro-x-tkl",
    brand: "Logitech",
    name: "G Pro X TKL კლავიატურა",
    category: "gaming",
    visual: "keyboard",
    tone: 4,
    rating: 4.7,
    reviewCount: 53,
    price: 379,
    previousPrice: 449,
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "p-16",
    slug: "dell-ultrasharp-u2723qe",
    brand: "Dell",
    name: "UltraSharp U2723QE 27\" 4K",
    category: "monitors",
    visual: "monitor",
    tone: 1,
    rating: 4.7,
    reviewCount: 29,
    price: 1699,
    availability: "out-of-stock",
    isNew: true,
  },
];

/**
 * Full phones catalogue backing the /category/phones listing page. Kept
 * separate from `featuredProducts`/`newArrivals` (which stay curated for the
 * homepage rows) so the category page has enough volume and spec variety
 * (brand/storage/ram/price/rating/availability) to demonstrate real
 * filtering, sorting and pagination.
 */
export const phoneProducts: Product[] = [
  // ph-1 / ph-3 / ph-6 below intentionally reuse the exact same objects
  // already defined in featuredProducts/newArrivals (same real-world
  // product) so every product has exactly one canonical id/slug — critical
  // for the /product/[slug] route to resolve unambiguously.
  featuredProducts[0], // iPhone 15 Pro 128GB (p-1)
  {
    id: "ph-2",
    slug: "apple-iphone-15-pro-256",
    brand: "Apple",
    name: "iPhone 15 Pro 256GB",
    category: "phones",
    visual: "phone",
    tone: 4,
    storage: "256GB",
    rating: 4.8,
    reviewCount: 342,
    price: 3699,
    installment: { months: 24, monthlyPrice: 154 },
    availability: "in-stock",
  },
  newArrivals[0], // iPhone 16 128GB (p-9)
  {
    id: "ph-4",
    slug: "apple-iphone-14-128",
    brand: "Apple",
    name: "iPhone 14 128GB",
    category: "phones",
    visual: "phone",
    tone: 2,
    storage: "128GB",
    rating: 4.6,
    reviewCount: 512,
    price: 2399,
    previousPrice: 2699,
    availability: "in-stock",
  },
  {
    id: "ph-5",
    slug: "apple-iphone-se-64",
    brand: "Apple",
    name: "iPhone SE 64GB",
    category: "phones",
    visual: "phone",
    tone: 1,
    storage: "64GB",
    rating: 4.2,
    reviewCount: 76,
    price: 1399,
    availability: "in-stock",
  },
  featuredProducts[1], // Galaxy S24 256GB (p-2)
  {
    id: "ph-7",
    slug: "samsung-galaxy-s24-ultra-512",
    brand: "Samsung",
    name: "Galaxy S24 Ultra 512GB",
    category: "phones",
    visual: "phone",
    tone: 5,
    secondaryVisual: "accessory",
    storage: "512GB",
    ram: "12GB",
    rating: 4.8,
    reviewCount: 156,
    price: 4299,
    installment: { months: 24, monthlyPrice: 179 },
    availability: "in-stock",
    badge: { kind: "top-seller" },
    sku: "SM-S928BZKGEUE",
    images: [
      { visual: "phone", tone: 5 },
      { visual: "accessory", tone: 4 },
      { visual: "phone", tone: 3 },
      { visual: "phone", tone: 1 },
    ],
    installmentOptions: [
      { months: 6, monthlyPrice: 717 },
      { months: 12, monthlyPrice: 358 },
      { months: 24, monthlyPrice: 179 },
    ],
    warranty: "24 თვე ოფიციალური გარანტია Samsung-ისგან",
    shortDescription: "ტიტანის ჩარჩო, ჩაშენებული S Pen და 200MP კამერა Galaxy AI ფუნქციებით — Samsung-ის ულტრა ფლაგმანი.",
    description:
      "Galaxy S24 Ultra აერთიანებს ტიტანის ჩარჩოს, ბრტყელ 6.8\" Dynamic AMOLED 2X ეკრანს და ჩაშენებულ S Pen-ს ერთიან, მძლავრ პაკეტში. 200MP მთავარი კამერა და ახალი Galaxy AI ფუნქციები (Circle to Search, Live Translate) აქცევს მას ერთ-ერთ ყველაზე მოწინავე ტელეფონად ბაზარზე, ხოლო Snapdragon 8 Gen 3 ჩიპსეტი უზრუნველყოფს გამორჩეულ სისწრაფეს.",
    keyFeatures: [
      "200MP მთავარი კამერა ProVisual ძრავით",
      "ჩაშენებული S Pen სტილუსი",
      "Galaxy AI — Circle to Search, Live Translate",
      "ტიტანის ჩარჩო და Corning Gorilla Armor მინა",
      "Snapdragon 8 Gen 3 for Galaxy ჩიპსეტი",
      "5000mAh ბატარეა სწრაფი დატენვით",
    ],
    specs: [
      {
        group: "ზოგადი",
        items: [
          { label: "ბრენდი", value: "Samsung" },
          { label: "მოდელი", value: "Galaxy S24 Ultra" },
          { label: "ფერი", value: "ტიტანის შავი" },
        ],
      },
      {
        group: "ეკრანი",
        items: [
          { label: "ზომა", value: "6.8\"" },
          { label: "ტექნოლოგია", value: "Dynamic AMOLED 2X" },
          { label: "განახლების სიხშირე", value: "1-120Hz ადაპტური" },
          { label: "სიკაშკაშე", value: "2600 ნიტი (მაქს.)" },
        ],
      },
      {
        group: "პროცესორი",
        items: [
          { label: "ჩიპსეტი", value: "Snapdragon 8 Gen 3 for Galaxy" },
          { label: "ბირთვები", value: "8 ბირთვი" },
        ],
      },
      {
        group: "მეხსიერება",
        items: [
          { label: "შიდა მეხსიერება", value: "512GB" },
          { label: "ოპერატიული მეხსიერება", value: "12GB" },
        ],
      },
      {
        group: "კამერა",
        items: [
          { label: "მთავარი კამერა", value: "200MP + 50MP + 12MP + 10MP" },
          { label: "წინა კამერა", value: "12MP" },
          { label: "ვიდეო", value: "8K 30fps" },
          { label: "ოპტიკური ზუმი", value: "5x" },
        ],
      },
      {
        group: "კავშირი",
        items: [
          { label: "SIM", value: "Nano-SIM + eSIM" },
          { label: "Wi-Fi", value: "Wi-Fi 7" },
          { label: "Bluetooth", value: "5.3" },
          { label: "პორტი", value: "USB-C" },
        ],
      },
      {
        group: "ბატარეა",
        items: [
          { label: "ტევადობა", value: "5000mAh" },
          { label: "დატენვა", value: "45W სადენიანი / 15W უსადენო" },
        ],
      },
      {
        group: "ზომები",
        items: [
          { label: "წონა", value: "232გ" },
          { label: "მასალა", value: "ტიტანი და მინა" },
          { label: "წყალგამძლეობა", value: "IP68" },
        ],
      },
    ],
    whatsIncluded: ["Galaxy S24 Ultra", "S Pen (ჩაშენებული)", "USB-C to USB-C კაბელი", "SIM ამომღები ხელსაწყო", "დოკუმენტაცია"],
    delivery: standardDelivery,
    variants: [
      {
        id: "color",
        label: "ფერი",
        options: [
          { value: "titanium-black", label: "ტიტანის შავი", swatch: "#2b2b2c" },
          { value: "titanium-gray", label: "ტიტანის ნაცრისფერი", swatch: "#8a8a8a" },
          { value: "titanium-violet", label: "ტიტანის იისფერი", swatch: "#8a7ca8" },
          { value: "titanium-yellow", label: "ტიტანის ყვითელი", swatch: "#d8c98a" },
        ],
      },
      {
        id: "storage",
        label: "მეხსიერება",
        options: [
          { value: "256gb", label: "256GB" },
          { value: "512gb", label: "512GB" },
          { value: "1tb", label: "1TB" },
        ],
      },
    ],
    relatedIds: ["p-1", "ph-2", "ph-9", "ph-6"],
  },
  {
    id: "ph-8",
    slug: "samsung-galaxy-a55-128",
    brand: "Samsung",
    name: "Galaxy A55 128GB",
    category: "phones",
    visual: "phone",
    tone: 3,
    storage: "128GB",
    ram: "8GB",
    rating: 4.3,
    reviewCount: 89,
    price: 999,
    availability: "low-stock",
  },
  {
    id: "ph-9",
    slug: "samsung-galaxy-z-flip6-256",
    brand: "Samsung",
    name: "Galaxy Z Flip6 256GB",
    category: "phones",
    visual: "phone",
    tone: 4,
    storage: "256GB",
    ram: "12GB",
    rating: 4.5,
    reviewCount: 34,
    price: 2999,
    availability: "in-stock",
    isNew: true,
    badge: { kind: "limited" },
  },
  {
    id: "ph-10",
    slug: "samsung-galaxy-s23-fe-128",
    brand: "Samsung",
    name: "Galaxy S23 FE 128GB",
    category: "phones",
    visual: "phone",
    tone: 1,
    storage: "128GB",
    ram: "8GB",
    rating: 4.5,
    reviewCount: 63,
    price: 1599,
    previousPrice: 1899,
    availability: "low-stock",
  },
  {
    id: "ph-11",
    slug: "xiaomi-14-256",
    brand: "Xiaomi",
    name: "Xiaomi 14 256GB",
    category: "phones",
    visual: "phone",
    tone: 5,
    storage: "256GB",
    ram: "12GB",
    rating: 4.5,
    reviewCount: 67,
    price: 1899,
    previousPrice: 2199,
    availability: "in-stock",
  },
  {
    id: "ph-12",
    slug: "xiaomi-redmi-note-13-pro-128",
    brand: "Xiaomi",
    name: "Redmi Note 13 Pro 128GB",
    category: "phones",
    visual: "phone",
    tone: 2,
    storage: "128GB",
    ram: "8GB",
    rating: 4.4,
    reviewCount: 145,
    price: 699,
    availability: "in-stock",
  },
  {
    id: "ph-13",
    slug: "xiaomi-poco-x6-pro-256",
    brand: "Xiaomi",
    name: "Poco X6 Pro 256GB",
    category: "phones",
    visual: "phone",
    tone: 3,
    storage: "256GB",
    ram: "12GB",
    rating: 4.3,
    reviewCount: 58,
    price: 799,
    availability: "out-of-stock",
  },
  {
    id: "ph-14",
    slug: "huawei-p60-pro-256",
    brand: "Huawei",
    name: "P60 Pro 256GB",
    category: "phones",
    visual: "phone",
    tone: 1,
    storage: "256GB",
    ram: "12GB",
    rating: 4.2,
    reviewCount: 29,
    price: 1799,
    availability: "in-stock",
  },
  {
    id: "ph-15",
    slug: "huawei-nova-12-128",
    brand: "Huawei",
    name: "Nova 12 128GB",
    category: "phones",
    visual: "phone",
    tone: 4,
    storage: "128GB",
    ram: "8GB",
    rating: 4.1,
    reviewCount: 22,
    price: 899,
    availability: "in-stock",
  },
  {
    id: "ph-16",
    slug: "honor-magic6-pro-512",
    brand: "Honor",
    name: "Magic6 Pro 512GB",
    category: "phones",
    visual: "phone",
    tone: 5,
    storage: "512GB",
    ram: "12GB",
    rating: 4.4,
    reviewCount: 18,
    price: 2199,
    availability: "in-stock",
    isNew: true,
  },
  {
    id: "ph-17",
    slug: "nothing-phone-2a-256",
    brand: "Nothing",
    name: "Phone (2a) 256GB",
    category: "phones",
    visual: "phone",
    tone: 2,
    storage: "256GB",
    ram: "8GB",
    rating: 4.3,
    reviewCount: 41,
    price: 999,
    availability: "in-stock",
    isNew: true,
    badge: { kind: "custom", label: "თრენდში" },
  },
  {
    id: "ph-18",
    slug: "google-pixel-8-128",
    brand: "Google",
    name: "Pixel 8 128GB",
    category: "phones",
    visual: "phone",
    tone: 3,
    storage: "128GB",
    ram: "8GB",
    rating: 4.6,
    reviewCount: 52,
    price: 1699,
    previousPrice: 1899,
    availability: "in-stock",
  },
];

/**
 * Per-category dedicated datasets. Categories without an entry here fall
 * back to filtering the general homepage pools by `category` — add a new
 * key (mirroring the pattern used for "phones") once a category needs its
 * own richer catalogue for its listing page.
 */
const categoryProductSources: Partial<Record<string, Product[]>> = {
  phones: phoneProducts,
};

/** Returns the product list backing a category's listing (PLP) page. */
export function getProductsByCategory(categoryId: string): Product[] {
  const dedicated = categoryProductSources[categoryId];
  if (dedicated) return dedicated;
  return [...featuredProducts, ...newArrivals].filter((product) => product.category === categoryId);
}

function dedupeById(products: Product[]): Product[] {
  const seen = new Set<string>();
  const result: Product[] = [];
  for (const product of products) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    result.push(product);
  }
  return result;
}

/**
 * Flat, de-duplicated view of the entire mock catalogue — the single source
 * the product detail page (and any future "related products" logic) reads
 * from, so every product resolves to exactly one canonical id/slug.
 */
export const allProducts: Product[] = dedupeById([...featuredProducts, ...newArrivals, ...phoneProducts]);

/** Looks up a single product by its PDP slug, or undefined if it doesn't exist. */
export function getProductBySlug(slug: string): Product | undefined {
  return allProducts.find((product) => product.slug === slug);
}
