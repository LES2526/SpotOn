import { DefaultSession } from "next-auth";
import { AdapterUser as BaseAdapterUser } from "next-auth/adapters";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/adapters" {
    interface AdapterUser extends BaseAdapterUser {
        studentId?: string | null;
    }
}
