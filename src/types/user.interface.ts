import { LocalityViewport } from './locality-viewport.interface';
import { UserPhoto } from './user-photo.type';
import { SingleSearchLocation } from './single-search-location.type';
import { SubscriptionPlanEnrollment } from './subscription-plan-enrollment.interface';
import { CroppedImageData } from './cropped-image-data.interface';

export enum SearchFromOrigin {
  AllLocations = 'all',
  CurrentLocation = 'currentLocation',
  SingleLocation = 'singleLocation',
  MultipleCountries = 'multipleCountries'
}

/**
 * User interface definition based on the actual database structure
 */
export interface User {
  id: number;
  displayName: string;
  firstName: string;
  lastName: string;
  gender: string;
  smoking?: string;
  drinking?: string;
  wantsChildren?: string;
  education?: string;
  hasChildren?: string;
  dateOfBirth: Date;
  lastActiveAt?: Date;
  isFoundingMember: boolean;
  suspendedAt?: Date;
  emailVerifiedAt?: Date;
  suspendedReason?: string;
  bio?: string;
  seekingGender?: string;
  email: string;
  height?: number;
  maritalStatus?: string;
  mainPhotoCroppedImageData?: CroppedImageData;
  photos?: UserPhoto[];
  publicPhotos?: UserPhoto[];
  numOfPhotos: number;
  mainPhoto?: string;
  publicMainPhoto?: string;
  interests?: string[];
  country?: string;
  locationName?: string;
  locationViewport?: LocalityViewport;
  latitude?: number;
  longitude?: number;
  seekingDistanceOrigin?: string;
  bodyType?: string;
  timezone?: string;
  timezoneOffset?: number;
  seekingMinHeight: number;
  seekingMaxHeight: number;
  seekingMinAge: number;
  seekingMaxAge: number;
  seekingNumOfPhotos: number;
  seekingMaxDistance: number;
  ethnicities?: string[];
  languages?: string[];
  religions?: string[];
  ethnicPreferences?: string[];
  religiousPreferences?: string[];
  educationPreferences?: string[];
  bodyTypePreferences?: string[];
  drinkingPreferences?: string[];
  smokingPreferences?: string[];
  hasChildrenPreferences?: string[];
  wantsChildrenPreferences?: string[];
  interestPreferences?: string[];
  languagePreferences?: string[];
  maritalStatusPreferences?: string[];
  seekingCountries?: string[];
  singleSearchLocation?: SingleSearchLocation;
  paymentProfileId?: string;
  customerPaymentProfileId?: string;
  password?: string;
  isSubscriptionActive: boolean;
  age: number;
  subscriptionPlanEnrollments: SubscriptionPlanEnrollment[];
  refreshToken?: string;
  newDesiredEmail?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  isUnderReview?: number;
  deactivatedAt?: Date;
  receivedLikeAt?: Date;
  googleId?: string;
  hideOnlineStatus: boolean;
  profileCompletedAt?: Date;
  currentOnboardingSteps?: {
    currentStep: number;
    completedSteps: number[];
    lastUpdated?: string;
  };
  isPremium: boolean;
  require2fa: boolean;
  twoFactorCode?: string;
  twoFactorCodeExpiry?: Date;
  twoFactorCodeAttempts?: number;
  lastTwoFactorCodeSentAt?: Date;
}
