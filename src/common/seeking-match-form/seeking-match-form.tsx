'use client';

import { useState } from 'react';
import './seeking-match-form.scss';

interface SeekingMatchFormProps {
    initialUserSex?: string;
    initialUserSexSeeking?: string;
    userSexError?: string;
    userSexSeekingError?: string;
    submitButtonLabel?: string;
    onUpdate?: (data: { userSex?: string, userSexSeeking?: string }) => void;
}

export default function SeekingMatchForm({
    initialUserSex,
    initialUserSexSeeking,
    userSexError,
    userSexSeekingError,
    onUpdate,
    submitButtonLabel
}: SeekingMatchFormProps) {
    const [userSex, setUserSex] = useState<string | undefined>(initialUserSex);
    const [userSexSeeking, setUserSexSeeking] = useState<string | undefined>(initialUserSexSeeking);

    const handleUserSexClick = (sex: string) => {
        setUserSex(sex);
        if (onUpdate) {
            onUpdate({ userSex: sex, userSexSeeking });
        }
    };

    const handleUserSexSeekingClick = (sex: string) => {
        setUserSexSeeking(sex);
        if (onUpdate) {
            onUpdate({ userSex, userSexSeeking: sex });
        }
    };

    return (
        <div className='seeking-match-form-container'>
            <input type="hidden" name="userSex" value={userSex || ''} />
            <input type="hidden" name="userSexSeeking" value={userSexSeeking || ''} />

            <div className="radio-button-section">
                <div className="caption">I am a</div>
                <div className={`choice-container ${userSexError ? 'error' : ''}`}>
                    <div
                        className={`radio-button-container ${userSex === 'male' ? 'selected' : ''}`}
                        id="user-sex-choice-male"
                        onClick={() => handleUserSexClick('male')}
                    >
                        <div className="radio-button"></div>
                        <div className="label">Man</div>
                    </div>
                    <div
                        className={`radio-button-container ${userSex === 'female' ? 'selected' : ''}`}
                        id="user-sex-choice-female"
                        onClick={() => handleUserSexClick('female')}
                    >
                        <div className="radio-button"></div>
                        <div className="label">Woman</div>
                    </div>
                </div>

                <div className="caption">looking for a</div>
                <div className={`choice-container ${userSexSeekingError ? 'error' : ''}`}>
                    <div
                        className={`radio-button-container ${userSexSeeking === 'male' ? 'selected' : ''}`}
                        id="seeking-sex-choice-male"
                        onClick={() => handleUserSexSeekingClick('male')}
                    >
                        <div className="radio-button"></div>
                        <div className="label">Man</div>
                    </div>
                    <div
                        className={`radio-button-container ${userSexSeeking === 'female' ? 'selected' : ''}`}
                        id="seeking-sex-choice-female"
                        onClick={() => handleUserSexSeekingClick('female')}
                    >
                        <div className="radio-button"></div>
                        <div className="label">Woman</div>
                    </div>
                </div>
            </div>
            {submitButtonLabel && <div className='submit-button-section'>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={!userSex || !userSexSeeking}
                >
                    {submitButtonLabel}
                </button>
            </div>}
        </div>
    );
}
