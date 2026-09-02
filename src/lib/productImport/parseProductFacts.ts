import { normalizeReusableLabel } from "@/lib/reusableLabel";

export type CategoryKind =
  | "monitor"
  | "cpu"
  | "gpu"
  | "storage"
  | "laptop"
  | "phone"
  | "tv"
  | "router"
  | "headphones"
  | "case"
  | "motherboard"
  | "cooler"
  | "keyboard"
  | "mouse"
  | "printer"
  | "projector"
  | "console"
  | "tablet"
  | "appliance"
  | "camera"
  | "psu"
  | "microphone"
  | "speaker"
  | "generic";

export type ParsedCapacity = { value: number; unit: "GB" | "TB" | "MB"; raw: string; kind: "storage" | "memory" | "unknown" };

export type ProductFacts = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  categoryKind: CategoryKind;
  /** Lightly cleaned name — never the sole source of truth; original `name` is always preserved. */
  cleanName: string;
  /** Core searchable model string (brand may be omitted if already in name). */
  modelLabel: string;
  /** Georgian product-type noun for SEO (e.g. მონიტორი, პროცესორი). */
  productTypeKa: string;
  screenInches: number | null;
  screenInchesRaw: string | null;
  resolution: string | null;
  capacities: ParsedCapacity[];
  primaryStorage: ParsedCapacity | null;
  primaryMemory: ParsedCapacity | null;
  gpuModel: string | null;
  cpuModel: string | null;
  phoneModel: string | null;
  laptopSeries: string | null;
  tvSizeInches: number | null;
  color: string | null;
  series: string[];
  wifiGeneration: string | null;
  formFactor: string | null;
  /** Tokens explicitly present in source name — safe to mention in copy. */
  explicitTokens: string[];
};

/** Only remove supplier patterns we are confident are not product identity. When unsure, keep the token. */
const AMD_TRAY_CODE = /\b\d{4}-\d{3}-\d{6,}\b/g;
const TRAILING_MANUFACTURER_PAREN = /\s*\([A-Z0-9][A-Z0-9-]{7,}\)\s*$/g;
const TRAILING_DASH_SUPPLIER_SUFFIX = /\s-\s+[A-Z0-9]*\d[A-Z0-9]{5,}\s*$/gi;

const TRAILING_NOISE =
  /\s*-\s*(?:tray|box|oem|bulk|retail|kit|w\/\s*fan|with fan|no fan|boxed|bulk pack)\b.*$/i;

const COLORS =
  /\b(?:black|white|silver|grey|gray|gold|blue|red|green|pink|purple|starlight|midnight|space gray|space grey|graphite|titanium|natural|lavender|ultramarine|teal|coral|orange|yellow|beige|brown|champagne|rose gold)\b/i;

const RESOLUTIONS = [
  { pattern: /\b8K\b/i, label: "8K" },
  { pattern: /\b4K(?:\s*UHD)?\b|\bUHD\b|\b2160p\b/i, label: "4K" },
  { pattern: /\bDQHD\b/i, label: "DQHD" },
  { pattern: /\bQHD\b|\b1440p\b|\b2K\b/i, label: "QHD" },
  { pattern: /\bFHD\b|\b1080p\b|\bFull\s*HD\b/i, label: "FHD" },
  { pattern: /\bHD\b/i, label: "HD" },
] as const;

