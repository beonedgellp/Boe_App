import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export async function hashPassword(password: any) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt,
    Buffer.from(derived).toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: any, storedHash: any) {
  if (!password || !storedHash) return false;

  const [scheme, cost, blockSize, parallelization, salt, hash] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'base64url');
  const derived = await scryptAsync(password, salt, expected.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });
  const actual = Buffer.from(derived);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
