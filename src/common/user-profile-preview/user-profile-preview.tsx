import './user-profile-preview.scss';
import { UserPreview } from "@/types/user-preview.interface";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import Link from "next/link";
import { humanizeTimeDiff, userProfileLink } from "@/util";
import Image from "next/image";
import { HeartIcon, TimesIcon } from "react-line-awesome";

export default function UserProfilePreview({ userPreview, type }: { userPreview: UserPreview, type: 'search' | 'like' }) {
    return (
        <div className="user-profile-preview-container">
            <div className="image-container">
                <Link href={userProfileLink(userPreview)}>
                    <UserPhotoDisplay
                        alt={userPreview.display_name}
                        shape="rounded-square"
                        imageUrl={userPreview.public_main_photo}
                        croppedImageData={userPreview.main_photo_cropped_image_data}
                        width={210}
                        height={210}
                        gender={userPreview.gender}/>
                </Link>
            </div>
            <div className="info-photo-count-container">
                <div className="info-container">
                    <Link className="user-display-name" href={userProfileLink(userPreview)}>
                        {userPreview.display_name}
                    </Link>
                    <div className="info-line age">Age: {userPreview.age}</div>
                    <div className="info-line location">Location: {userPreview.location_name}</div>
                    {/*<div className="info-line last-active">Last*/}
                    {/*    Active {humanizeTimeDiff(userPreview.last_active_at)}</div>*/}
                </div>
                <div className="photo-count-container">
                    <button className="photo-count">
                        <span className="count-value">{userPreview.num_of_photos}</span>
                        <Image className="camera-icon" width="20" height="20" alt="Camera" src="/images/camera.svg"
                               style={{transform: 'translate(0, 4px)'}}/>
                    </button>
                </div>
            </div>
            <div className="controls-container">
                <div className="more-options-container">
                    <button className="more-options-button">
                        <span className="light-dark">
                            <span className="light">
                                <Image
                                    width="35" height="35" alt="More"
                                    src="/images/circle-ellipse.svg"/>
                            </span>
                            <span className="dark">
                                <Image width="35" height="35" alt="More"
                                   src="/images/circle-ellipse-dark.svg"/>
                            </span>
                        </span>
                    </button>
                </div>
                <div className="action-buttons-container">
                    {type === 'search' ?
                        <button className="like-button">
                            <HeartIcon/>
                        </button> :
                        <div className="match-buttons">
                            <button title="Like" className="like">
                                <HeartIcon/>
                            </button>
                            <button title="Pass" className="pass">
                                <TimesIcon/>
                            </button>
                        </div>}
                </div>
            </div>
        </div>
    );
}
