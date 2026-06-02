export interface Printer {
  id: string;
  displayName: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Station {
  id: string;
  name: string;
  lastSeenAt: string | null;
  publicKey: string;
  createdAt: string;
  printers: Printer[];
}

export interface StationsResponse {
  stations: Station[];
}

export interface PrintRequest {
  /** UUID of the printer to send the job to */
  printer: string;
  /** Title/description of the print job */
  title: string;
  /**
   * Document content to print — will be encrypted automatically.
   * - `'html'` format: pass an HTML string.
   * - `'escpos'` format: pass the raw ESC/POS byte sequence as a `Uint8Array`.
   */
  payload: string | Uint8Array;
  /** Number of copies (minimum 1, default 1) */
  copies?: number;
  /**
   * Output format. Defaults to `'html'`.
   * - `'html'`   — payload is rendered as HTML by a Chromium instance on the station.
   * - `'escpos'` — payload is the raw ESC/POS byte sequence sent directly to the printer.
   */
  format?: 'html' | 'escpos';
  /** Override the API base URL (e.g. "https://my.server.com/api/"). Defaults to the EasyReceipt cloud endpoint. */
  baseUrl?: string;
}

export interface PrintResponse {
  jobId: string;
}

export interface OpenCashDrawerResponse {
  jobId: string;
}

/** @deprecated No longer needed — removed in favour of plain function arguments */
export interface EasyReceiptConfig {
  apiKeys: string[];
  baseUrl?: string;
}
