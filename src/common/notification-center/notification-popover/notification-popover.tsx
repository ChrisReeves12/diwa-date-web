import { Popover } from '@mui/material';
import NotificationMenu from "@/common/notification-center/notification-menu/notification-menu";

interface NotificationPopoverProps {
    id: string;
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    titleIcon: string;
    titleIconDark: string;
    title: string;
    listItems: any[];
}

export default function NotificationPopover({
    id,
    anchorEl,
    open,
    onClose,
    titleIcon,
    titleIconDark,
    title,
    listItems
}: NotificationPopoverProps) {
    return (
        <Popover
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            id={id}
            anchorEl={anchorEl}
            onClose={onClose}
            open={open}
        >
            <NotificationMenu
                titleIcon={titleIcon}
                titleIconDark={titleIconDark}
                title={title}
                listItems={listItems}
            />
        </Popover>
    );
} 