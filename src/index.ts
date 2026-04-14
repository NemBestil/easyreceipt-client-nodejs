import sodium from "libsodium-wrappers";
import { OpenCashDrawerResponse, PrintRequest, PrintResponse, StationsResponse } from "./types";

export type { EasyReceiptConfig, OpenCashDrawerResponse, Printer, PrintRequest, PrintResponse, Station, StationsResponse } from "./types";

const BASE_URL = "https://app.easyreceipt.eu/api/";

// RFC 4122 UUID (versions 1–5)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuids(keys: string[]): void {
  const invalid = keys.filter((k) => !UUID_RE.test(k));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid station key(s) — must be RFC 4122 UUIDs: ${invalid.join(", ")}`
    );
  }
}

/**
 * Fetch stations and their printers for the given station API keys.
 * Only stations matching recognised keys are returned by the server.
 * Throws if any key is not a valid RFC 4122 UUID.
 */
export async function getStationsWithPrinters(
  apiKeys: string[]
): Promise<StationsResponse> {
  assertUuids(apiKeys);
  return post("integration-app/stations-with-printers", { stations: apiKeys });
}

/**
 * Returns true if the given station API key is recognised by the server,
 * false if it is unknown or has been removed.
 * Throws if the key is not a valid RFC 4122 UUID.
 */
export async function isValidStation(apiKey: string): Promise<boolean> {
  const { stations } = await getStationsWithPrinters([apiKey]);
  return stations.length > 0;
}

/**
 * Encrypt a document payload and submit a print job.
 *
 * The payload is encrypted using the target station's public key via
 * libsodium sealed box (crypto_box_seal / X25519 + XSalsa20-Poly1305),
 * ensuring only the physical station can decrypt it.
 *
 * @param request   - Print job details. `payload` is the raw content (e.g. HTML).
 * @param publicKey - The station's base64-encoded Curve25519 public key,
 *                    obtained from getStationsWithPrinters().
 */
export async function print(
  request: PrintRequest,
  publicKey: string
): Promise<PrintResponse> {
  await sodium.ready;

  const publicKeyBytes = sodium.from_base64(
    publicKey,
    sodium.base64_variants.ORIGINAL
  );

  if (publicKeyBytes.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error(
      `Invalid public key length: expected ${sodium.crypto_box_PUBLICKEYBYTES} bytes, got ${publicKeyBytes.length}`
    );
  }

  const ciphertext = sodium.crypto_box_seal(
    sodium.from_string(request.payload),
    publicKeyBytes
  );

  return post("integration-app/print", {
    printer: request.printer,
    title: request.title,
    payload: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    copies: request.copies ?? 1,
  });
}

/**
 * Send an open signal to a cash drawer attached to the given printer.
 *
 * @param printerId - UUID of the printer whose cash drawer should be opened.
 */
export async function openCashDrawer(
  printerId: string
): Promise<OpenCashDrawerResponse> {
  assertUuids([printerId]);
  return post("integration-app/open-cash-drawer", { printer: printerId });
}

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`EasyReceipt API error ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}
