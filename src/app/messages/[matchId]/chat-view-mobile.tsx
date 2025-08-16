// import './chat-view-mobile.scss';
// import { ChatViewProps } from "@/app/messages/[matchId]/chat-view-props.type";
// import { useParams, useRouter } from "next/navigation";
// import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
// import { ArrowLeftIcon } from "react-line-awesome";
// import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
// import Link from "next/link";
// import { isUserOnline } from "@/helpers/user.helpers";
// import { useState } from "react";
// import { getChatMessages, sendChatMessage } from "@/app/messages/messages.actions";
//
// export function ChatViewMobile({currentUser, matchDetails}: ChatViewProps) {
//     const params = useParams();
//     const router = useRouter();
//     const matchId = params.matchId as string;
//     const [sendError, setSendError] = useState<string | null>(null);
//
//     const {otherUser} = matchDetails;
//     const isOnline = isUserOnline(new Date(otherUser.lastActiveAt), otherUser.hideOnlineStatus);
//
//     const handleSendMessage = async (e: React.FormEvent) => {
//         e.preventDefault();
//
//         if (!messageInput.trim() || isSending) {
//             return;
//         }
//
//         // Stop typing indicator when sending message
//         stopTyping();
//
//         const messageContent = messageInput.trim();
//         setIsSending(true);
//         setSendError(null);
//
//         try {
//             const result = await sendChatMessage(matchId, messageContent);
//
//             if (result.error) {
//                 setSendError(result.error);
//             } else {
//                 // Clear the input on successful send
//                 setMessageInput('');
//                 // Set flag to refocus after render
//                 needsFocusRef.current = true;
//
//                 // No need to refetch all, just append the new message optimistically
//                 // or wait for WebSocket to deliver it. For now, let's refetch just the newest.
//                 const lastMessage = messages[messages.length - 1];
//                 const options: { cursor?: number; direction?: 'before' | 'after' } = lastMessage
//                     ? { cursor: lastMessage.id, direction: 'after' }
//                     : {};
//                 const updatedMessages = await getChatMessages(matchId, options);
//                 if (updatedMessages.data) {
//                     setMessages(prev => {
//                         const existingIds = new Set(prev.map(msg => msg.id));
//                         const newMessages = (updatedMessages.data || []).filter(msg => !existingIds.has(msg.id));
//                         return [...prev, ...newMessages];
//                     });
//                     setTimeout(() => scrollToBottom(), 100);
//                 }
//             }
//         } catch (error) {
//             console.error('Error sending message:', error);
//             setSendError('Failed to send message. Please try again.');
//         } finally {
//             setIsSending(false);
//         }
//     };
//
//     return (
//         <DashboardWrapper activeTab="messages" currentUser={currentUser}>
//             <div className="chat-view-mobile-container">
//                 <div className="chat-view-header">
//                     <div className="back-button-container">
//                         <button>
//                             <ArrowLeftIcon/>
//                         </button>
//                     </div>
//                     <Link href={`/user/${otherUser.id}`} className="user-info">
//                         <UserPhotoDisplay
//                             alt={otherUser.displayName}
//                             croppedImageData={otherUser.mainPhotoCroppedImageData}
//                             imageUrl={otherUser.publicMainPhoto}
//                             gender={otherUser.gender}
//                             width={40}
//                             height={40}
//                         />
//
//                         <div className="user-details">
//                             <div className="user-name">{otherUser.displayName}</div>
//                             <div className="online-status">
//                                 <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
//                                 <span className="status-text">
//                                     {isOnline ? 'Online' : 'Offline'}
//                                 </span>
//                             </div>
//                         </div>
//                     </Link>
//                 </div>
//
//                 <div className="textarea-container">
//                     <div className="message-input-area">
//                         {sendError && (
//                             <div className="send-error">
//                                 <span className="error-text">{sendError}</span>
//                                 <button
//                                     className="dismiss-error"
//                                     onClick={() => setSendError(null)}
//                                     aria-label="Dismiss error"
//                                 >
//                                     ✕
//                                 </button>
//                             </div>
//                         )}
//                         <form onSubmit={handleSendMessage} className="message-input-form">
//                             <div className="input-container">
//                             <textarea
//                                 ref={textareaRef}
//                                 value={messageInput}
//                                 onChange={handleInputChange}
//                                 onKeyDown={handleInputKeyDown}
//                                 placeholder={`Message ${otherUser.displayName}...`}
//                                 className="message-input"
//                                 rows={1}
//                                 maxLength={1000}
//                                 disabled={isSending}
//                             />
//                                 <button
//                                     type="submit"
//                                     className={`send-button ${(!messageInput.trim() || isSending) ? 'disabled' : ''}`}
//                                     disabled={!messageInput.trim() || isSending}
//                                     aria-label="Send message">
//                                     {isSending ? (
//                                         <div className="send-spinner"></div>
//                                     ) : (
//                                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                             <line x1="22" y1="2" x2="11" y2="13"></line>
//                                             <polygon points="22,2 15,22 11,13 2,9"></polygon>
//                                         </svg>
//                                     )}
//                                 </button>
//                             </div>
//                             <div className="input-info">
//                             <span className="character-count">
//                                 {messageInput.length}/1000
//                             </span>
//                                 <span className="input-hint">
//                                 Press Enter to send, Shift+Enter for new line
//                             </span>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             </div>
//         </DashboardWrapper>
//     );
// }
