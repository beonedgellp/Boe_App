import { prisma } from './prisma.js';
export { prisma };
export type Store = typeof prisma;
export function getStore() { return prisma; }
