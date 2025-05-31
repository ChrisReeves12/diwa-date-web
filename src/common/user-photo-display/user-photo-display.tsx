import { CroppedImageData } from "@/types/cropped-image-data.interface";
import './user-photo-display.scss';
import { useFallbackImage } from "@/hooks/use-fallback-image";
import Image from 'next/image';

interface UserPhotoDisplayProps {
    imageUrl?: string;
    gender: string;
    width?: number;
    height?: number;
    shape?: 'circle' | 'square' | 'rounded-square';
    alt?: string;
    croppedImageData?: CroppedImageData;
    onClick?: () => void;
}

export default function UserPhotoDisplay({
    imageUrl,
    gender,
    width = 42,
    height = 42,
    shape = 'circle',
    alt = 'Profile Photo',
    croppedImageData,
    onClick
}: UserPhotoDisplayProps) {
    const fallbackImage = useFallbackImage(gender);

    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    const getBorderRadius = () => {
        switch (shape) {
            case 'circle':
                return '50%';
            case 'rounded-square':
                return '10px';
            case 'square':
            default:
                return '0';
        }
    };

    const containerStyle = {
        borderRadius: getBorderRadius(),
        width: `${width}px`,
        height: `${height}px`
    };

    const imgStyle = {
        width: `${width}px`,
        height: `${height}px`,
        objectFit: 'cover' as const
    };

    const imgSrc = imageUrl ? (croppedImageData?.croppedImagePath ? croppedImageData.croppedImagePath : imageUrl) : undefined;

    return (
        <div className="user-photo-display-container">
            <div
                className="profile-image-container"
                style={containerStyle}
                onClick={handleClick}
            >
                {imgSrc ? <img
                    style={imgStyle}
                    src={imgSrc}
                    alt={alt}
                    title={alt}
                    width={width}
                    height={height}
                /> : <Image style={imgStyle} src={fallbackImage} alt={alt} title={alt} width={width} height={height} />}
            </div>
        </div>
    );
}
