"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SeekingMatchForm;
const react_1 = require("react");
require("./seeking-match-form.scss");
function SeekingMatchForm({ initialUserSex, initialUserSexSeeking, userSexError, userSexSeekingError, onUpdate, submitButtonLabel }) {
    const [userSex, setUserSex] = (0, react_1.useState)(initialUserSex);
    const [userSexSeeking, setUserSexSeeking] = (0, react_1.useState)(initialUserSexSeeking);
    const handleUserSexClick = (sex) => {
        setUserSex(sex);
        if (onUpdate) {
            onUpdate({ userSex: sex, userSexSeeking });
        }
    };
    const handleUserSexSeekingClick = (sex) => {
        setUserSexSeeking(sex);
        if (onUpdate) {
            onUpdate({ userSex, userSexSeeking: sex });
        }
    };
    return (<div className='seeking-match-form-container'>
            <input type="hidden" name="userSex" value={userSex || ''}/>
            <input type="hidden" name="userSexSeeking" value={userSexSeeking || ''}/>

            <div className="radio-button-section">
                <div className="caption">I am a</div>
                <div className={`choice-container ${userSexError ? 'error' : ''}`}>
                    <div className={`radio-button-container ${userSex === 'male' ? 'selected' : ''}`} id="user-sex-choice-male" onClick={() => handleUserSexClick('male')}>
                        <div className="radio-button"></div>
                        <div className="label">Man</div>
                    </div>
                    <div className={`radio-button-container ${userSex === 'female' ? 'selected' : ''}`} id="user-sex-choice-female" onClick={() => handleUserSexClick('female')}>
                        <div className="radio-button"></div>
                        <div className="label">Woman</div>
                    </div>
                </div>

                <div className="caption">looking for a</div>
                <div className={`choice-container ${userSexSeekingError ? 'error' : ''}`}>
                    <div className={`radio-button-container ${userSexSeeking === 'male' ? 'selected' : ''}`} id="seeking-sex-choice-male" onClick={() => handleUserSexSeekingClick('male')}>
                        <div className="radio-button"></div>
                        <div className="label">Man</div>
                    </div>
                    <div className={`radio-button-container ${userSexSeeking === 'female' ? 'selected' : ''}`} id="seeking-sex-choice-female" onClick={() => handleUserSexSeekingClick('female')}>
                        <div className="radio-button"></div>
                        <div className="label">Woman</div>
                    </div>
                </div>
            </div>
            {submitButtonLabel && <div className='submit-button-section'>
                <button type="submit" className="btn-primary" disabled={!userSex || !userSexSeeking}>
                    {submitButtonLabel}
                </button>
            </div>}
        </div>);
}
//# sourceMappingURL=seeking-match-form.jsx.map