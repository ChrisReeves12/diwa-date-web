import { CroppedImageData } from "./cropped-image-data.interface";

/**
 * Defines the structure for photo data based on the actual database structure
 */
export type UserPhoto = {
  path: string;
  caption?: string;
  isHidden: boolean;
  sortOrder: number;
  uploadedAt: string;
  messages?: string[];
  isRejected?: boolean;
  croppedImageData?: CroppedImageData;
};
