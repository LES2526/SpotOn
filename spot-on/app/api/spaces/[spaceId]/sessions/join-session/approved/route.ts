import { Params } from "next/dist/server/request/params";

type Params = { params: { spaceId: string } };

export async function PATCH(_request: Request, { params }: Params) {
}
