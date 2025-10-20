import './notification-menu.scss';
import Image from "next/image";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { HeartIcon, InfoCircleIcon, TimesIcon } from "react-line-awesome";
import Link from 'next/link';
import { decodeHtmlEntities } from '@/util';
import { User } from "@/types";
import { CircularProgress } from "@mui/material";

type NotificationType = 'notifications' | 'likes' | 'messages';

interface NotificationMenuProps {
    titleIcon: string,
    titleIconDark: string,
    title: string,
    listItems: NotificationListItemProps[],
    onClose?: () => void
}

type NotificationUser = Pick<User, 'mainPhotoCroppedImageData' | 'publicMainPhoto' | 'displayName' | 'age' | 'gender' | 'locationName'>

interface NotificationListItemProps {
    id: string | number,
    senderUser?: NotificationUser,
    receivedAtMessage: string,
    type: NotificationType,
    content: string,
    numberOfMessages?: number,
    userPhotoUrl: string,
    infoSectionUrl: string,
    onLike?: () => void,
    onPass?: () => void,
    onDelete?: (notificationId: string | number) => void,
    isLoading?: boolean
}

function NotificationListItem({ id, senderUser, content, receivedAtMessage,
    numberOfMessages, userPhotoUrl, infoSectionUrl, onLike, onPass, onDelete, type, isLoading = false }: NotificationListItemProps) {

    const matchConfirmContent = <>
        🎉Congratulations on the match! 🎉<br />
        Go start the conversation with <strong>{senderUser?.displayName || ''}</strong>
    </>

    return (
        <div className="notification-list-item">
            {!!senderUser && <div className="user-photo">
                <Link href={userPhotoUrl}>
                    <UserPhotoDisplay
                        gender={senderUser.gender}
                        alt={senderUser.displayName}
                        width={45}
                        height={45}
                        croppedImageData={senderUser.mainPhotoCroppedImageData}
                        imageUrl={senderUser.publicMainPhoto}
                    />
                </Link>
            </div>}
            <div className={"info-button-container" + (type === 'notifications' ? ' notifications' : '')}>
                {!senderUser && type === 'notifications' && <div className="account-notification">
                    <div className="info-content-section">
                        <InfoCircleIcon size={"lx"} />
                        <div className="account-notification-content">{decodeHtmlEntities(content || '')}</div>
                    </div>
                    <button onClick={() => typeof onDelete === 'function' ? onDelete(id) : null}>
                        <TimesIcon />
                    </button>
                </div>}
                {!!senderUser && <Link href={infoSectionUrl}>
                    <div className={`info-section ${type === 'notifications' ? 'notification' : ''}`}>
                        <div className="name-section">
                            <div className="name">
                                {type !== "notifications" ?
                                    <>{senderUser?.displayName}, {senderUser?.age}</> :
                                    <>It&apos;s A Match!</>}
                            </div>
                        </div>
                        <div className="content">
                            {type !== "notifications" ?
                                <>{decodeHtmlEntities(content)}</> :
                                <Link href={infoSectionUrl}>
                                    {matchConfirmContent}
                                </Link>}
                        </div>
                        <div className="received-at-message">{receivedAtMessage}</div>
                    </div>
                </Link>}
                {['messages', 'likes'].includes(type) &&
                    <div className="button-section">
                        {type === 'likes' &&
                            (isLoading ? <CircularProgress size={24} sx={{ color: "primary" }} /> : <>
                                {onLike && <button onClick={() => onLike()} className="like" disabled={isLoading}>
                                    <HeartIcon />
                                </button>}
                                {onPass && <button onClick={() => onPass()} className="pass" disabled={isLoading}>
                                    <TimesIcon />
                                </button>}
                            </>)}
                        {type === 'messages' && (numberOfMessages || 0) > 1 &&
                            <div className="num-of-messages">{(numberOfMessages || 0) > 99 ? '99+' : numberOfMessages}</div>}
                    </div>}
            </div>
        </div>
    );
}

export default function NotificationMenu({ titleIcon, titleIconDark, title, listItems, onClose }: NotificationMenuProps) {
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
                {onClose && (
                    <button className="close-button" onClick={onClose} aria-label="Close">
                        <TimesIcon />
                    </button>
                )}
            </div>
            <div className="list-item-container">
                {listItems.length > 0 ? (
                    listItems.map(listItem => <NotificationListItem
                        key={listItem.id} {...listItem} />)
                ) : (title.toLowerCase() === 'notifications' ?
                    <div className="empty-notifications">
                        <div className="empty-notifications-content">
                            <InfoCircleIcon size="3x" />
                            <div className="empty-message">
                                You don't have any notifications at the moment
                            </div>
                        </div>
                    </div> : null
                )}
            </div>
        </div>
    );
}
