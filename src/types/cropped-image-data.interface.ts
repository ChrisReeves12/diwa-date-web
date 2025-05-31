export interface CroppedImageData {
    width: number;
    height: number;
    cropPosition: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    };
    imagePosition: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    };
    croppedImagePath: string;
};