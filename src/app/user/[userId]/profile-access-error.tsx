'use client';

import { TimesIcon } from "react-line-awesome";

interface ProfileAccessErrorProps {
    errorMessage: string;
    title: string;
}

export default function ProfileAccessError({ errorMessage, title }: ProfileAccessErrorProps) {
    return (
        <div className="error-notification-section">
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <TimesIcon style={{ fontSize: '64px', color: '#999', marginBottom: '20px' }} />

                <h2 style={{ marginBottom: '20px' }}>
                    {title}
                </h2>

                <p style={{
                    color: '#666',
                    maxWidth: '500px',
                    margin: '0 auto 30px',
                    lineHeight: '1.6'
                }}>
                    {errorMessage}
                </p>

                <button
                    onClick={() => window.history.back()}
                    className="request-match"
                    style={{
                        cursor: 'pointer',
                        border: 'none',
                        minWidth: '120px'
                    }}
                >
                    Go Back
                </button>
            </div>
        </div>
    );
}
