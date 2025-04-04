import { CroppedImageData } from "./cropped-image-data.interface";

/**
 * Defines the structure for photo data based on the actual database structure
 */
export type UserPhoto = {
  path: string;
  caption?: string;
  is_hidden: boolean;
  sort_order: number;
  uploaded_at: string;
  cropped_image_data?: CroppedImageData;
};
