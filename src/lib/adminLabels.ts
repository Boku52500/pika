export const STOCK_STATE_LABEL = {
  "in-stock": "მარაგშია",
  "low-stock": "მარაგი იწურება",
  "out-of-stock": "მარაგში არ არის",
} as const;

export const ORDER_STATUS_LABEL = {
  pending: "მოლოდინში",
  confirmed: "დადასტურებული",
  processing: "მუშავდება",
  shipped: "გაგზავნილია",
  delivered: "მიწოდებულია",
  cancelled: "გაუქმებულია",
} as const;

export const PAYMENT_STATUS_LABEL = {
  unpaid: "გადაუხდელი",
  pending: "მოლოდინში",
  processing: "მუშავდება",
  paid: "გადახდილი",
  failed: "წარუმატებელი",
  refunded: "დაბრუნებული",
  partially_refunded: "ნაწილობრივ დაბრუნებული",
} as const;

export const PAYMENT_METHOD_LABEL = {
  card: "ბარათი",
  installment: "განვადება",
  cash_on_delivery: "გადახდა მიწოდებისას",
} as const;

export const DELIVERY_METHOD_LABEL = {
  standard: "სტანდარტული მიწოდება",
  express: "სწრაფი მიწოდება",
} as const;

export const DISCOUNT_TYPE_LABEL = {
  percentage: "პროცენტი",
  fixed: "ფიქსირებული",
} as const;

export const BADGE_KIND_OPTIONS = [
  { value: "", label: "ბეჯის გარეშე" },
  { value: "bestseller", label: "ბესტსელერი" },
  { value: "top-seller", label: "ტოპ გაყიდვადი" },
  { value: "limited", label: "შეზღუდული" },
  { value: "custom", label: "სხვა" },
] as const;
