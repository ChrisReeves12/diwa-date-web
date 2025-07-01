"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserPhotoDisplay;
require("./user-photo-display.scss");
const use_fallback_image_1 = require("@/hooks/use-fallback-image");
const image_1 = __importDefault(require("next/image"));
function UserPhotoDisplay({ imageUrl, gender, width = 42, height = 42, shape = 'circle', alt = 'Profile Photo', croppedImageData, onClick }) {
    const fallbackImage = (0, use_fallback_image_1.useFallbackImage)(gender);
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
        objectFit: 'cover'
    };
    const imgSrc = imageUrl ? ((croppedImageData === null || croppedImageData === void 0 ? void 0 : croppedImageData.croppedImagePath) ? croppedImageData.croppedImagePath : imageUrl) : undefined;
    return (<div className="user-photo-display-container">
            <div className="profile-image-container" style={containerStyle} onClick={handleClick}>
                {imgSrc ? <img style={imgStyle} src={imgSrc} alt={alt} title={alt} width={width} height={height}/> : <image_1.default style={imgStyle} src={fallbackImage} alt={alt} title={alt} width={width} height={height}/>}
            </div>
        </div>);
}
//# sourceMappingURL=user-photo-display.jsx.map