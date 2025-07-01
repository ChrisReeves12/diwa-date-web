"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotificationMenu;
require("./notification-menu.scss");
const image_1 = __importDefault(require("next/image"));
const user_photo_display_1 = __importDefault(require("@/common/user-photo-display/user-photo-display"));
const react_line_awesome_1 = require("react-line-awesome");
const link_1 = __importDefault(require("next/link"));
const util_1 = require("@/util");
function NotificationListItem({ senderUser, content, receivedAtMessage, numberOfMessages, userPhotoUrl, infoSectionUrl, onLike, onPass, type }) {
    return (<div className="notification-list-item">
            <div className="user-photo">
                <link_1.default href={userPhotoUrl}>
                    <user_photo_display_1.default gender={senderUser.gender} alt={senderUser.displayName} width={45} height={45} croppedImageData={senderUser.mainPhotoCroppedImageData} imageUrl={senderUser.publicMainPhoto}/>
                </link_1.default>
            </div>
            <div className="info-button-container">
                <link_1.default href={infoSectionUrl}>
                    <div className={`info-section ${type === 'notifications' ? 'notification' : ''}`}>
                        <div className="name-section">
                            <div className="name">
                                {type !== "notifications" ?
            <>{senderUser.displayName}, {senderUser.age}</> :
            <>It&apos;s A Match!</>}
                            </div>
                        </div>
                        <div className="content">
                            {type !== "notifications" ?
            <>{(0, util_1.decodeHtmlEntities)(content)}</> :
            <>
                                    🎉Congratulations on the match! 🎉<br />
                                    Go start the conversation with <strong>{senderUser.displayName}</strong>
                                </>}
                        </div>
                        <div className="received-at-message">{receivedAtMessage}</div>
                    </div>
                </link_1.default>
                {['messages', 'likes'].includes(type) &&
            <div className="button-section">
                        {type === 'likes' &&
                    <>
                                {onLike && <button onClick={() => onLike()} className="like">
                                    <react_line_awesome_1.HeartIcon />
                                </button>}
                                {onPass && <button onClick={() => onPass()} className="pass">
                                    <react_line_awesome_1.TimesIcon />
                                </button>}
                            </>}
                        {type === 'messages' && numberOfMessages && numberOfMessages > 1 &&
                    <div className="num-of-messages">{numberOfMessages > 99 ? '99+' : numberOfMessages}</div>}
                    </div>}
            </div>
        </div>);
}
function NotificationMenu({ titleIcon, titleIconDark, title, listItems }) {
    return (<div className="notification-menu-container">
            <div className="header-section">
                <div className='title-img-container'>
                    <div className="light-dark">
                        <span className="light">
                            <image_1.default width={30} height={30} src={titleIcon} alt={title}/>
                        </span>
                        <span className="dark">
                            <image_1.default width={30} height={30} src={titleIconDark} alt={title}/>
                        </span>
                    </div>
                </div>
                <div className="title">{title}</div>
            </div>
            <div className="list-item-container">
                {listItems.map(listItem => <NotificationListItem key={listItem.id} {...listItem}/>)}
            </div>
        </div>);
}
//# sourceMappingURL=notification-menu.jsx.map