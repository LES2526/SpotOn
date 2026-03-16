import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };

export const PATCH = async (_request: Request, { params }: Params) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized' }, { status: 401 });
    }
    const { spaceId } = params;
    const space = await prisma.space.findUnique({
        where: { id: spaceId }
    });
    if (!space) {
        return NextResponse.json({ error: 'Space not found' },
            { status: 404 });
    }
    const expectedEndTime =
}
