'use server';

import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prismaWrite } from '@/lib/prisma';

interface SupportFormData {
    issueType: string;
    description: string;
}

export async function submitSupportRequest(formData: SupportFormData) {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/login');
        }

        // Validate input
        if (!formData.issueType || !formData.description.trim()) {
            return {
                success: false,
                errors: {
                    form: 'All fields are required'
                }
            };
        }

        if (formData.description.trim().length < 10) {
            return {
                success: false,
                errors: {
                    description: 'Description must be at least 10 characters long'
                }
            };
        }

        if (formData.description.trim().length > 2000) {
            return {
                success: false,
                errors: {
                    description: 'Description must be less than 2000 characters'
                }
            };
        }

        // Save to database using raw query
        await prismaWrite.$executeRaw`
            INSERT INTO "supportRequests" ("userId", "issueType", "description", "status", "createdAt", "updatedAt")
            VALUES (${currentUser.id}, ${formData.issueType}, ${formData.description.trim()}, 'Open', NOW(), NOW())
        `;

        return {
            success: true,
            message: 'Your support request has been submitted successfully. We will get back to you soon!'
        };

    } catch (error) {
        console.error('Support request submission error:', error);
        return {
            success: false,
            errors: {
                form: 'An error occurred while submitting your request. Please try again.'
            }
        };
    }
}
