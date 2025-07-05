import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography
} from '@mui/material';

interface AlertDialogProps {
    open: boolean;
    title?: string;
    message: string;
    onClose: () => void;
}

export default function AlertDialog({ open, title, message, onClose }: AlertDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            maxWidth="sm"
            fullWidth
        >
            {title && (
                <DialogTitle id="alert-dialog-title">
                    {title}
                </DialogTitle>
            )}
            <DialogContent>
                <Typography id="alert-dialog-description">
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary" autoFocus>
                    Dismiss
                </Button>
            </DialogActions>
        </Dialog>
    );
} 