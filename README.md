# easyreceipt-node-client

A TypeScript-first Node.js client for the [EasyReceipt](https://app.easyreceipt.eu) print API. Send encrypted print jobs to receipt printers from any Node.js application.

## Installation

```bash
npm install easyreceipt-node-client
```

> **Requirements:** Node.js 18+ (uses the built-in `fetch` API).

## Quick Start

```typescript
import { getStationsWithPrinters, print } from "easyreceipt-node-client";

const apiKeys = [
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "b2c3d4e5-f6a7-8901-bcde-f12345678901",
];

const { stations } = await getStationsWithPrinters(apiKeys);
const station = stations[0];
const printer = station.printers[0];

const { jobId } = await print(
  {
    printer: printer.id,
    title: "Order #1234",
    payload: "<html><body><h1>Thank you for your order!</h1></body></html>",
    copies: 1,
  },
  station.publicKey
);

console.log("Print job submitted:", jobId);
```

## API

### `getStationsWithPrinters(apiKeys)`

Fetches the list of stations and their connected printers. The server only returns stations for API keys it recognises, so you can safely pass all your keys and let the server filter.

Throws a `TypeError` synchronously if any key in the array is not a valid RFC 4122 UUID (versions 1–5).

```typescript
const apiKeys = [
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "b2c3d4e5-f6a7-8901-bcde-f12345678901",
];

const { stations } = await getStationsWithPrinters(apiKeys);

for (const station of stations) {
  console.log(`Station: ${station.name} (last seen: ${station.lastSeenAt})`);

  for (const printer of station.printers) {
    console.log(`  Printer: ${printer.displayName} [${printer.id}]`);
  }
}
```

**Returns:** `Promise<StationsResponse>`

```typescript
interface StationsResponse {
  stations: Station[];
}

interface Station {
  id: string;
  name: string;
  lastSeenAt: string | null;
  publicKey: string;       // pass this to print()
  createdAt: string;
  printers: Printer[];
}

interface Printer {
  id: string;              // pass this to print() as printer
  displayName: string;
  lastSeenAt: string | null;
  createdAt: string;
}
```

---

### `isValidStation(apiKey)`

Checks whether a single station API key is recognised by the server. Returns `true` if the station exists, `false` if not. Throws if the key is not a valid RFC 4122 UUID.

```typescript
const valid = await isValidStation("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
console.log(valid ? "Station is active" : "Station not found");
```

**Returns:** `Promise<boolean>`

---

### `print(request, publicKey)`

Encrypts the document payload and submits a print job. See the [Security Model](#security-model) section for details on how encryption works.

```typescript
const { jobId } = await print(
  {
    printer: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    title: "Invoice #INV-2026-0042",
    payload: htmlContent,  // raw content — encrypted automatically
    copies: 2,
  },
  station.publicKey  // base64-encoded Curve25519 public key from the station
);
```

| Field     | Type     | Required | Description                                                             |
| --------- | -------- | -------- | ----------------------------------------------------------------------- |
| `printer` | `string` | ✅        | UUID of the target printer                                              |
| `title`   | `string` | ✅        | Human-readable label for the job                                        |
| `payload` | `string` | ✅        | Document content to print (e.g. HTML). Encrypted automatically.         |
| `copies`  | `number` | —        | Number of copies. Minimum 1, defaults to 1.                             |

**Returns:** `Promise<PrintResponse>`

```typescript
interface PrintResponse {
  jobId: string; // UUID of the created print job
}
```

---

## Common Patterns

### Check if a station API key is valid

```typescript
import { isValidStation } from "easyreceipt-node-client";

const valid = await isValidStation("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

if (!valid) {
  console.error("API key is not valid or station does not exist");
} else {
  console.log("Station is active");
}
```

---

### Get a flat list of all printers across multiple station keys

```typescript
import { getStationsWithPrinters } from "easyreceipt-node-client";

const apiKeys = [
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "b2c3d4e5-f6a7-8901-bcde-f12345678901",
];

const { stations } = await getStationsWithPrinters(apiKeys);

const printers = stations.flatMap((station) =>
  station.printers.map((printer) => ({
    printerId: printer.id,
    printerName: printer.displayName,
    stationName: station.name,
    publicKey: station.publicKey,
  }))
);

console.log(`Found ${printers.length} printer(s) across ${stations.length} station(s):`);
for (const p of printers) {
  console.log(`  [${p.stationName}] ${p.printerName} — ${p.printerId}`);
}
```

---

### Complete example: print to the first available printer

```typescript
import { getStationsWithPrinters, print } from "easyreceipt-node-client";

const apiKeys = [
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "b2c3d4e5-f6a7-8901-bcde-f12345678901",
];

const { stations } = await getStationsWithPrinters(apiKeys);

if (stations.length === 0) throw new Error("No valid stations found");

const station = stations[0];
const printer = station.printers[0];

if (!printer) throw new Error(`Station "${station.name}" has no printers`);

const html = `
<html>
<head>
  <style>
    body { margin: 0; font-family: monospace; font-size: 12px; }
    h1 { font-size: 14px; text-align: center; }
    hr { border: none; border-top: 1px dashed #000; }
    .total { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Order #1042</h1>
  <hr>
  <p>2x Espresso &nbsp;&nbsp;&nbsp; $6.00</p>
  <p>1x Croissant &nbsp;&nbsp;&nbsp; $3.50</p>
  <hr>
  <p class="total">Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; $9.50</p>
</body>
</html>
`;

const { jobId } = await print(
  {
    printer: printer.id,
    title: "Order #1042",
    payload: html,
    copies: 1,
  },
  station.publicKey
);

console.log(`Job ${jobId} sent to "${printer.displayName}" on station "${station.name}"`);
```

---

## Authoring HTML for Receipt Printers

The payload is rendered by a Chromium instance on the station, so you have access to the full modern CSS feature set — including `@media print`, `page-break-before`/`break-after`, CSS Grid, and custom fonts.

**Layout**

- Set `margin: 0` on `body`. Receipt paper has no margins and the printer starts at the physical edge.
- Do not use fixed pixel widths. Receipt paper varies (typically 58 mm or 80 mm wide), so use `width: 100%` or relative units and let the content reflow.
- Use `word-break: break-word` on any content that might contain long strings (URLs, order IDs) to prevent clipping.

**Page breaks**

```css
.new-section {
  break-before: page; /* start a new receipt page */
}
```

**Colors and grayscale**

> ⚠️ **Avoid colors entirely — including grayscale.** Most thermal receipt printers are binary devices: each dot is either printed or not. There is typically no dithering or halftoning, so shades of grey and any color will be converted to solid black or dropped completely. Stick to pure black (`#000`) on white (`#fff`) for predictable output. Borders, rules, and bold text are safe; background fills and images with gradients are not.

---

## Security Model

### End-to-end encryption with sealed boxes

Every document payload is encrypted **before it leaves your server**, using [libsodium](https://libsodium.org)'s `crypto_box_seal` — an implementation of X25519 key exchange combined with XSalsa20-Poly1305 authenticated encryption.

```
Your server                  EasyReceipt cloud              Printer station
───────────────              ─────────────────              ───────────────
HTML document
    │
    ▼
encrypt(doc, publicKey) ──► ciphertext stored ──────────► decrypt(ciphertext, privateKey)
                             (unreadable)                       │
                                                               ▼
                                                          original HTML
                                                          sent to printer
```

### What this means in practice

- **The private key never leaves the station.** When a printer station first registers, it generates a Curve25519 key pair locally. The private key is stored only on that device and is never transmitted anywhere — not to EasyReceipt's servers, and not to your application.

- **EasyReceipt's servers cannot read your documents.** The cloud infrastructure acts purely as an encrypted relay. Even if a server were compromised, an attacker would see only opaque ciphertext — they cannot decrypt it without the private key held on the physical station.

- **Your application cannot read its own sent documents.** Sealed box encryption is *asymmetric and anonymous*: encryption uses only the recipient's public key, so the sender has no decryption capability. Once sent, the ciphertext is readable only by the station.

- **Integrity is guaranteed.** The Poly1305 authentication tag is verified on decryption. Any tampering with the ciphertext in transit will cause decryption to fail, and the job will be rejected.

- **The public key is safe to transmit.** It is returned by `getStationsWithPrinters()` and is intended to be used by your application. Knowing the public key grants the ability to *send* encrypted messages to a station, but not to read them.

### Algorithm details

| Property        | Value                          |
| --------------- | ------------------------------ |
| Key exchange    | X25519 (Curve25519 ECDH)       |
| Encryption      | XSalsa20 stream cipher         |
| Authentication  | Poly1305 MAC                   |
| Key size        | 32 bytes (256-bit)             |
| Overhead        | 48 bytes per message           |
| Standard        | NaCl `crypto_box_seal`         |

---

## License

MIT
