# Automatic Image Validation
The idea of image validation is to be able to automatically check images for duplication, inappropriate
content, ect.

## Requirements

1. Image validation should occur after an image has been uploaded. 
2. The image validation checks if the image that was uploaded is the same as one of the other images, detecting even if the base image is the same.
3. The image validation checks if the image contains nudity or inappropriate content, or an image of someone different than the other images of the user.
4. If there is an issue with the image, the account will be placed in an `inReview` status.

## Implementation

- Images are uploaded to an S3 bucket when the user selects images to add to their profile. 
- The backend image upload code is in `src/app/profile/photos/photos.actions.ts`. We would do the image verification step after the image has been uploaded to all of the buckets. Look at `uploadToAllBuckets`
- 

