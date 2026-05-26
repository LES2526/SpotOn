import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        apiFolder: "app/api",
        definition: {
            openapi: "3.0.0",
            info: {
                title: "SpotOn API",
                version: "1.0",
                description:
                    "REST API for the SpotOn study-space booking platform. " +
                    "Most endpoints require an authenticated NextAuth session cookie.",
            },
            components: {
                securitySchemes: {
                    sessionCookie: {
                        type: "apiKey",
                        in: "cookie",
                        name: "next-auth.session-token",
                        description:
                            "NextAuth database session cookie. Obtained after signing in via /api/auth/signin/email.",
                    },
                },
            },
            security: [{ sessionCookie: [] }],
        },
    });
    return spec;
};
