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
  /** Raw document content (HTML or other) — will be encrypted automatically */
  payload: string;
  /** Number of copies (minimum 1, default 1) */
  copies?: number;
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
