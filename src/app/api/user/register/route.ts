import { NextRequest, NextResponse } from 'next/server';
import { checkUserExists, hashPassword } from '@/server-side-helpers/user.helpers';
import { UserRegistrationData, ValidationErrors, User } from '../../../../types';
import prisma from '@/lib/prisma';
import { createSession } from '@/server-side-helpers/session.helpers';
import { businessConfig } from "@/config/business";
import { logError } from '@/server-side-helpers/logging.helpers';

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body from the request
    const userData: UserRegistrationData = await request.json();

    // Validate user data
    const errors = await validateUserData(userData);

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors
        },
        { status: 422 }
      );
    }

    // Prepare user data for database storage
    const createData = {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email.toLowerCase(),
      password: await hashPassword(userData.password),
      display_name: `${userData.firstName} ${userData.lastName[0]}.`,
      date_of_birth: new Date(userData.dateOfBirth),
      gender: userData.userGender,
      timezone: userData.timezone,
      created_at: new Date(),
      seeking_genders: [userData.seekingGender],
      seeking_num_of_photos: businessConfig.defaults.numOfPhotos,
      seeking_max_distance: businessConfig.defaults.maxDistance,
      seeking_min_height: businessConfig.defaults.minHeight,
      seeking_distance_origin: 'current_location',
      seeking_max_height: businessConfig.defaults.maxHeight,
      seeking_min_age: businessConfig.defaults.minAge,
      seeking_max_age: businessConfig.defaults.maxAge,
      marital_status: businessConfig.defaults.maritalStatus,
      latitude: userData.location.coordinates?.latitude ?? null,
      longitude: userData.location.coordinates?.longitude ?? null,
      location_name: userData.location.name,
      location_viewport: userData.location.viewport,
      country: userData.location.country,
      height: businessConfig.defaults.minHeight,
      updated_at: new Date(),
      last_active_at: new Date()
    };

    // Store user in database

    const newUser = await prisma.users.create({
      data: createData as never
    });

    // Create a session for the user
    const response = NextResponse.json(
      {
        success: true,
        message: 'Registration successful'
      },
      { status: 201 }
    );

    // Create a session for the user
    await createSession(newUser as unknown as User, response);

    return response;
  } catch (error: any) {
    logError(error, 'Registration failed');

    return NextResponse.json(
      {
        success: false,
        message: 'Registration failed. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * Validate user registration data
 * @param data
 * @returns 
 */
async function validateUserData(data: UserRegistrationData): Promise<ValidationErrors> {
  const errors: ValidationErrors = {};

  // Validate first name (only letters including accented chars, not empty)
  if (!data.firstName || !data.firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (!/^[\p{L}\s'-]+$/u.test(data.firstName.trim())) {
    errors.firstName = 'First name must only contain letters';
  }

  // Validate last name (only letters including accented chars, not empty)
  if (!data.lastName || !data.lastName.trim()) {
    errors.lastName = 'Last name is required';
  } else if (!/^[\p{L}\s'-]+$/u.test(data.lastName.trim())) {
    errors.lastName = 'Last name must only contain letters';
  }

  // Validate email (valid format, not already in use)
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Email is invalid';
  } else {
    // Check if email is already in use
    const emailExists = await checkUserExists(data.email);
    if (emailExists) {
      errors.email = 'A user with this email already exists';
    }
  }

  // Validate password (at least 8 chars, contains special character)
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
    errors.password = 'Password must contain at least one special character';
  }

  // Validate date of birth (valid date, at least 18 years old)
  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    try {
      const birthDate = new Date(data.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        if (age - 1 < 18) {
          errors.dateOfBirth = 'You must be at least 18 years old';
        }
      } else if (age < 18) {
        errors.dateOfBirth = 'You must be at least 18 years old';
      }
    } catch {
      errors.dateOfBirth = 'Invalid date of birth';
    }
  }

  // Validate gender selection
  if (!data.userGender) {
    errors.userGender = 'Please select your gender';
  }

  // Validate seeking gender selection
  if (!data.seekingGender) {
    errors.seekingGender = 'Please select who you are looking for';
  }

  // Validate location
  if (!data.location) {
    errors.location = 'Please search and select your location'
  }

  // Validate terms acceptance
  if (!data.termsAccepted) {
    errors.terms = 'You must accept the terms of service';
  }

  return errors;
}
