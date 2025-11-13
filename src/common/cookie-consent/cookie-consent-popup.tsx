'use client';

import React from 'react';
import { Paper, Typography, Button, Box, Slide } from '@mui/material';
import { useCookieConsent } from './cookie-consent-provider';
import './cookie-consent.scss';

export default function CookieConsentPopup() {
    const { showPopup, acceptCookies, declineCookies } = useCookieConsent();

    if (!showPopup) {
        return null;
    }

    return (
        <Slide direction="up" in={showPopup} mountOnEnter unmountOnExit>
            <Paper
                className="cookie-consent-popup"
                elevation={8}
                role="dialog"
                aria-labelledby="cookie-consent-title"
                aria-describedby="cookie-consent-description"
            >
                <Box className="cookie-consent-content">
                    <Box className="cookie-consent-text">
                        <Typography
                            id="cookie-consent-title"
                            variant="h6"
                            component="h2"
                            className="cookie-consent-title"
                        >
                            Cookie Consent
                        </Typography>
                        <Typography
                            id="cookie-consent-description"
                            variant="body2"
                            className="cookie-consent-description"
                        >
                            We use cookies to enhance your experience on our site. By continuing to browse,
                            you agree to our use of cookies for analytics and personalization.
                        </Typography>
                    </Box>
                    <Box className="cookie-consent-actions">
                        <Button
                            variant="outlined"
                            onClick={declineCookies}
                            className="cookie-consent-decline"
                            aria-label="Decline cookies"
                        >
                            Decline
                        </Button>
                        <Button
                            variant="contained"
                            onClick={acceptCookies}
                            className="cookie-consent-accept"
                            aria-label="Accept cookies"
                        >
                            Accept
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Slide>
    );
}