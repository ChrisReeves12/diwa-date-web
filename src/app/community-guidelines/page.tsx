import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './community-guidelines.scss';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';

export const metadata = {
    title: `${process.env.APP_NAME} | Community Guidelines`,
};

export default async function CommunityGuidelinesPage() {
    const currentUser = await getCurrentUser(await cookies());

    return (
        <SiteWrapper currentUser={currentUser}>
            <div className="community-guidelines-container">
                <h1>Community Guidelines</h1>

                <div className="guidelines-metadata">
                    <p>Effective Date: September 15, 2025</p>
                    <p>Last Updated: September 15, 2025</p>
                </div>

                <hr />

                <section id="welcome">
                    <h2>Welcome to Diwa Date</h2>

                    <p>At Diwa Date, we're committed to creating a safe, respectful, and authentic environment where people can connect and build meaningful relationships. These Community Guidelines outline the standards of behavior we expect from all members of our community.</p>

                    <p>By using Diwa Date, you agree to follow these guidelines. Violations may result in warnings, temporary restrictions, or permanent removal from our platform without prior notice.</p>
                </section>

                <hr />

                <section id="authenticity">
                    <h2>1. BE AUTHENTIC AND HONEST</h2>

                    <section>
                        <h3>1.1 Real Identity Required</h3>
                        <ul>
                            <li>Use your information and accurate age</li>
                            <li>Upload genuine, recent photos of yourself</li>
                            <li>Provide truthful information in your profile</li>
                            <li>Do not impersonate another person or create fake profiles</li>
                        </ul>
                    </section>

                    <section>
                        <h3>1.2 Recent and Accurate Photos</h3>
                        <ul>
                            <li>All photos must be of you and taken within the last 2 years</li>
                            <li>No heavily filtered or misleading photos that misrepresent your appearance</li>
                            <li>Group photos are allowed but your face should be clearly visible</li>
                            <li>No photos of celebrities, models, or other people</li>
                            <li>No photos of minors or children</li>
                            <li>No AI generated photos</li>
                        </ul>
                    </section>

                    <section>
                        <h3>1.3 Honest Intentions</h3>
                        <ul>
                            <li>Be clear about what type of relationship you're seeking</li>
                            <li>Don't mislead others about your relationship status, intentions, or circumstances</li>
                            <li>If your situation changes (relationship status, location, etc.), update your profile accordingly</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="respect">
                    <h2>2. RESPECT AND KINDNESS</h2>

                    <section>
                        <h3>2.1 Treat Others with Respect</h3>
                        <ul>
                            <li>Be courteous and considerate in all interactions</li>
                            <li>Respect others' boundaries and decisions</li>
                            <li>Accept rejection gracefully - "no" means "no"</li>
                            <li>Do not pressure anyone for personal information, meetings, or intimate content</li>
                        </ul>
                    </section>

                    <section>
                        <h3>2.2 No Harassment or Abuse</h3>
                        <ul>
                            <li>Do not send unwanted sexual messages or content</li>
                            <li>No persistent messaging after someone has indicated they're not interested</li>
                            <li>Do not threaten, intimidate, or bully other users</li>
                            <li>Respect cultural and religious differences</li>
                        </ul>
                    </section>

                    <section>
                        <h3>2.3 Appropriate Communication</h3>
                        <ul>
                            <li>Keep conversations appropriate for a dating platform</li>
                            <li>No excessive profanity or offensive language</li>
                            <li>Do not share explicit sexual content without consent</li>
                            <li>Maintain respectful dialogue even during disagreements</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="safety">
                    <h2>3. SAFETY AND SECURITY</h2>

                    <section>
                        <h3>3.1 Protect Your Privacy</h3>
                        <ul>
                            <li>Don't share personal information too quickly (full name, address, phone number, workplace)</li>
                            <li>Use Diwa Date's messaging system initially before moving to other platforms</li>
                            <li>Trust your instincts - if something feels wrong, it probably is</li>
                            <li>Report suspicious behavior immediately</li>
                        </ul>
                    </section>

                    <section>
                        <h3>3.2 Meeting in Person</h3>
                        <ul>
                            <li>Meet in public places for initial meetings</li>
                            <li>Tell a friend or family member about your plans</li>
                            <li>Drive yourself or arrange your own transportation</li>
                            <li>Never send money or provide financial information</li>
                            <li>Video chat before meeting to verify identity</li>
                        </ul>
                    </section>

                    <section>
                        <h3>3.3 Report Suspicious Activity</h3>
                        <ul>
                            <li>Report users who ask for money, gifts, or financial assistance</li>
                            <li>Report anyone who seems to be using fake photos or information</li>
                            <li>Report inappropriate behavior, harassment, or safety concerns</li>
                            <li>Help us keep the community safe by being vigilant</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="prohibited-content">
                    <h2>4. PROHIBITED CONTENT AND BEHAVIOR</h2>

                    <section>
                        <h3>4.1 Strictly Prohibited</h3>
                        <ul>
                            <li><strong>Nudity or sexually explicit content</strong> - No nude photos, sexual acts, or graphic sexual content</li>
                            <li><strong>Hate speech</strong> - No content targeting race, religion, gender, sexual orientation, nationality, or disability</li>
                            <li><strong>Violence and threats</strong> - No threats of violence, self-harm, or dangerous activities</li>
                            <li><strong>Illegal activities</strong> - No promotion of drugs, illegal services, or criminal behavior</li>
                            <li><strong>Spam and solicitation</strong> - No commercial advertising, promotional content, or pyramid schemes</li>
                            <li><strong>No minors or children</strong> - No photos of minors or children</li>
                            <li><strong>No AI generated photos</strong> - No AI generated photos</li>
                        </ul>
                    </section>

                    <section>
                        <h3>4.2 Inappropriate Photos</h3>
                        <ul>
                            <li>No photos showing underwear, swimwear in inappropriate contexts, or suggestive poses</li>
                            <li>No photos containing weapons, drugs, or illegal substances</li>
                            <li>No photos with inappropriate gestures or offensive symbols</li>
                            <li>No copyrighted images or photos you don't have rights to use</li>
                        </ul>
                    </section>

                    <section>
                        <h3>4.3 Scams and Financial Requests</h3>
                        <ul>
                            <li><strong>Never ask for money</strong> - No requests for financial assistance, loans, or gifts</li>
                            <li>No promoting investment opportunities, cryptocurrency, or financial schemes</li>
                            <li>No selling products or services through the platform</li>
                            <li>No asking for financial information or banking details</li>
                            <li>No advertising or promoting any products or services</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="account-guidelines">
                    <h2>5. ACCOUNT GUIDELINES</h2>

                    <section>
                        <h3>5.1 One Account Per Person</h3>
                        <ul>
                            <li>Each person may only have one active Diwa Date account</li>
                            <li>Do not create multiple accounts for any reason</li>
                            <li>If you need to start fresh, delete your existing account first</li>
                        </ul>
                    </section>

                    <section>
                        <h3>5.2 Age Requirements</h3>
                        <ul>
                            <li>You must be at least 18 years old to use Diwa Date</li>
                            <li>Do not create accounts for minors or allow minors to use your account</li>
                            <li>Age misrepresentation will result in immediate account termination</li>
                        </ul>
                    </section>

                    <section>
                        <h3>5.3 Active Participation</h3>
                        <ul>
                            <li>Keep your profile updated and active</li>
                            <li>Respond to messages in a reasonable timeframe when possible</li>
                            <li>If you're no longer interested in using the service, you can disable your account or delete your account</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="reporting">
                    <h2>6. REPORTING AND ENFORCEMENT</h2>

                    <section>
                        <h3>6.1 How to Report</h3>
                        <p>If you encounter behavior that violates these guidelines:</p>
                        <ul>
                            <li>Use the "Report" button on the user's profile or message</li>
                            <li>Provide specific details about the violation</li>
                            <li>Our team reviews all reports promptly</li>
                        </ul>
                    </section>

                    <section>
                        <h3>6.2 What We Review</h3>
                        <p>Our moderation team (both AI and human reviewers) monitors:</p>
                        <ul>
                            <li>Profile photos and information</li>
                            <li>Messages between users (when reported or flagged)</li>
                            <li>User reports and complaints</li>
                            <li>Suspicious account activity</li>
                        </ul>
                    </section>

                    <section>
                        <h3>6.3 Consequences for Violations</h3>
                        <p>Depending on the severity and nature of the violation:</p>
                        <ul>
                            <li><strong>Warning</strong> - First-time minor violations may receive a warning</li>
                            <li><strong>Content removal</strong> - Inappropriate content will be removed</li>
                            <li><strong>Temporary suspension</strong> - Account access may be temporarily restricted</li>
                            <li><strong>Permanent ban</strong> - Serious violations result in permanent account deletion</li>
                            <li><strong>Legal action</strong> - Illegal activities may be reported to authorities</li>
                        </ul>
                    </section>

                    <section>
                        <h3>6.4 Appeal Process</h3>
                        <p>If you believe your account was unfairly restricted or banned:</p>
                        <ul>
                            <li>Contact our support team with your appeal</li>
                            <li>Provide any relevant information or context</li>
                            <li>Appeals are reviewed within 5-7 business days</li>
                            <li>Our decisions are final after the appeal process</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="international">
                    <h2>7. INTERNATIONAL CONSIDERATIONS</h2>

                    <section>
                        <h3>7.1 Cultural Sensitivity</h3>
                        <ul>
                            <li>Respect different cultural backgrounds and practices</li>
                            <li>Be open-minded about different dating customs and expectations</li>
                            <li>Don't make assumptions based on someone's nationality or ethnicity</li>
                            <li>Learn about and respect local customs when traveling to meet someone</li>
                        </ul>
                    </section>

                    <section>
                        <h3>7.2 Legal Compliance</h3>
                        <ul>
                            <li>Follow all local laws in your jurisdiction</li>
                            <li>Understand that dating customs and legal requirements vary by country</li>
                            <li>Be aware of visa and travel requirements if planning international meetings</li>
                            <li>Report any illegal activity to local authorities</li>
                        </ul>
                    </section>

                    <section>
                        <h3>7.3 Language and Communication</h3>
                        <ul>
                            <li>Be patient with users who speak different languages</li>
                            <li>Use translation tools when helpful, but be aware of potential misunderstandings</li>
                            <li>Don't mock or criticize language skills or accents</li>
                            <li>Make an effort to communicate clearly and kindly</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="privacy">
                    <h2>8. PRIVACY AND DATA</h2>

                    <section>
                        <h3>8.1 Personal Information Protection</h3>
                        <ul>
                            <li>Don't share others' personal information without permission</li>
                            <li>Don't screenshot or share private conversations</li>
                            <li>Respect others' privacy settings and boundaries</li>
                            <li>Report anyone who shares your personal information without consent</li>
                        </ul>
                    </section>

                    <section>
                        <h3>8.2 Photo and Content Rights</h3>
                        <ul>
                            <li>Only upload photos you own or have permission to use</li>
                            <li>Don't use copyrighted images or photos of other people</li>
                            <li>Understand that uploaded content may be used by Diwa Date as outlined in our Terms of Service</li>
                            <li>Don't share intimate photos without explicit consent</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="healthy-relationships">
                    <h2>9. HEALTHY RELATIONSHIP PRACTICES</h2>

                    <section>
                        <h3>9.1 Communication Tips</h3>
                        <ul>
                            <li>Be honest about your expectations and intentions</li>
                            <li>Communicate openly about boundaries and comfort levels</li>
                            <li>Take time to get to know someone before making big decisions</li>
                            <li>Don't rush into sharing personal details or meeting in person</li>
                        </ul>
                    </section>

                    <section>
                        <h3>9.2 Red Flags to Watch For</h3>
                        <ul>
                            <li>Anyone who asks for money or financial assistance</li>
                            <li>Profiles with very few photos or photos that seem too professional</li>
                            <li>Users who immediately want to move off the platform</li>
                            <li>Anyone who pressures you for personal information or meetings</li>
                            <li>Inconsistent stories or information that doesn't add up</li>
                        </ul>
                    </section>

                    <section>
                        <h3>9.3 Building Trust</h3>
                        <ul>
                            <li>Take relationships at a comfortable pace</li>
                            <li>Verify identity through video calls before meeting</li>
                            <li>Meet in public places and tell others about your plans</li>
                            <li>Trust your instincts about people and situations</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="help">
                    <h2>10. GETTING HELP</h2>

                    <section>
                        <h3>10.1 Safety Resources</h3>
                        <p>If you're experiencing harassment, threats, or safety concerns:</p>
                        <ul>
                            <li>Report the user immediately through our platform</li>
                            <li>Contact local law enforcement if you feel threatened</li>
                            <li>Reach out to friends, family, or counselors for support</li>
                            <li>Use our blocking and reporting features liberally</li>
                        </ul>
                    </section>

                    <section>
                        <h3>10.2 Support and Assistance</h3>
                        <p>For questions about these guidelines or the platform:</p>
                        <ul>
                            <li>Visit our Help Center for frequently asked questions</li>
                            <li>Contact our support team through the app or website</li>
                            <li>Follow our social media accounts for updates and tips</li>
                            <li>Join our community forums for peer support and advice</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="conclusion">
                    <h2>Conclusion</h2>

                    <p>These Community Guidelines are designed to help create a positive, safe, and respectful environment for everyone on Diwa Date. We reserve the right to update these guidelines as needed to maintain community standards.</p>

                    <p>Remember: dating should be enjoyable, respectful, and safe. By following these guidelines, you're helping create a better experience for everyone in our community.</p>

                    <p className="community-thanks"><strong>Thank you for being part of the Diwa Date community!</strong></p>
                </section>

                <hr />

                <footer className="guidelines-footer">
                    <p><strong>For questions about these Community Guidelines, please contact our support team.</strong></p>
                    <p className="last-updated"><em>Last updated: September 15, 2025</em></p>
                </footer>
            </div>
        </SiteWrapper>
    );
}