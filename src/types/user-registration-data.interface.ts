import { Locality } from "@/types/locality.interface";

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  location: Locality;
  userGender: string;
  seekingGender: string;
  country: string;
  termsAccepted: boolean;
  timezone: string;
}
