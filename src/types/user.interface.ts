import { LocalityViewport } from './locality-viewport.interface';
import { UserPhoto } from './user-photo.type';
import { SingleSearchLocation } from './single-search-location.type';
import { SubscriptionPlanEnrollment } from './subscription-plan-enrollment.interface';
import { CroppedImageData } from './cropped-image-data.interface';

export enum SearchFromOrigin {
  CurrentLocation = 'current_location',
  SingleLocation = 'single_location',
  MultipleCountries = 'multiple_countries'
}

/**
 * User interface definition based on the actual database structure
 */
export interface User {
  id: bigint;
  display_name: string;
  first_name: string;
  last_name: string;
  gender: string;
  smoking?: string;
  drinking?: string;
  wants_children?: string;
  education?: string;
  has_children?: string;
  date_of_birth: Date;
  last_active_at?: Date;
  suspended_at?: Date;
  email_verified_at?: Date;
  suspended_reason?: string;
  bio?: string;
  seeking_genders: string[];
  email: string;
  height?: number;
  marital_status?: string;
  main_photo_cropped_image_data?: CroppedImageData;
  photos?: UserPhoto[];
  public_photos?: UserPhoto[];
  num_of_photos: number;
  main_photo?: string;
  public_main_photo?: string;
  interests?: string[];
  country?: string;
  location_name?: string;
  location_viewport?: LocalityViewport;
  latitude?: number;
  longitude?: number;
  seeking_distance_origin?: string;
  body_type?: string;
  timezone?: string;
  timezone_offset?: number;
  seeking_min_height: number;
  seeking_max_height: number;
  seeking_min_age: number;
  seeking_max_age: number;
  seeking_num_of_photos: number;
  seeking_max_distance: number;
  ethnicities?: string[];
  languages?: string[];
  religions?: string[];
  ethnic_preferences?: string[];
  religious_preferences?: string[];
  education_preferences?: string[];
  body_type_preferences?: string[];
  drinking_preferences?: string[];
  smoking_preferences?: string[];
  has_children_preferences?: string[];
  wants_children_preferences?: string[];
  interest_preferences?: string[];
  language_preferences?: string[];
  marital_status_preferences?: string[];
  seeking_countries?: string[];
  single_search_location?: SingleSearchLocation;
  required_min_age?: number;
  required_max_age?: number;
  required_min_height?: number;
  required_max_height?: number;
  required_religions?: string[];
  required_ethnicities?: string[];
  required_body_types?: string[];
  required_education_levels?: string[];
  required_marital_statuses?: string[];
  required_want_children_statuses?: string[];
  required_has_children_statuses?: string[];
  required_languages?: string[];
  payment_profile_id?: string;
  customer_payment_profile_id?: string;
  password: string;
  is_subscription_active: boolean;
  age: number;
  subscription_plan_enrollments: SubscriptionPlanEnrollment[];
  refresh_token?: string;
  created_at?: Date;
  updated_at?: Date;
}

