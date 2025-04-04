import './notification-menu.scss';
import Image from "next/image";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { HeartIcon, TimesIcon } from "react-line-awesome";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import Link from 'next/link';
import { decodeHtmlEntities } from '@/util';

type NotificationType = 'notifications' | 'likes' | 'messages';

interface NotificationMenuProps {
    titleIcon: string,
    titleIconDark: string,
    title: string,
    listItems: NotificationListItemProps[]
}

interface NotificationUser {
    main_photo_cropped_image_data?: CroppedImageData,
    public_main_photo?: string,
    display_name: string,
    age: number,
    gender: string
}

interface NotificationListItemProps {
    id: string,
    senderUser: NotificationUser,
    receivedAtMessage: string,
    type: NotificationType,
    content: string,
    numberOfMessages?: number,
    userPhotoUrl: string,
    infoSectionUrl: string,
    onLike?: () => void,
    onPass?: () => void
}

function NotificationListItem({ senderUser, content, receivedAtMessage,
    numberOfMessages, userPhotoUrl, infoSectionUrl, onLike, onPass, type }: NotificationListItemProps) {
    return (
        <div className="notification-list-item">
            <div className="user-photo">
                <Link href={userPhotoUrl}>
                    <UserPhotoDisplay
                        gender={senderUser.gender}
                        alt={senderUser.display_name}
                        width={45}
                        height={45}
                        croppedImageData={senderUser.main_photo_cropped_image_data}
                        imageUrl={senderUser.public_main_photo}
                    />
                </Link>
            </div>
            <div className="info-button-container">
                <Link href={infoSectionUrl}>
                    <div className={`info-section ${type === 'notifications' ? 'notification' : ''}`}>
                        <div className="name-section">
                            <div className="name">
                                {type !== "notifications" ?
                                    <>{senderUser.display_name}, {senderUser.age}</> :
                                    <>It&apos;s A Match!</>}
                            </div>
                        </div>
                        <div className="content">
                            {type !== "notifications" ?
                                <>{decodeHtmlEntities(content)}</> :
                                <>
                                    🎉Congratulations on the match! 🎉<br/>
                                    Go start the conversation with <strong>{senderUser.display_name}</strong>
                                </>}
                        </div>
                        <div className="received-at-message">{receivedAtMessage}</div>
                    </div>
                </Link>
                {['messages', 'likes'].includes(type) &&
                    <div className="button-section">
                        {type === 'likes' &&
                            <>
                                {onLike && <button onClick={() => onLike()} className="like">
                                    <HeartIcon />
                                </button>}
                                {onPass && <button onClick={() => onPass()} className="pass">
                                    <TimesIcon />
                                </button>}
                            </>}
                        {type === 'messages' && numberOfMessages && numberOfMessages > 1 &&
                            <div className="num-of-messages">{numberOfMessages > 99 ? '99+' : numberOfMessages}</div>}
                    </div>}
            </div>
        </div>
    );
}

export default function NotificationMenu({ titleIcon, titleIconDark, title, listItems }: NotificationMenuProps) {
    return (
        <div className="notification-menu-container">
            <div className="header-section">
                <div className='title-img-container'>
                    <div className="light-dark">
                        <span className="light">
                            <Image width={30} height={30} src={titleIcon} alt={title} />
                        </span>
                        <span className="dark">
                            <Image width={30} height={30} src={titleIconDark} alt={title} />
                        </span>
                    </div>
                </div>
                <div className="title">{title}</div>
            </div>
            <div className="list-item-container">
                {listItems.map(listItem => <NotificationListItem
                    key={listItem.id} {...listItem} />)}
            </div>
        </div>
    );
}
