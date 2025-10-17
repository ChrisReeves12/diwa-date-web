import React, { ReactNode } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography
} from '@mui/material';

interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    confirmColor = 'primary'
}: ConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            maxWidth="sm"
            fullWidth
        >
            {title && (
                <DialogTitle id="confirm-dialog-title">
                    {title}
                </DialogTitle>
            )}
            <DialogContent>
                <Typography id="confirm-dialog-description" component="div">
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit">
                    {cancelText}
                </Button>
                <Button onClick={onConfirm} color={confirmColor} variant="contained" autoFocus>
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

