import { randomBytes, scrypt as derive, timingSafeEqual } from "node:crypto";
function scrypt(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    derive(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [algorithm, salt, encoded] = hash.split(":");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !encoded ||
    !/^[a-f0-9]{128}$/.test(encoded)
  )
    return false;
  const key = await scrypt(password, salt);
  return timingSafeEqual(key, Buffer.from(encoded, "hex"));
}
