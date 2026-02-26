/**
 * @jest-environment node
 */

import axios, { AxiosError } from 'axios';
import { prisma } from '@/lib/prisma';


/**
 * Integration tests using Axios for POST /api/spaces/[spaceId]/sessions
 * 
 * Prerequisites:
 * 1. Start your Next.js dev server: npm run dev
 * 2. Set up a test database
 * 3. Run migrations: npx prisma migrate deploy
 * 4. Install axios: npm install --save-dev axios
 * 
 * Run with: npm test -- session.axios.integration.test.ts
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe('POST /api/spaces/[spaceId]/sessions - Axios Integration', () => {
    let testSpace: any;
    let testUser: any;

    // Setup: Create test data before all tests
    beforeAll(async () => {
        // Create a test user
        testUser = await prisma.user.create({
            data: {
                email: 'testuser-' + Date.now() + '@ualg.pt',
                name: 'Test User',
            },
        });

        // Create a test space
        testSpace = await prisma.space.create({
            data: {
                name: 'Test Study Room',
                location: 'Test Building, Floor 1',
                capacity: 4,
                description: 'Integration test space',
                hasPowerOutlet: true,
            },
        });
    });

    // Cleanup: Delete test data after all tests
    afterAll(async () => {
        // Delete sessions first (due to foreign key constraints)
        await prisma.studySession.deleteMany({
            where: {
                spaceId: testSpace.id,
            },
        });

        // Delete test space and user
        await prisma.space.delete({ where: { id: testSpace.id } });
        await prisma.user.delete({ where: { id: testUser.id } });

        // Disconnect Prisma
        await prisma.$disconnect();
    });

    // Clear sessions between tests
    afterEach(async () => {
        await prisma.studySession.deleteMany({
            where: {
                spaceId: testSpace.id,
            },
        });
    });

    it('should successfully create a new session', async () => {
        // Arrange
        const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
        const payload = { hostId: testUser.id };

        // Act
        const response = await axios.post(url, payload);

        // Assert
        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
            id: expect.any(String),
            spaceId: testSpace.id,
            hostId: testUser.id,
            status: 'ACTIVE',
        });
        expect(response.data.space).toBeDefined();
        expect(response.data.space.name).toBe('Test Study Room');
        expect(response.data.host).toBeDefined();
        expect(response.data.host.name).toBe('Test User');

        // Verify in database
        const sessionInDb = await prisma.studySession.findUnique({
            where: { id: response.data.id },
        });
        expect(sessionInDb).toBeTruthy();
        expect(sessionInDb?.spaceId).toBe(testSpace.id);
    });

    it('should reject when space does not exist', async () => {
        // Arrange
        const url = `${BASE_URL}/api/spaces/nonexistent-space-id/sessions`;
        const payload = { hostId: testUser.id };

        // Act & Assert
        try {
            await axios.post(url, payload);
            fail('Expected request to fail with 404');
        } catch (error) {
            const axiosError = error as AxiosError;
            expect(axiosError.response?.status).toBe(404);
            expect(axiosError.response?.data).toEqual({ error: 'Space not found' });
        }
    });

    it('should reject when space is already occupied', async () => {
        // Arrange - Create an existing active session
        await prisma.studySession.create({
            data: {
                spaceId: testSpace.id,
                hostId: testUser.id,
                expectedEndTime: new Date(Date.now() + 60 * 60 * 1000),
                status: 'ACTIVE',
            },
        });

        const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
        const payload = { hostId: testUser.id };

        // Act & Assert
        try {
            await axios.post(url, payload);
            fail('Expected request to fail with 409');
        } catch (error) {
            const axiosError = error as AxiosError;
            expect(axiosError.response?.status).toBe(409);
            expect(axiosError.response?.data).toEqual({ error: 'Space is already occupied' });
        }
    });

    it('should allow creating session when previous session is not ACTIVE', async () => {
        // Arrange - Create a completed session
        await prisma.studySession.create({
            data: {
                spaceId: testSpace.id,
                hostId: testUser.id,
                expectedEndTime: new Date(Date.now() - 60 * 60 * 1000),
                actualEndTime: new Date(),
                status: 'COMPLETED',
            },
        });

        const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
        const payload = { hostId: testUser.id };

        // Act
        const response = await axios.post(url, payload);

        // Assert
        expect(response.status).toBe(201);
        expect(response.data.status).toBe('ACTIVE');

        // Verify there are now 2 sessions in the database
        const sessionsCount = await prisma.studySession.count({
            where: { spaceId: testSpace.id },
        });
        expect(sessionsCount).toBe(2);
    });

    it('should set expectedEndTime to approximately 1 hour from now', async () => {
        // Arrange
        const now = new Date();
        const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
        const payload = { hostId: testUser.id };

        // Act
        const response = await axios.post(url, payload);

        // Assert
        const expectedEndTime = new Date(response.data.expectedEndTime);
        const timeDiff = expectedEndTime.getTime() - now.getTime();
        const oneHourInMs = 60 * 60 * 1000;

        // Allow 5 second tolerance for test execution
        expect(timeDiff).toBeGreaterThanOrEqual(oneHourInMs - 5000);
        expect(timeDiff).toBeLessThanOrEqual(oneHourInMs + 5000);
    });

    it('should handle missing hostId gracefully', async () => {
        // Arrange
        const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
        const payload = {}; // Missing hostId

        // Act & Assert
        try {
            await axios.post(url, payload);
            fail('Expected request to fail with 500');
        } catch (error) {
            const axiosError = error as AxiosError;
            expect(axiosError.response?.status).toBe(500);
            expect(axiosError.response?.data).toEqual({ error: 'Failed to create session' });
        }
    });

    it('should return proper response headers', async () => {
        // Arrange
        const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
        const payload = { hostId: testUser.id };

        // Act
        const response = await axios.post(url, payload);

        // Assert
        expect(response.headers['content-type']).toContain('application/json');
    });

    it('should include all session fields in response', async () => {
        // Arrange
        const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
        const payload = { hostId: testUser.id };

        // Act
        const response = await axios.post(url, payload);

        // Assert - Verify all expected fields are present
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('spaceId');
        expect(response.data).toHaveProperty('hostId');
        expect(response.data).toHaveProperty('startTime');
        expect(response.data).toHaveProperty('expectedEndTime');
        expect(response.data).toHaveProperty('actualEndTime');
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('createdAt');
        expect(response.data).toHaveProperty('updatedAt');
        expect(response.data).toHaveProperty('space');
        expect(response.data).toHaveProperty('host');
    });

    describe('Concurrent requests', () => {
        it('should handle race condition where two users try to book the same space', async () => {
            // Arrange
            const user2 = await prisma.user.create({
                data: {
                    email: 'testuser2-' + Date.now() + '@ualg.pt',
                    name: 'Test User 2',
                },
            });

            const url = `${BASE_URL}/api/spaces/${testSpace.id}/sessions`;
            const payload1 = { hostId: testUser.id };
            const payload2 = { hostId: user2.id };

            // Act - Make concurrent requests
            const results = await Promise.allSettled([
                axios.post(url, payload1),
                axios.post(url, payload2),
            ]);

            // Assert - One should succeed, one should fail
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failureCount = results.filter(r => r.status === 'rejected').length;

            expect(successCount).toBe(1);
            expect(failureCount).toBe(1);

            // Check that the failed one has 409 status
            const failedResult = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
            const axiosError = failedResult.reason as AxiosError;
            expect(axiosError.response?.status).toBe(409);

            // Cleanup
            await prisma.user.delete({ where: { id: user2.id } });
        });
    });
});