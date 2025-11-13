import { Popover, Dialog, useMediaQuery } from '@mui/material';
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
    const isMobile = useMediaQuery('(max-width:768px)');

    const content = (
        <NotificationMenu
            titleIcon={titleIcon}
            titleIconDark={titleIconDark}
            title={title}
            listItems={listItems}
            onClose={isMobile ? onClose : undefined}
        />
    );

    if (isMobile) {
        return (
            <Dialog
                id={id}
                open={open}
                onClose={onClose}
                maxWidth={false}
                slotProps={{
                    backdrop: {
                        sx: {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    paper: {
                        sx: {
                            width: '95%',
                            height: '90%',
                            maxWidth: 'none',
                            maxHeight: 'none',
                            margin: 0,
                            borderRadius: 0,
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }
                }}
            >
                {content}
            </Dialog>
        );
    }

    return (
        <Popover
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            id={id}
            anchorEl={anchorEl}
            onClose={onClose}
            open={open}
        >
            {content}
        </Popover>
    );
} 