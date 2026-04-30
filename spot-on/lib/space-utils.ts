import { prisma } from '@/lib/prisma';

export async function findSpace(spaceId: string) {
    return prisma.space.findUnique({ where: { id: spaceId } });
}
