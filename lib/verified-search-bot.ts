/**
 * Verified search-engine crawler detection for rate-limit exemption.
 *
 * Never trusts User-Agent alone. Google: published IP ranges (+ optional rDNS).
 * Bing: reverse DNS forward-confirmed to search.msn.com.
 */

const GOOGLEBOT_RANGES_URL =
  "https://developers.google.com/static/search/apis/ipranges/googlebot.json";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RANGES_REFRESH_MS = 6 * 60 * 60 * 1000;

type IpVerificationCache = { verified: boolean; expiresAt: number };

const ipCache = new Map<string, IpVerificationCache>();

let googlePrefixes: { ipv4: string[]; ipv6: string[] } | null = null;
let googlePrefixesFetchedAt = 0;

type GoogleRangesResponse = {
  prefixes?: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }>;
};

function cacheGet(ip: string): boolean | null {
  const hit = ipCache.get(ip);
  if (!hit || Date.now() > hit.expiresAt) {
    ipCache.delete(ip);
    return null;
  }
  return hit.verified;
}

function cacheSet(ip: string, verified: boolean): void {
  ipCache.set(ip, { verified, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function claimsSearchBot(userAgent: string): "google" | "bing" | null {
  const ua = userAgent.toLowerCase();
  if (/googlebot-image|googlebot/.test(ua)) return "google";
  if (/bingbot/.test(ua)) return "bing";
  return null;
}

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => Number.parseInt(p, 10));
  if (octets.some((o) => !Number.isFinite(o) || o < 0 || o > 255)) return null;
  return octets;
}

/** @internal */
export function ipv4InCidr(ip: string, cidr: string): boolean {
  const addr = parseIpv4(ip);
  if (!addr) return false;
  const [network, bitsStr] = cidr.split("/");
  const bits = Number.parseInt(bitsStr ?? "", 10);
  if (!network || !Number.isFinite(bits) || bits < 0 || bits > 32) return false;
  const net = parseIpv4(network);
  if (!net) return false;

  const ipNum =
    ((addr[0] << 24) >>> 0) +
    ((addr[1] << 16) >>> 0) +
    ((addr[2] << 8) >>> 0) +
    (addr[3] >>> 0);
  const netNum =
    ((net[0] << 24) >>> 0) +
    ((net[1] << 16) >>> 0) +
    ((net[2] << 8) >>> 0) +
    (net[3] >>> 0);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (netNum & mask);
}

function normalizeIpv6(ip: string): string | null {
  try {
    // Expand :: shorthand via URL hostname parsing trick on bracketed v6.
    if (!ip.includes(":")) return null;
    const expanded = ip
      .split("::")
      .map((part) => part.split(":").filter(Boolean))
      .flat();
    if (ip.includes("::")) {
      const missing = 8 - expanded.length;
      if (missing < 0) return null;
      const head = ip.split("::")[0].split(":").filter(Boolean);
      const tail = ip.split("::")[1]?.split(":").filter(Boolean) ?? [];
      const full = [...head, ...Array(missing).fill("0"), ...tail];
      if (full.length !== 8) return null;
      return full.map((h) => h.padStart(4, "0")).join(":");
    }
    if (expanded.length !== 8) return null;
    return expanded.map((h) => h.padStart(4, "0")).join(":");
  } catch {
    return null;
  }
}

/** @internal Simplified IPv6 CIDR match (sufficient for published /128–/32 prefixes). */
export function ipv6InCidr(ip: string, cidr: string): boolean {
  const [network, bitsStr] = cidr.split("/");
  const bits = Number.parseInt(bitsStr ?? "", 10);
  if (!network || !Number.isFinite(bits) || bits < 0 || bits > 128) return false;
  const ipNorm = normalizeIpv6(ip);
  const netNorm = normalizeIpv6(network);
  if (!ipNorm || !netNorm) return false;

  const ipBits = ipNorm
    .split(":")
    .map((g) => Number.parseInt(g, 16))
    .map((n) => n.toString(2).padStart(16, "0"))
    .join("");
  const netBits = netNorm
    .split(":")
    .map((g) => Number.parseInt(g, 16))
    .map((n) => n.toString(2).padStart(16, "0"))
    .join("");
  return ipBits.slice(0, bits) === netBits.slice(0, bits);
}

/** @internal */
export function ipInGooglebotRanges(
  ip: string,
  prefixes: { ipv4: string[]; ipv6: string[] }
): boolean {
  if (ip.includes(":")) {
    return prefixes.ipv6.some((p) => ipv6InCidr(ip, p));
  }
  return prefixes.ipv4.some((p) => ipv4InCidr(ip, p));
}

async function loadGooglePrefixes(): Promise<{ ipv4: string[]; ipv6: string[] }> {
  const now = Date.now();
  if (googlePrefixes && now - googlePrefixesFetchedAt < RANGES_REFRESH_MS) {
    return googlePrefixes;
  }

  const res = await fetch(GOOGLEBOT_RANGES_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: RANGES_REFRESH_MS / 1000 },
  });
  if (!res.ok) {
    if (googlePrefixes) return googlePrefixes;
    throw new Error(`googlebot.json HTTP ${res.status}`);
  }

  const data = (await res.json()) as GoogleRangesResponse;
  const ipv4: string[] = [];
  const ipv6: string[] = [];
  for (const row of data.prefixes ?? []) {
    if (row.ipv4Prefix) ipv4.push(row.ipv4Prefix);
    if (row.ipv6Prefix) ipv6.push(row.ipv6Prefix);
  }
  googlePrefixes = { ipv4, ipv6 };
  googlePrefixesFetchedAt = now;
  return googlePrefixes;
}

