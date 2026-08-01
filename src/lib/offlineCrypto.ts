import { getMasterKeyRecord, saveMasterKeyRecord } from "./offlineDb";

// AES-GCM is used for both the per-item content encryption AND as the wrap
// algorithm for the master key (rather than AES-KW), for broader/older
// Safari compatibility — iOS Safari support matters a lot for this app.
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_BYTES = 12;

let masterKeyPromise: Promise<CryptoKey> | null = null;

// Non-extractable: once generated, no script — not even one run from this
// origin's own devtools console — can ever read out its raw bytes. It can
// only be *used* via crypto.subtle calls that take the key object itself,
// which is what makes the wrapped per-item keys below useless without it.
function getOrCreateMasterKey(): Promise<CryptoKey> {
  if (!masterKeyPromise) {
    masterKeyPromise = (async () => {
      const existing = await getMasterKeyRecord();
      if (existing) return existing;

      const key = await crypto.subtle.generateKey(
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ["wrapKey", "unwrapKey"]
      );
      await saveMasterKeyRecord(key);
      return key;
    })();
  }
  return masterKeyPromise;
}

export interface EncryptedPayload {
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  wrappedKey: ArrayBuffer;
  wrapIv: ArrayBuffer;
}

export async function encryptForStorage(plaintext: ArrayBuffer): Promise<EncryptedPayload> {
  const masterKey = await getOrCreateMasterKey();

  const contentKey = await crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, [
    "encrypt",
    "decrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, contentKey, plaintext);

  const wrapIv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrappedKey = await crypto.subtle.wrapKey("raw", contentKey, masterKey, {
    name: ALGORITHM,
    iv: wrapIv,
  });

  return { ciphertext, iv: iv.buffer, wrappedKey, wrapIv: wrapIv.buffer };
}

export async function decryptFromStorage(payload: EncryptedPayload): Promise<ArrayBuffer> {
  const masterKey = await getOrCreateMasterKey();

  const contentKey = await crypto.subtle.unwrapKey(
    "raw",
    payload.wrappedKey,
    masterKey,
    { name: ALGORITHM, iv: payload.wrapIv },
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt({ name: ALGORITHM, iv: payload.iv }, contentKey, payload.ciphertext);
}
