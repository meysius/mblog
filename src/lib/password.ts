import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// OWASP's recommended scrypt cost. The parameters are stored with each hash,
// so raising them later still verifies older passwords.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 32;

function deriveKey(password: string, salt: Buffer, params: typeof PARAMS, length = KEY_LENGTH) {
  // scrypt needs 128 * N * r bytes; Node's default 32 MB cap is too low for N = 2^17.
  const options: ScryptOptions = { ...params, maxmem: 256 * params.N * params.r };
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, length, options, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

/** Returns "scrypt$N$r$p$salt$key", with salt and key in base64. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, PARAMS);
  const { N, r, p } = PARAMS;
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, hash: string) {
  const [scheme, N, r, p, salt, key] = hash.split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(key, "base64");
  const actual = await deriveKey(
    password,
    Buffer.from(salt, "base64"),
    { N: Number(N), r: Number(r), p: Number(p) },
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}
