import { createSwaggerSpec } from "next-swagger-doc";

const nextAuthDocs = {
  paths: {
    '/api/auth/session': {
      get: {
        tags: ['Auth'],
        summary: 'Get current session',
        responses: {
          200: {
            description: 'Returns the session object',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Session' } } }
          }
        }
      }
    },
    '/api/auth/signin/email': {
      post: {
        tags: ['Auth'],
        summary: 'Send Magic Link email',
        requestBody: {
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'student@ualg.pt' },
                  csrfToken: { type: 'string' }
                },
                required: ['email', 'csrfToken']
              }
            }
          }
        },
        responses: {
          200: { description: 'Magic link sent successfully' }
        }
      }
    },
    '/api/auth/signout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out',
        responses: { 200: { description: 'Successfully signed out' } }
      }
    }
  },
  components: {
    schemas: {
      Session: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              studentId: { type: 'string' }
            }
          },
          expires: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "app/api", // define api folder under app folder
    definition: {
      openapi: "3.0.0",
      info: {
        title: "SpotOn API",
        version: "1.0",
      },
      components: {
        // securitySchemes: {
        //   BearerAuth: {
        //     type: "http",
        //     scheme: "bearer",
        //     bearerFormat: "JWT",
        //   },
        // },
      },
      security: [],
    },
  });
  return spec;
};