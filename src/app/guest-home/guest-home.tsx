import './guest-home.scss';
import Image from 'next/image';
import SeekingMatchForm from '@/common/seeking-match-form/seeking-match-form';
import { redirect } from 'next/navigation';
import { aboutContent, aboutTitle, topHeader, topParagraph } from '@/content/guest-home-content';
import SiteWrapper from '@/common/site-wrapper/site-wrapper';

// Server action to handle form submission
async function handleFormSubmit(formData: FormData) {
    'use server';

    const userSex = formData.get('userSex') as string;
    const userSexSeeking = formData.get('userSexSeeking') as string;

    if (!userSex || !userSexSeeking) {
        return;
    }

    redirect(`/registration?userSex=${userSex}&userSexSeeking=${userSexSeeking}`);
}

export default function GuestHome() {
    return (
        <SiteWrapper>
            <div className="guest-home-wrapper">
                <div style={{backgroundImage: `url('${process.env.NEXT_PUBLIC_IMAGE_ROOT || ''}/images/home_hero_background.webp')`}} className="hero-section">
                    <div className="dark-gradient"></div>
                    <div className="hero-content">
                        <div className="seeking-form-section">
                            <h1>{topHeader}</h1>
                            <p>{topParagraph}</p>
                            <div className="seeking-container">
                                <form action={handleFormSubmit}>
                                    <div className="logo-title-section">
                                        <div className="small-logo-container">
                                            <span className="light-dark">
                                                <span className="light">
                                                    <Image
                                                        alt="Logo"
                                                        title="Diwa Date"
                                                        src="/images/logo.svg"
                                                        width={70}
                                                        height={70}
                                                        priority
                                                    />
                                                </span>
                                                <span className="dark">
                                                    <Image
                                                        alt="Logo"
                                                        title="Diwa Date"
                                                        src="/images/logo_dark.svg"
                                                        width={70}
                                                        height={70}
                                                        priority
                                                    />
                                                </span>
                                            </span>
                                        </div>
                                        <div className="seeking-form-info">
                                            <h2>Serious Minded Dating Only</h2>
                                            <p>Meet Filipino singles who are seeking serious relationships.</p>
                                        </div>
                                    </div>
                                    <SeekingMatchForm submitButtonLabel='Browse Singles' />
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="site-feature-section">
                    <div className="site-feature feature-one">
                        <div className="site-feature-img-container">
                            <Image
                                alt="Shield icon"
                                src="/images/shield-icon.png"
                                width={60}
                                height={60}
                            />
                        </div>
                        <h4>Safe and Secure Online Dating Experience</h4>
                        <p>We use advanced AI and manual processes to ensure that profiles are real, with a zero-tolerance policy to
                            suspicious behavior.</p>
                    </div>
                    <div className="site-feature feature-two">
                        <div className="site-feature-img-container">
                            <Image
                                alt="Chat icon"
                                src="/images/chat-icon.png"
                                width={60}
                                height={60}
                            />
                        </div>
                        <h4>Connect With Your Matches</h4>
                        <p>Form meaningful connection. Meet, connect, and message singles you match with through chat and direct messages.</p>
                    </div>
                    <div className="site-feature feature-third">
                        <div className="site-feature-img-container">
                            <Image
                                alt="Money coins icon"
                                src="/images/money-coins-icon.png"
                                width={60}
                                height={60}
                            />
                        </div>
                        <h4>Simple, One Price Membership</h4>
                        <p>We have a one price, simple membership plan. One affordable monthly payment unlocks
                            all membership features.</p>
                    </div>
                </div>
                <div className="about-section">
                    <div className="container">
                        <div className="about-content">
                            <h2>{aboutTitle}</h2>
                            <p>{aboutContent}</p>
                        </div>
                        <div className="cartoon-container">
                            <img
                                alt="Cartoon"
                                title="Diwa Date"
                                src={`${process.env.NEXT_PUBLIC_IMAGE_ROOT || ''}/images/cartoon.webp`}
                                width={400}
                                height={300}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </SiteWrapper>
    );
}
