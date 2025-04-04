export interface CroppedImageData {
    width: number;
    height: number;
    crop_position: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    };
    image_position: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    };
    cropped_image_path: string;
};