/** Regexes that capture literal substrings from the original source name for explicitFacts. */
const SOURCE_LITERAL_PATTERNS: RegExp[] = [
  /\b(?:INT\s+)?I[3579]-\d{4,5}[A-Z]*\b/gi,
  /\bCore\s+i[3579]-\d{4,5}[A-Z]*\b/gi,
  /\bCore\s+Ultra\s+\d+\s+\d+[A-Z]+\b/gi,
  /\bRyzen\s+(?:\d+\s+)?\d{4}[A-Z0-9]*\b/gi,
  /\bAthlon\s+\w+\d+\b/gi,
  /\b(?:GeForce\s+)?RTX\s+\d{3,4}(?:\s*Ti(?:\s*Super)?|\s*Super|\s*OC)?\b/gi,
  /\b(?:Radeon\s+)?RX\s+\d{3,4}(?:\s*XTX|\s*XT|\s*OC)?\b/gi,
  /\bGTX\s+\d{3,4}(?:\s*Ti)?\b/gi,
  /\biPhone\s+\d+(?:\s+Pro(?:\s+Max)?|\s+Plus|\s+Max|\s+mini)?\b/gi,
  /\bGalaxy\s+(?:S|A|Z|Note)\d[\w\s-]*/gi,
  /\bPixel\s+\d+(?:\s+Pro)?\b/gi,
  /\bMacBook\s+(?:Air|Pro)\b/gi,
  /\bM[123](?:\s+Pro|\s+Max)?\b/gi,
  /\b\d+-core\s+CPU\b/gi,
  /\b\d+-core\s+GPU\b/gi,
  /\b\d+(?:\.\d+)?\s*(?:["''′]|inch(?:es)?)\b/gi,
  /\b\d+(?:\.\d+)?\s*(?:GB|TB|MB)\b/gi,
  /\(\d+GB\s*\/\s*\d+GB\)/gi,
  /\bM\.2\b/gi,
  /\bSSD\b/gi,
  /\bNVMe\b/gi,
  /\b(?:8K|4K(?:\s*UHD)?|UHD|DQHD|QHD|FHD)\b/gi,
  /\bInverter\b/gi,
  /\b\d+-\d+m2\b/gi,
  /\bIndoor\s*\+\s*Complect\b/gi,
  /\b[A-Z]{2}\d{2}[A-Z]{3}\.[A-Z]{4}\b/g,
  /\bA21\s+PLUS\b/gi,
  /\bARGB\b/gi,
  /\bCase\b/gi,
  /\bRT-[A-Z0-9-]+\b/gi,
  /\bAX\d{3,4}\b/gi,
  /\bWi-?Fi\s*(?:6E?|7)\b/gi,
  /\bGaming\s+Router\b/gi,
  /\(2\s+Pack\)/gi,
  /\b2\s+Pack\b/gi,
  /\bE100\b/gi,
  /\b990\s+PRO\b/gi,
  /\b980\s+PRO\b/gi,
  /\b870\s+EVO\b/gi,
  /\b\d{2}V\d[A-Z0-9]+\b/gi,
  /\b732xk\b/gi,
  /\bSeries\s+\d+\s+Pro\b/gi,
  /\bROG\s+(?:Strix|Zephyrus|TUF|Swift|Crosshair|Hyperion|Astral|Matrix)[\w\s-]*/gi,
  /\bThinkPad\s+\w+/gi,
  /\bIdeaPad\s+\w+/gi,
  /\bLegion\s+\w+/gi,
  /\bVivoBook\s+\w+/gi,
  /\bZenBook\s+\w+/gi,
  /\bPredator\s+\w+/gi,
  /\bNitro\s+\w+/gi,
  /\bOdyssey\s+\w+/gi,
  /\bWH-\d+/gi,
  /\bOC\b/gi,
  /\bPLUS\b/gi,
  /\bATX\b/gi,
  /\bMicro-ATX\b/gi,
  COLORS,
];

function detectCategoryKind(category: string): CategoryKind {
  const c = category.toLocaleLowerCase("ka");
  if (/მონიტორ|monitor/.test(c)) return "monitor";
  if (/პროცეს|cpu|processor/.test(c)) return "cpu";
  if (/ვიდეო|gpu|graphics|კარტა|ბარათ/.test(c)) return "gpu";
  if (/ssd|hdd|მეხსიერებ/.test(c)) return "storage";
  if (/ლეპტოპ|notebook|macbook/.test(c)) return "laptop";
  if (/ტელეფონ|iphone|smartphone|mobile/.test(c)) return "phone";
  if (/ტელევიზ|tv/.test(c)) return "tv";
  if (/როუტ|router|mesh|wifi\s*6|wi-fi/.test(c)) return "router";
  if (/ყურსასმენ|headphone|earbud|airpod/.test(c)) return "headphones";
  if (/ქეის|case|chassis|tower/.test(c)) return "case";
  if (/დედაპლატ|motherboard|mainboard/.test(c)) return "motherboard";
  if (/ქულერ|cooler|aio/.test(c)) return "cooler";
  if (/კლავიატ|keyboard/.test(c)) return "keyboard";
  if (/მაუს|mouse/.test(c)) return "mouse";
  if (/პრინტ|printer/.test(c)) return "printer";
  if (/პროექტ|projector/.test(c)) return "projector";
  if (/კონსოლ|playstation|xbox|nintendo/.test(c)) return "console";
  if (/პლანშ|tablet|ipad/.test(c)) return "tablet";
  if (/კამერ|camera/.test(c)) return "camera";
  if (/კვების|psu|power supply/.test(c)) return "psu";
  if (/მიკროფ|microphone|mic\b/.test(c)) return "microphone";
  if (/დინამ|speaker|soundbar/.test(c)) return "speaker";
  if (
    /კონდინც|ყავ|წვენს|ბლენდ|ტოსტ|გრილი|უთო|მტვერ|სამზარ|ჩაიდ|აერო|ვაფლ|სენვიჩ|ხორც|წვერ|თმის|პორტატ/.test(c)
  ) {
    return "appliance";
  }
  return "generic";
}

function productTypeKa(kind: CategoryKind, category: string): string {
  const map: Partial<Record<CategoryKind, string>> = {
    monitor: "მონიტორი",
    cpu: "პროცესორი",
    gpu: "ვიდეობარათი",
    storage: "მეხსიერება",
    laptop: "ლეპტოპი",
    phone: "სმარტფონი",
    tv: "ტელევიზორი",
    router: "როუტერი",
    headphones: "ყურსასმენები",
    case: "კორპუსი",
    motherboard: "დედაპლატა",
    cooler: "ქულერი",
    keyboard: "კლავიატურა",
    mouse: "მაუსი",
    printer: "პრინტერი",
    projector: "პროექტორი",
    console: "სათამაშო კონსოლი",
    tablet: "პლანშეტი",
    camera: "კამერა",
    psu: "კვების ბლოკი",
    microphone: "მიკროფონი",
    speaker: "დინამიკი",
    appliance: "ტექნიკა",
    generic: "პროდუქტი",
  };
  if (kind === "storage") {
    if (/ssd/i.test(category)) return "SSD";
    if (/hdd/i.test(category)) return "HDD";
    return map.storage ?? "მეხსიერება";
  }
  return map[kind] ?? "პროდუქტი";
}

function parseScreenInches(name: string): { value: number | null; raw: string | null } {
  const match =
    name.match(/(\d+(?:\.\d+)?)\s*(?:["''′]|inch(?:es)?|in\b)/i) ??
    name.match(/\b(\d{2,3})\s*(?:"|''|′)/);
  if (!match) return { value: null, raw: null };
  const value = Number.parseFloat(match[1]!);
  if (!Number.isFinite(value) || value < 10 || value > 100) return { value: null, raw: null };
  return { value, raw: match[0] };
}

function parseCapacities(name: string, kind: CategoryKind): ParsedCapacity[] {
  const results: ParsedCapacity[] = [];
  const pattern = /\b(\d+(?:\.\d+)?)\s*(TB|GB|MB)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(name)) !== null) {
    const unit = match[2]!.toUpperCase() as "GB" | "TB" | "MB";
    const value = Number.parseFloat(match[1]!);
    let capKind: ParsedCapacity["kind"] = "unknown";
    const context = name.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20);
    if (/\b(?:RAM|DDR|memory|mem)\b/i.test(context) || /\(\d+GB\s*\/\s*\d/i.test(name)) {
      capKind = "memory";
    } else if (kind === "storage" || kind === "phone") {
      capKind = "storage";
    } else if (kind === "laptop") {
      capKind = unit === "TB" || value >= 256 ? "storage" : value <= 64 ? "memory" : "storage";
    }
    results.push({ value, unit, raw: match[0], kind: capKind });
  }
  return results;
}

function parseResolution(name: string): string | null {
  for (const entry of RESOLUTIONS) {
    if (entry.pattern.test(name)) return entry.label;
  }
  return null;
}

function parseGpuModel(name: string): string | null {
  const rtx = name.match(/\b(?:GeForce\s+)?RTX\s+(\d{3,4}(?:\s*Ti(?:\s*Super)?|\s*Super|\s*OC)?)\b/i);
  if (rtx) return `RTX ${rtx[1]!.replace(/\s+/g, " ").trim()}`;
  const rx = name.match(/\b(?:Radeon\s+)?RX\s+(\d{3,4}(?:\s*XTX|\s*XT|\s*OC)?)\b/i);
  if (rx) return `RX ${rx[1]!.replace(/\s+/g, " ").trim()}`;
  const gtx = name.match(/\bGTX\s+(\d{3,4}(?:\s*Ti)?)\b/i);
  if (gtx) return `GTX ${gtx[1]!.trim()}`;
  return null;
}

function parseCpuModel(name: string): string | null {
  const ultra = name.match(/\bCore\s+Ultra\s+\d+\s+\d+[A-Z]+\b/i);
  if (ultra) return ultra[0].replace(/\s+/g, " ");
  const core = name.match(/\bCore\s+i[3579]-\d{4,5}[A-Z]*\b/i);
  if (core) return core[0];
  const intelShort = name.match(/\b(?:INT\s+)?(I[3579]-\d{4,5}[A-Z]*)\b/i);
  if (intelShort) return intelShort[1]!.toUpperCase();
  const ryzen = name.match(/\bRyzen\s+(?:\d+\s+)?\d{4}[A-Z0-9]*\b/i);
  if (ryzen) return ryzen[0].replace(/\s+/g, " ");
  const athlon = name.match(/\bAthlon\s+\w+\d+\b/i);
  if (athlon) return athlon[0];
  return null;
}

function parsePhoneModel(name: string): string | null {
  const iphone = name.match(/\biPhone\s+\d+(?:\s+Pro(?:\s+Max)?|\s+Plus|\s+Max|\s+mini)?\b/i);
  if (iphone) return iphone[0];
  const galaxy = name.match(/\bGalaxy\s+(?:S|A|Z|Note)\d[\w\s]*/i);
  if (galaxy) return galaxy[0].trim();
  const pixel = name.match(/\bPixel\s+\d+(?:\s+Pro)?\b/i);
  if (pixel) return pixel[0];
  return null;
}

function parseRouterModel(name: string): string | null {
  const rt = name.match(/\bRT-[A-Z0-9-]+\b/i);
  return rt ? rt[0] : null;
}

function parseTvModel(name: string): string | null {
  const model = name.match(/\b\d{2}V\d[A-Z0-9]+\b/i);
  return model ? model[0] : null;
}

function parseStorageSeries(name: string): string | null {
  const e = name.match(/\bE100\b/i);
  if (e) return e[0];
  const pro = name.match(/\b990\s+PRO\b/i);
  if (pro) return pro[0];
  return null;
}

function parseApplianceModelId(name: string): string | null {
  const dotted = name.match(/\b[A-Z]{2}\d{2}[A-Z]{3}\.[A-Z]{4}\b/);
  if (dotted) return dotted[0];
  return null;
}

function parseCaseModel(name: string): string | null {
  const a21 = name.match(/\bA21\s+PLUS\b/i);
  if (a21) return a21[0];
  return null;
}

function parseMonitorModelCode(name: string): string | null {
  const hp = name.match(/\b732xk\b/i);
  if (hp) return hp[0];
  return null;
}

function parseAppleSilicon(name: string): string | null {
  const m = name.match(/\bM[123](?:\s+Pro|\s+Max)?\b/i);
  return m ? m[0] : null;
}

function parseSeries(name: string): string[] {
  const series: string[] = [];
  const patterns = [
    /\bROG\s+(?:Strix|Zephyrus|TUF|Swift|Crosshair|Hyperion|Astral|Matrix)[\w\s-]*/i,
    /\bThinkPad\s+\w+/i,
    /\bIdeaPad\s+\w+/i,
    /\bLegion\s+\w+/i,
    /\bMacBook\s+(?:Air|Pro)/i,
    /\bVivoBook\s+\w+/i,
    /\bZenBook\s+\w+/i,
    /\bPredator\s+\w+/i,
    /\bNitro\s+\w+/i,
    /\bOdyssey\s+\w+/i,
    /\bWH-\d+/i,
    /\b990\s+PRO\b/i,
    /\b980\s+PRO\b/i,
    /\b870\s+EVO\b/i,
    /\bSeries\s+\d+\s+Pro\b/i,
    /\bA21\s+PLUS\b/i,
    /\bE100\b/i,
  ];
  for (const p of patterns) {
    const m = name.match(p);
    if (m) series.push(m[0].trim());
  }
  return [...new Set(series)];
}

function parseWifi(name: string): string | null {
  const wifi = name.match(/\bWi-?Fi\s*(?:6E?|7)\b/i) ?? name.match(/\bAX\d{3,4}\b/i);
  return wifi ? wifi[0].replace(/\s+/g, " ") : null;
}

function parseColor(name: string): string | null {
  const tail = name.split(/\s-\s/).pop() ?? name;
  const match = tail.match(COLORS);
  return match ? match[0] : null;
}

/** Conservative cleaning — removes only high-confidence supplier noise. */
function stripSupplierCodes(name: string): string {
  return normalizeReusableLabel(
    name
      .replace(AMD_TRAY_CODE, " ")
      .replace(TRAILING_MANUFACTURER_PAREN, "")
      .replace(TRAILING_DASH_SUPPLIER_SUFFIX, "")
      .replace(TRAILING_NOISE, "")
      .replace(/\s-\s*$/g, "")
      .replace(/\(\s*\)/g, ""),
  );
}

function buildModelLabel(name: string, brand: string): string {
  const brandRe = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
  let label = stripSupplierCodes(name).replace(brandRe, "").trim();
  label = label.replace(COLORS, "").replace(/\s-\s*$/, "").trim();
  if (!label) return stripSupplierCodes(name);
  return label;
}

/** Extract literal phrases present in the original source name. */
export function extractSourceLiterals(sourceName: string): string[] {
  const found = new Set<string>();
  for (const pattern of SOURCE_LITERAL_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = re.exec(sourceName)) !== null) {
      const token = match[0].trim();
      if (token.length >= 2) found.add(token);
    }
  }
  return [...found];
}

function collectExplicitTokens(facts: Omit<ProductFacts, "explicitTokens">, sourceName: string): string[] {
  const tokens = new Set<string>();

  for (const literal of extractSourceLiterals(sourceName)) {
    tokens.add(literal);
  }

  if (facts.screenInchesRaw) tokens.add(facts.screenInchesRaw);
  if (facts.resolution) tokens.add(facts.resolution);
  for (const cap of facts.capacities) tokens.add(cap.raw);
  if (facts.gpuModel) tokens.add(facts.gpuModel);
  if (facts.cpuModel) tokens.add(facts.cpuModel);
  if (facts.phoneModel) tokens.add(facts.phoneModel);
  if (facts.laptopSeries) tokens.add(facts.laptopSeries);
  if (facts.wifiGeneration) tokens.add(facts.wifiGeneration);
  if (facts.color) tokens.add(facts.color);
  for (const s of facts.series) tokens.add(s);

  const routerModel = parseRouterModel(sourceName);
  if (routerModel) tokens.add(routerModel);
  const tvModel = parseTvModel(sourceName);
  if (tvModel) tokens.add(tvModel);
  const applianceId = parseApplianceModelId(sourceName);
  if (applianceId) tokens.add(applianceId);
  const caseModel = parseCaseModel(sourceName);
  if (caseModel) tokens.add(caseModel);
  const monitorCode = parseMonitorModelCode(sourceName);
  if (monitorCode) tokens.add(monitorCode);
  const appleSilicon = parseAppleSilicon(sourceName);
  if (appleSilicon) tokens.add(appleSilicon);
  const storageSeries = parseStorageSeries(sourceName);
  if (storageSeries) tokens.add(storageSeries);

  return [...tokens];
}

/** Parse factual product attributes from Excel name + metadata. No hallucinated specs. */
export function parseProductFacts(input: {
  sku: string;
  name: string;
  brand: string;
  category: string;
}): ProductFacts {
  const name = normalizeReusableLabel(input.name);
  const brand = normalizeReusableLabel(input.brand);
  const category = normalizeReusableLabel(input.category);
  const categoryKind = detectCategoryKind(category);
  const cleanName = stripSupplierCodes(name);
  const modelLabel = buildModelLabel(name, brand);
  const { value: screenInches, raw: screenInchesRaw } = parseScreenInches(name);
  const resolution = parseResolution(name);
  const capacities = parseCapacities(name, categoryKind);
  const primaryStorage = capacities.find((c) => c.kind === "storage") ?? (categoryKind === "storage" ? capacities[0] ?? null : null);
  const primaryMemory = capacities.find((c) => c.kind === "memory") ?? null;
  const gpuModel = parseGpuModel(name);
  const cpuModel = parseCpuModel(name);
  const phoneModel = parsePhoneModel(name);
  const laptopSeries =
    name.match(/\b(?:MacBook|ThinkPad|IdeaPad|Legion|VivoBook|ZenBook|Nitro|Predator|ROG\s+\w+)\s*[\w.-]*/i)?.[0]?.trim() ??
    null;
  const tvSizeInches = categoryKind === "tv" ? screenInches : null;
  const color = parseColor(name);
  const series = parseSeries(name);
  const wifiGeneration = parseWifi(name);
  const formFactor = /\bM\.2\b/i.test(name) ? "M.2" : /\bATX\b/i.test(name) ? "ATX" : /\bMicro-ATX\b/i.test(name) ? "Micro-ATX" : null;

  const partial: Omit<ProductFacts, "explicitTokens"> = {
    sku: input.sku,
    name,
    brand,
    category,
    categoryKind,
    cleanName,
    modelLabel,
    productTypeKa: productTypeKa(categoryKind, category),
    screenInches: categoryKind === "monitor" || categoryKind === "laptop" ? screenInches : null,
    screenInchesRaw,
    resolution: categoryKind === "monitor" || categoryKind === "tv" || categoryKind === "laptop" ? resolution : null,
    capacities,
    primaryStorage,
    primaryMemory,
    gpuModel,
    cpuModel: categoryKind === "cpu" || categoryKind === "laptop" ? cpuModel : cpuModel,
    phoneModel: categoryKind === "phone" ? phoneModel : phoneModel,
    laptopSeries: categoryKind === "laptop" ? laptopSeries : laptopSeries,
    tvSizeInches,
    color,
    series,
    wifiGeneration: categoryKind === "router" ? wifiGeneration : wifiGeneration,
    formFactor,
  };

  return { ...partial, explicitTokens: collectExplicitTokens(partial, name) };
}

/** Aggressive supplier-token removal for URL slugs only — not used for AI factual payloads. */
const SLUG_SUPPLIER_TOKENS =
  /\b(?:[A-Z]{2,}\d[A-Z0-9-]{4,}|\d{2,}[A-Z]{2,}\d[A-Z0-9-]{3,}|[A-Z]{2,}-\d{2,}[A-Z0-9-]{2,}|\d{4}-\d{3}-\d{6,})\b/gi;

/** Remove supplier/manufacturer part numbers for slug building. */
export function stripSlugNoise(name: string): string {
  return stripSupplierCodes(name)
    .replace(SLUG_SUPPLIER_TOKENS, " ")
    .replace(COLORS, "")
    .replace(/\b(?:tray|boxed|bulk|oem|retail)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
