"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GuestHome;
require("./guest-home.scss");
const image_1 = __importDefault(require("next/image"));
const seeking_match_form_1 = __importDefault(require("@/common/seeking-match-form/seeking-match-form"));
const navigation_1 = require("next/navigation");
const guest_home_content_1 = require("@/content/guest-home-content");
const site_wrapper_1 = __importDefault(require("@/common/site-wrapper/site-wrapper"));
// Server action to handle form submission
async function handleFormSubmit(formData) {
    'use server';
    const userSex = formData.get('userSex');
    const userSexSeeking = formData.get('userSexSeeking');
    if (!userSex || !userSexSeeking) {
        return;
    }
    (0, navigation_1.redirect)(`/registration?userSex=${userSex}&userSexSeeking=${userSexSeeking}`);
}
function GuestHome() {
    return (<site_wrapper_1.default>
            <div className="guest-home-wrapper">
                <div className="hero-section">
                    <div className="dark-gradient"></div>
                    <div className="hero-content">
                        <div className="seeking-form-section">
                            <h1>{guest_home_content_1.topHeader}</h1>
                            <p>{guest_home_content_1.topParagraph}</p>
                            <div className="seeking-container">
                                <form action={handleFormSubmit}>
                                    <div className="logo-title-section">
                                        <div className="small-logo-container">
                                            <image_1.default alt="Logo" title="Diwa Date" src="/images/blue_background_icon_logo.png" width={70} height={70} priority/>
                                        </div>
                                        <div className="seeking-form-info">
                                            <h2>Serious Minded Dating Only</h2>
                                            <p>Meet Filipino singles who are seeking serious relationships.</p>
                                        </div>
                                    </div>
                                    <seeking_match_form_1.default submitButtonLabel='Browse Singles'/>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="site-feature-section">
                    <div className="site-feature feature-one">
                        <div className="site-feature-img-container">
                            <image_1.default alt="Shield icon" src="/images/shield-icon.png" width={60} height={60}/>
                        </div>
                        <h4>Safe and Secure Online Dating Experience</h4>
                        <p>We use AI and manual processes to ensure that profiles are real, with a zero-tolerance policy to
                            suspicious behavior.</p>
                    </div>
                    <div className="site-feature feature-two">
                        <div className="site-feature-img-container">
                            <image_1.default alt="Chat icon" src="/images/chat-icon.png" width={60} height={60}/>
                        </div>
                        <h4>Connect With Your Matches</h4>
                        <p>Form meaningful connection. Meet, connect, and message singles you match with through chat,
                            direct message, and video.</p>
                    </div>
                    <div className="site-feature feature-third">
                        <div className="site-feature-img-container">
                            <image_1.default alt="Money coins icon" src="/images/money-coins-icon.png" width={60} height={60}/>
                        </div>
                        <h4>Simple, One Price Membership</h4>
                        <p>We have a one price, simple membership plan. One affordable, monthly or weekly payment unlocks
                            all membership features.</p>
                    </div>
                </div>
                <div className="about-section">
                    <div className="container">
                        <div className="about-content">
                            <h2>{guest_home_content_1.aboutTitle}</h2>
                            <p>{guest_home_content_1.aboutContent}</p>
                        </div>
                        <div className="cartoon-container">
                            <image_1.default alt="Cartoon" title="Diwa Date" src="/images/cartoon.jpg" width={400} height={300}/>
                        </div>
                    </div>
                </div>
            </div>
        </site_wrapper_1.default>);
}
//# sourceMappingURL=guest-home.jsx.map