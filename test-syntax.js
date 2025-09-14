// Simple syntax test for the getCurrentUser function
async function getCurrentUser(cookieStore, usePublic = true) {
    const sessionId = await getSessionId(cookieStore);

    if (!sessionId) {
        return undefined;
    }

    // Get session data from Redis
    const sessionData = await getSessionData(sessionId);

    if (!sessionData) {
        return undefined;
    }

    const userId = typeof sessionData.userId === 'string' ? Number(sessionData.userId) : sessionData.userId;

    // Get the user from the database using raw SQL
    const { rows } = await pgDbReadPool.query(`
        SELECT 
            u.*,
            spe."id" as "subscriptionPlanEnrollmentId",
            spe."userId" as "subscriptionPlanEnrollmentUserId",
            spe."subscriptionPlanId",
            spe."lastPaymentAt",
            spe."nextPaymentAt",
            spe."startedAt",
            spe."endsAt",
            spe."createdAt" as "subscriptionPlanEnrollmentCreatedAt",
            spe."updatedAt" as "subscriptionPlanEnrollmentUpdatedAt",
            spe."price",
            spe."chargeInterval",
            spe."priceUnit",
            spe."lastEvalAt",
            sp."id" as "subscriptionPlanId",
            sp."name" as "subscriptionPlanName",
            sp."description" as "subscriptionPlanDescription",
            sp."createdAt" as "subscriptionPlanCreatedAt",
            sp."updatedAt" as "subscriptionPlanUpdatedAt",
            sp."listPrice",
            sp."listPriceUnit"
        FROM "users" u
        LEFT JOIN "subscriptionPlanEnrollments" spe ON u."id" = spe."userId"
        LEFT JOIN "subscriptionPlans" sp ON spe."subscriptionPlanId" = sp."id"
        WHERE u."id" = $1 
          AND u."suspendedAt" IS NULL
        ORDER BY spe."createdAt" DESC
        LIMIT 1
    `, [userId]);

    if (rows.length === 0) {
        return undefined;
    }

    const row = rows[0];
    
    // Construct the user object with subscription data
    const user = {
        id: row.id,
        displayName: row.displayName,
        firstName: row.firstName,
        lastName: row.lastName,
        gender: row.gender,
        smoking: row.smoking,
        drinking: row.drinking,
        wantsChildren: row.wantsChildren,
        education: row.education,
        hasChildren: row.hasChildren,
        dateOfBirth: row.dateOfBirth,
        lastActiveAt: row.lastActiveAt,
        isFoundingMember: row.isFoundingMember,
        suspendedAt: row.suspendedAt,
        emailVerifiedAt: row.emailVerifiedAt,
        suspendedReason: row.suspendedReason,
        bio: row.bio,
        seekingGender: row.seekingGender,
        email: row.email,
        height: row.height,
        maritalStatus: row.maritalStatus,
        photos: row.photos,
        numOfPhotos: row.numOfPhotos,
        mainPhoto: row.mainPhoto,
        interests: row.interests,
        country: row.country,
        locationName: row.locationName,
        latitude: row.latitude,
        longitude: row.longitude,
        ethnicities: row.ethnicities,
        religions: row.religions,
        languages: row.languages,
        bodyType: row.bodyType,
        password: row.password,
        refreshToken: row.refreshToken,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        geoPoint: row.geoPoint,
        deactivatedAt: row.deactivatedAt,
        hideOnlineStatus: row.hideOnlineStatus,
        resetToken: row.resetToken,
        resetTokenExpiry: row.resetTokenExpiry,
        newDesiredEmail: row.newDesiredEmail,
        emailVerificationToken: row.emailVerificationToken,
        emailVerificationTokenExpiry: row.emailVerificationTokenExpiry,
        passwordResetToken: row.passwordResetToken,
        passwordResetTokenExpiry: row.passwordResetTokenExpiry,
        profileCompletedAt: row.profileCompletedAt,
        currentOnboardingSteps: row.currentOnboardingSteps,
        isPremium: row.isPremium,
        require2fa: row.require2fa,
        facebookId: row.facebookId,
        oauthProvider: row.oauthProvider,
        oauthProfile: row.oauthProfile,
        subscriptionPlanEnrollments: []
    };

    // Add subscription enrollment if it exists
    if (row.subscriptionPlanEnrollmentId) {
        user.subscriptionPlanEnrollments = [{
            id: row.subscriptionPlanEnrollmentId,
            userId: row.subscriptionPlanEnrollmentUserId,
            subscriptionPlanId: row.subscriptionPlanId,
            lastPaymentAt: row.lastPaymentAt,
            nextPaymentAt: row.nextPaymentAt,
            startedAt: row.startedAt,
            endsAt: row.endsAt,
            createdAt: row.subscriptionPlanEnrollmentCreatedAt,
            updatedAt: row.subscriptionPlanEnrollmentUpdatedAt,
            price: row.price,
            chargeInterval: row.chargeInterval,
            priceUnit: row.priceUnit,
            lastEvalAt: row.lastEvalAt,
            subscriptionPlans: {
                id: row.subscriptionPlanId,
                name: row.subscriptionPlanName,
                description: row.subscriptionPlanDescription,
                createdAt: row.subscriptionPlanCreatedAt,
                updatedAt: row.subscriptionPlanUpdatedAt,
                listPrice: row.listPrice,
                listPriceUnit: row.listPriceUnit
            }
        }];
    }

    return usePublic ? Object.assign({}, user, getPublicUserDetails(user)) : user;
}

console.log('Syntax check passed!');