function ipv4ToPtr(ip: string): string | null {
  const octets = parseIpv4(ip);
  if (!octets) return null;
  return `${octets[3]}.${octets[2]}.${octets[1]}.${octets[0]}.in-addr.arpa`;
}

type DnsAnswer = { data?: string };

type DnsJson = { Answer?: DnsAnswer[] };

async function dnsResolve(name: string, type: "PTR" | "A"): Promise<string[]> {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as DnsJson;
    return (data.Answer ?? [])
      .map((a) => a.data?.replace(/\.$/, "") ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Forward-confirmed reverse DNS (Google / Bing). */
async function verifyByReverseDns(
  ip: string,
  allowedSuffixes: string[]
): Promise<boolean> {
  const ptrName = ipv4ToPtr(ip);
  if (!ptrName) return false;

  const hostnames = await dnsResolve(ptrName, "PTR");
  for (const hostname of hostnames) {
    const lower = hostname.toLowerCase();
    const suffixOk = allowedSuffixes.some(
      (s) => lower === s.slice(1) || lower.endsWith(s)
    );
    if (!suffixOk) continue;

    const forward = await dnsResolve(hostname, "A");
    if (forward.includes(ip)) return true;
  }
  return false;
}

async function isGoogleCrawlerIp(ip: string): Promise<boolean> {
  try {
    const prefixes = await loadGooglePrefixes();
    if (ipInGooglebotRanges(ip, prefixes)) return true;
  } catch {
    /* fall through to rDNS */
  }
  try {
    return await verifyByReverseDns(ip, [".googlebot.com", ".google.com"]);
  } catch {
    return false;
  }
}

async function isBingCrawlerIp(ip: string): Promise<boolean> {
  try {
    return await verifyByReverseDns(ip, [".search.msn.com"]);
  } catch {
    return false;
  }
}

/**
 * True when the client IP is a verified search crawler (cached).
 * Google IPs in googlebot.json are exempt even without a bot UA.
 * Bing requires a Bingbot UA plus rDNS verification.
 */
export async function isVerifiedSearchCrawler(ip: string, userAgent: string): Promise<boolean> {
  const cached = cacheGet(ip);
  if (cached !== null) return cached;

  const claim = claimsSearchBot(userAgent);

  let verified = false;
  if (await isGoogleCrawlerIp(ip)) {
    verified = true;
  } else if (claim === "bing" && (await isBingCrawlerIp(ip))) {
    verified = true;
  } else if (claim === "google") {
    // UA claims Googlebot but IP not in published ranges and rDNS failed.
    verified = false;
  }

  cacheSet(ip, verified);
  return verified;
}

/** @internal */
export function _resetVerificationCachesForTests(): void {
  ipCache.clear();
  googlePrefixes = null;
  googlePrefixesFetchedAt = 0;
}

/** @internal Inject prefix list for tests (skips network). */
export function _setGooglePrefixesForTests(prefixes: { ipv4: string[]; ipv6: string[] }): void {
  googlePrefixes = prefixes;
  googlePrefixesFetchedAt = Date.now();
}
