'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    CircularProgress,
    Fade
} from '@mui/material';
import { reportUserAction } from '@/common/server-actions/user.actions';
import { showAlert } from '@/util';
import { ExclamationTriangleIcon } from 'react-line-awesome';

interface ReportUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    userName: string;
    onSuccess?: () => void;
}

export default function ReportUserDialog({
    isOpen,
    onClose,
    userId,
    userName,
    onSuccess
}: ReportUserDialogProps) {
    const [reportContent, setReportContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleClose = () => {
        if (!isSubmitting) {
            setReportContent('');
            setShowSuccess(false);
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (reportContent.trim().length < 10) {
            showAlert('Please provide at least 10 characters describing the issue.');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await reportUserAction(userId, reportContent);

            if (result.success) {
                setShowSuccess(true);
                onSuccess?.();

                // Auto-close after 3 seconds
                setTimeout(() => {
                    handleClose();
                }, 3000);
            } else {
                showAlert(result.error || 'Failed to submit report. Please try again.');
            }
        } catch (error) {
            showAlert('An error occurred while submitting your report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            aria-labelledby="report-dialog-title"
            aria-describedby="report-dialog-description"
        >
            <Fade in={!showSuccess}>
                <Box display={showSuccess ? 'none' : 'block'}>
                    <form onSubmit={handleSubmit}>
                        <DialogTitle id="report-dialog-title">
                            <Box display="flex" alignItems="center" gap={1}>
                                <ExclamationTriangleIcon style={{ color: '#ef4444', fontSize: '20px' }} />
                                <Typography variant="h6">Report User</Typography>
                            </Box>
                        </DialogTitle>

                        <DialogContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Report <strong>{userName}</strong> for inappropriate content or behavior
                            </Typography>

                            <Box mt={3}>
                                <Typography variant="body2" fontWeight="medium" gutterBottom>
                                    Why are you reporting this user?
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    value={reportContent}
                                    onChange={(e) => setReportContent(e.target.value)}
                                    placeholder="Please describe the issue (e.g., inappropriate content, suspicious behavior, fake profile, etc.)"
                                    variant="outlined"
                                    disabled={isSubmitting}
                                    inputProps={{ maxLength: 1000 }}
                                    error={reportContent.length > 0 && reportContent.trim().length < 10}
                                    helperText={
                                        <Box display="flex" justifyContent="space-between">
                                            <span>
                                                {reportContent.length > 0 && reportContent.trim().length < 10
                                                    ? 'Minimum 10 characters required'
                                                    : 'Your report will be reviewed by our team'}
                                            </span>
                                            <span>{reportContent.length}/1000</span>
                                        </Box>
                                    }
                                />
                            </Box>
                        </DialogContent>

                        <DialogActions>
                            <Button
                                onClick={handleClose}
                                disabled={isSubmitting}
                                color="inherit"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                color="error"
                                disabled={isSubmitting || reportContent.trim().length < 10}
                                startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Report'}
                            </Button>
                        </DialogActions>
                    </form>
                </Box>
            </Fade>

            <Fade in={showSuccess}>
                <Box display={showSuccess ? 'block' : 'none'}>
                    <DialogContent>
                        <Box textAlign="center" py={4}>
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    backgroundColor: '#22c55e20',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    mb: 3
                                }}
                            >
                                <svg
                                    style={{ width: 32, height: 32, color: '#22c55e' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </Box>

                            <Typography variant="h6" gutterBottom>
                                Thank You
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                Your report has been submitted successfully.
                            </Typography>

                            <Typography variant="body2" color="text.secondary" mt={2}>
                                A member of our team will review your report and take appropriate action.
                                We will contact you if we need any additional information.
                            </Typography>
                        </Box>
                    </DialogContent>
                </Box>
            </Fade>
        </Dialog>
    );
} 