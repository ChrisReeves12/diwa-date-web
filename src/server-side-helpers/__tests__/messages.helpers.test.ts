/**
 * @jest-environment node
 */

import { sendMessage } from '../messages.helpers';
import { prismaRead, prismaWrite } from '@/lib/prisma';
import { hashPassword } from '../user.helpers';

describe('sendMessage Integration Tests', () => {
    let testUser1: any;
    let testUser2: any;
    let testMatch: any;

    beforeAll(async () => {
        // Create test users
        const hashedPassword = await hashPassword('TestPassword123!');

        testUser1 = await prismaWrite.users.create({
            data: {
                firstName: 'Test',
                lastName: 'User1',
                email: `testuser1-${Date.now()}@test.com`,
                password: hashedPassword,
                displayName: 'Test U.',
                dateOfBirth: new Date('1990-01-01'),
                gender: 'male',
                seekingGender: 'female',
                timezone: 'UTC',
                seekingNumOfPhotos: 3,
                seekingMaxDistance: 50,
                seekingMinHeight: 150,
                seekingMaxHeight: 190,
                seekingMinAge: 25,
                seekingMaxAge: 45,
                maritalStatus: 'single',
                height: 175,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActiveAt: new Date()
            }
        });

        testUser2 = await prismaWrite.users.create({
            data: {
                firstName: 'Test',
                lastName: 'User2',
                email: `testuser2-${Date.now()}@test.com`,
                password: hashedPassword,
                displayName: 'Test U.',
                dateOfBirth: new Date('1992-01-01'),
                gender: 'female',
                seekingGender: 'male',
                timezone: 'UTC',
                seekingNumOfPhotos: 3,
                seekingMaxDistance: 50,
                seekingMinHeight: 150,
                seekingMaxHeight: 190,
                seekingMinAge: 25,
                seekingMaxAge: 45,
                maritalStatus: 'single',
                height: 165,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActiveAt: new Date()
            }
        });

        // Create a test match between the users
        testMatch = await prismaWrite.userMatches.create({
            data: {
                userId: testUser1.id,
                recipientId: testUser2.id,
                status: 'matched',
                updatedAtTimestamp: BigInt(Date.now()),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    });

    afterAll(async () => {
        // Clean up test data
        await prismaWrite.messages.deleteMany({
            where: { matchId: testMatch.id }
        });

        if (testMatch) {
            await prismaWrite.userMatches.delete({
                where: { id: testMatch.id }
            });
        }

        if (testUser1) {
            await prismaWrite.users.delete({
                where: { id: testUser1.id }
            });
        }

        if (testUser2) {
            await prismaWrite.users.delete({
                where: { id: testUser2.id }
            });
        }

        // Close Prisma connection
        await prismaWrite.$disconnect();
    });

    beforeEach(async () => {
        // Clean up any messages from previous tests
        await prismaWrite.messages.deleteMany({
            where: { matchId: testMatch.id }
        });
    });

    it('should create a message and update userMatches timestamp', async () => {
        const messageContent = 'Hello, this is a test message!';
        const beforeTimestamp = testMatch.updatedAtTimestamp;

        // Send the message
        const result = await sendMessage(
            messageContent,
            testUser1.id,
            testUser2.id,
            testMatch.id
        );

        // Verify the response structure
        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.data).toBeDefined();
        expect(result.error).toBeUndefined();

        const messageData = result.data;
        expect(messageData.content).toBe(messageContent);
        expect(messageData.userId).toBe(testUser1.id);
        expect(messageData.recipientId).toBe(testUser2.id);
        expect(messageData.matchId).toBe(testMatch.id);
        expect(messageData.timestamp).toBeDefined();

        // Verify the message exists in the database
        const messageInDb = await prismaRead.messages.findUnique({
            where: { id: messageData.id }
        });

        expect(messageInDb).toBeDefined();
        expect(messageInDb!.content).toBe(messageContent);
        expect(messageInDb!.userId).toBe(testUser1.id);
        expect(messageInDb!.recipientId).toBe(testUser2.id);
        expect(messageInDb!.matchId).toBe(testMatch.id);

        // Verify createdAt and updatedAt timestamps are set
        expect(messageInDb!.createdAt).toBeDefined();
        expect(messageInDb!.updatedAt).toBeDefined();
        expect(messageInDb!.createdAt).toBeInstanceOf(Date);
        expect(messageInDb!.updatedAt).toBeInstanceOf(Date);

        // Verify timestamps are recent (within last 5 seconds)
        const now = new Date();
        const fiveSecondsAgo = new Date(now.getTime() - 5000);
        expect(messageInDb!.createdAt!.getTime()).toBeGreaterThan(fiveSecondsAgo.getTime());
        expect(messageInDb!.updatedAt!.getTime()).toBeGreaterThan(fiveSecondsAgo.getTime());

        // Verify the userMatches timestamp was updated
        const updatedMatch = await prismaRead.userMatches.findUnique({
            where: { id: testMatch.id }
        });

        expect(updatedMatch).toBeDefined();
        expect(updatedMatch!.updatedAtTimestamp).toBeDefined();
        expect(Number(updatedMatch!.updatedAtTimestamp)).toBeGreaterThan(Number(beforeTimestamp));
    });

    it('should handle multiple messages in sequence', async () => {
        const message1 = 'First message';
        const message2 = 'Second message';

        // Get the initial match timestamp
        const initialMatch = await prismaRead.userMatches.findUnique({
            where: { id: testMatch.id }
        });
        const initialTimestamp = initialMatch!.updatedAtTimestamp;

        // Send first message
        const result1 = await sendMessage(
            message1,
            testUser1.id,
            testUser2.id,
            testMatch.id
        );

        expect(result1.statusCode).toBe(200);
        expect(result1.data).toBeDefined();

        // Verify match timestamp was updated after first message
        const matchAfterFirst = await prismaRead.userMatches.findUnique({
            where: { id: testMatch.id }
        });
        expect(Number(matchAfterFirst!.updatedAtTimestamp)).toBeGreaterThan(Number(initialTimestamp));

        // Wait a moment to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));

        // Send second message
        const result2 = await sendMessage(
            message2,
            testUser2.id,
            testUser1.id,
            testMatch.id
        );

        expect(result2.statusCode).toBe(200);
        expect(result2.data).toBeDefined();

        // Verify match timestamp was updated again after second message
        const matchAfterSecond = await prismaRead.userMatches.findUnique({
            where: { id: testMatch.id }
        });
        expect(Number(matchAfterSecond!.updatedAtTimestamp)).toBeGreaterThan(Number(matchAfterFirst!.updatedAtTimestamp));

        // Verify both messages exist
        const messagesInDb = await prismaRead.messages.findMany({
            where: { matchId: testMatch.id },
            orderBy: { timestamp: 'asc' }
        });

        expect(messagesInDb).toHaveLength(2);
        expect(messagesInDb[0].content).toBe(message1);
        expect(messagesInDb[0].userId).toBe(testUser1.id);
        expect(messagesInDb[1].content).toBe(message2);
        expect(messagesInDb[1].userId).toBe(testUser2.id);

        // Verify timestamps are in order
        expect(Number(messagesInDb[0].timestamp)).toBeLessThan(Number(messagesInDb[1].timestamp));

        // Verify both messages have createdAt and updatedAt timestamps
        for (let i = 0; i < messagesInDb.length; i++) {
            const message = messagesInDb[i];
            expect(message.createdAt).toBeDefined();
            expect(message.updatedAt).toBeDefined();
            expect(message.createdAt).toBeInstanceOf(Date);
            expect(message.updatedAt).toBeInstanceOf(Date);
        }

        // Verify createdAt timestamps are also in chronological order
        expect(messagesInDb[0].createdAt!.getTime()).toBeLessThan(messagesInDb[1].createdAt!.getTime());
        expect(messagesInDb[0].updatedAt!.getTime()).toBeLessThan(messagesInDb[1].updatedAt!.getTime());

        // Verify the final match timestamp matches the second message timestamp
        expect(Number(matchAfterSecond!.updatedAtTimestamp)).toEqual(Number(messagesInDb[1].timestamp));
    });

    it('should use the same timestamp for message creation and match update', async () => {
        const messageContent = 'Timestamp test message';

        const result = await sendMessage(
            messageContent,
            testUser1.id,
            testUser2.id,
            testMatch.id
        );

        expect(result.statusCode).toBe(200);
        expect(result.data).toBeDefined();

        const messageData = result.data;

        // Get the updated match
        const updatedMatch = await prismaRead.userMatches.findUnique({
            where: { id: testMatch.id }
        });

        // Verify the message has createdAt and updatedAt timestamps
        const messageInDb = await prismaRead.messages.findUnique({
            where: { id: messageData.id }
        });

        expect(messageInDb!.createdAt).toBeDefined();
        expect(messageInDb!.updatedAt).toBeDefined();
        expect(messageInDb!.createdAt).toBeInstanceOf(Date);
        expect(messageInDb!.updatedAt).toBeInstanceOf(Date);

        // The message timestamp and match updatedAtTimestamp should be very close (within a few milliseconds)
        const messageTsNumber = Number(messageData.timestamp);
        const matchTsNumber = Number(updatedMatch!.updatedAtTimestamp);
        const timeDifference = Math.abs(messageTsNumber - matchTsNumber);

        expect(timeDifference).toBeLessThan(10); // Should be within 10ms
    });

    it('should return error when trying to send message to suspended user', async () => {
        // Suspend testUser2
        await prismaWrite.users.update({
            where: { id: testUser2.id },
            data: { suspendedAt: new Date() }
        });

        const result = await sendMessage(
            'This should fail',
            testUser1.id,
            testUser2.id,
            testMatch.id
        );

        expect(result.statusCode).toBe(400);
        expect(result.error).toBe('You cannot send a message to this user because they have been suspended.');
        expect(result.data).toBeUndefined();

        // Clean up - unsuspend user
        await prismaWrite.users.update({
            where: { id: testUser2.id },
            data: { suspendedAt: null }
        });
    });

    it('should return error when sender is blocked by recipient', async () => {
        // Block testUser1 by testUser2
        await prismaWrite.blockedUsers.create({
            data: {
                userId: testUser2.id,
                blockedUserId: testUser1.id
            }
        });

        const result = await sendMessage(
            'This should fail',
            testUser1.id,
            testUser2.id,
            testMatch.id
        );

        expect(result.statusCode).toBe(403);
        expect(result.error).toBe('You have been blocked by this user.');
        expect(result.data).toBeUndefined();

        // Clean up - remove block
        await prismaWrite.blockedUsers.deleteMany({
            where: {
                userId: testUser2.id,
                blockedUserId: testUser1.id
            }
        });
    });

    it('should return error with invalid match ID', async () => {
        const invalidMatchId = 999999;

        const result = await sendMessage(
            'This should fail',
            testUser1.id,
            testUser2.id,
            invalidMatchId
        );

        expect(result.statusCode).toBe(500);
        expect(result.error).toBe('Failed to send message. Please try again later.');
        expect(result.data).toBeUndefined();
    });
});
