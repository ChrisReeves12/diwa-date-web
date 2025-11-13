/**
 * Client-side image processing utilities
 */

export interface ProcessedImage {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  aspectRatio?: number; // width/height ratio, undefined for free-form
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compress and optimize an image file
 */
export async function processImage(
  file: File,
  maxWidth: number = 2048,
  maxHeight: number = 2048,
  quality: number = 0.8
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight);

      canvas.width = width;
      canvas.height = height;

      // Draw and compress the image
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to process image'));
            return;
          }

          // Create new file with processed image
          const processedFile = new File([blob], file.name, {
            type: 'image/jpeg', // Convert all to JPEG for consistency
            lastModified: Date.now(),
          });

          // Get data URL for preview
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          resolve({
            file: processedFile,
            dataUrl,
            width,
            height,
          });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if image is larger than max dimensions
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.',
    };
  }

  // Check file size (15MB max)
  const maxSize = 15 * 1024 * 1024; // 15MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 15MB.',
    };
  }

  return { isValid: true };
}

/**
 * Generate a thumbnail from an image file
 */
export async function generateThumbnail(
  file: File,
  size: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;

      // Calculate crop dimensions for square thumbnail
      const minDimension = Math.min(img.width, img.height);
      const x = (img.width - minDimension) / 2;
      const y = (img.height - minDimension) / 2;

      // Draw cropped and scaled image
      ctx?.drawImage(
        img,
        x, y, minDimension, minDimension, // Source crop
        0, 0, size, size // Destination
      );

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = () => {
      reject(new Error('Failed to generate thumbnail'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Crop an image file based on the specified crop area
 */
export async function cropImage(
  file: File,
  cropArea: CropArea,
  options: CropOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.8
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas size to crop dimensions
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      // Draw the cropped portion of the image
      ctx?.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height, // Source crop
        0, 0, cropArea.width, cropArea.height // Destination
      );

      // Scale down if necessary
      const { width: finalWidth, height: finalHeight } = calculateDimensions(
        cropArea.width,
        cropArea.height,
        maxWidth,
        maxHeight
      );

      if (finalWidth !== cropArea.width || finalHeight !== cropArea.height) {
        const scaledCanvas = document.createElement('canvas');
        const scaledCtx = scaledCanvas.getContext('2d');
        
        scaledCanvas.width = finalWidth;
        scaledCanvas.height = finalHeight;
        
        scaledCtx?.drawImage(canvas, 0, 0, finalWidth, finalHeight);
        
        // Replace canvas with scaled version
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        ctx?.clearRect(0, 0, finalWidth, finalHeight);
        ctx?.drawImage(scaledCanvas, 0, 0);
      }

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to crop image'));
            return;
          }

          // Create new file with cropped image
          const croppedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          // Get data URL for preview
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          resolve({
            file: croppedFile,
            dataUrl,
            width: canvas.width,
            height: canvas.height,
          });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get a preview of how the image would look when cropped
 */
export async function getCropPreview(
  file: File,
  cropArea: CropArea,
  previewSize: number = 300
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate preview dimensions maintaining aspect ratio
      const cropAspectRatio = cropArea.width / cropArea.height;
      let previewWidth = previewSize;
      let previewHeight = previewSize;

      if (cropAspectRatio > 1) {
        previewHeight = previewSize / cropAspectRatio;
      } else {
        previewWidth = previewSize * cropAspectRatio;
      }

      canvas.width = previewWidth;
      canvas.height = previewHeight;

      // Draw the cropped portion
      ctx?.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, previewWidth, previewHeight
      );

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = () => {
      reject(new Error('Failed to generate crop preview'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate crop area for a given aspect ratio
 */
export function calculateCropArea(
  imageWidth: number,
  imageHeight: number,
  aspectRatio?: number
): CropArea {
  if (!aspectRatio) {
    // Free-form crop - use 80% of image centered
    const width = Math.round(imageWidth * 0.8);
    const height = Math.round(imageHeight * 0.8);
    const x = Math.round((imageWidth - width) / 2);
    const y = Math.round((imageHeight - height) / 2);
    
    return { x, y, width, height };
  }

  // Calculate crop area for specific aspect ratio
  const imageAspectRatio = imageWidth / imageHeight;
  
  let cropWidth: number;
  let cropHeight: number;
  
  if (imageAspectRatio > aspectRatio) {
    // Image is wider than desired ratio
    cropHeight = imageHeight;
    cropWidth = Math.round(cropHeight * aspectRatio);
  } else {
    // Image is taller than desired ratio
    cropWidth = imageWidth;
    cropHeight = Math.round(cropWidth / aspectRatio);
  }
  
  const x = Math.round((imageWidth - cropWidth) / 2);
  const y = Math.round((imageHeight - cropHeight) / 2);
  
  return { x, y, width: cropWidth, height: cropHeight };
}

/**
 * Common aspect ratios for cropping
 */
export const ASPECT_RATIOS = {
  SQUARE: 1, // 1:1
  LANDSCAPE: 4/3, // 4:3
  PORTRAIT: 3/4, // 3:4
  WIDESCREEN: 16/9, // 16:9
  STORY: 9/16, // 9:16 (Instagram story)
  FREE_FORM: undefined // No constraint
} as const;
