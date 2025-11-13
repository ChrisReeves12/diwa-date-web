import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './terms-of-service.scss';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';

export const metadata = {
    title: `${process.env.APP_NAME} | Terms of Service`,
};

export default async function TermsOfServicePage() {
    const currentUser = await getCurrentUser(await cookies());

    return (
        <SiteWrapper currentUser={currentUser}>
            <div className="terms-of-service-container">
                <h1>Terms of Service Agreement</h1>

                <div className="tos-metadata">
                    <p>Effective Date: October 16, 2025</p>
                    <p>Last Updated: October 16, 2025</p>
                </div>

                <hr />

                <section id="definitions">
                    <h2>1. DEFINITIONS</h2>

                    <p>For the purposes of these Terms, the following definitions apply:</p>

                    <p><strong>"Claim"</strong> means any claim, demand, cause of action, debt, loss, cost, liability, damage, deficiency, fine, penalty, or expense (including without limitation, reasonable attorneys' fees and court costs) of any kind or nature.</p>

                    <p><strong>"Company"</strong> means Taktyx LLC, including its affiliates, subsidiaries, officers, directors, employees, agents, and representatives.</p>

                    <p><strong>"Personal Information"</strong> means any information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, to you as an individual. This includes but is not limited to your name, email address, billing address, photographs, profile information, location data, and any other information you provide through the Service.</p>

                    <p><strong>"Service"</strong> means the Diwa Date website located at https://diwadate.com and all related services, features, and functionality provided by the Company.</p>

                    <p><strong>"Terms"</strong> means these Terms of Service, as they may be amended from time to time.</p>
                </section>

                <section id="acceptance">
                    <h2>2. ACCEPTANCE OF TERMS</h2>

                    <p>Welcome to Diwa Date, operated by Taktyx LLC ("Company," "we," "us," or "our"). These Terms of Service ("Terms") govern your use of the Diwa Date website located at https://diwadate.com (the "Service") and constitute a legally binding agreement between you and Taktyx LLC.</p>

                    <p>By accessing, browsing, or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use our Service.</p>
                </section>

                <section id="eligibility">
                    <h2>3. ELIGIBILITY AND ACCOUNT REGISTRATION</h2>

                    <section>
                        <h3>3.1 Age Requirement</h3>
                        <p>You must be at least 18 years of age to use our Service. By using our Service, you represent and warrant that you are at least 18 years old.</p>
                    </section>

                    <section>
                        <h3>3.2 Account Registration</h3>
                        <p>To access certain features of our Service, you must create an account by providing accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                    </section>

                    <section>
                        <h3>3.3 Single Account Policy</h3>
                        <p>You may only maintain one active account on our Service. Creating multiple accounts may result in immediate suspension or termination of all accounts.</p>
                    </section>
                </section>

                <section id="service-description">
                    <h2>4. DESCRIPTION OF SERVICE</h2>

                    <p>Diwa Date is an international online dating platform that connects users for the purpose of meeting, dating, and forming relationships. Our Service includes both free and premium features designed to help users connect with potential matches.</p>

                    <section>
                        <h3>4.1 Free Features</h3>
                        <p>Free users may create profiles, browse other user profiles, and access basic search functionality.</p>
                    </section>

                    <section>
                        <h3>4.2 Premium Features</h3>
                        <p>Premium members have access to:</p>
                        <ul>
                            <li>Unlimited messaging and chat with all members</li>
                            <li>Advanced search filters and matching tools</li>
                            <li>Additional premium features as we develop them</li>
                        </ul>
                    </section>
                </section>

                <section id="subscription">
                    <h2>5. SUBSCRIPTION AND BILLING</h2>

                    <section>
                        <h3>5.1 Premium Membership</h3>
                        <p>Premium membership is available for a monthly subscription fee. The current pricing will be clearly displayed during the subscription process.</p>
                    </section>

                    <section>
                        <h3>5.2 Billing and Auto-Renewal</h3>
                        <ul>
                            <li>Premium subscriptions automatically renew monthly on the same calendar day you initially subscribed</li>
                            <li>If the renewal date falls on a day that doesn't exist in the following month, billing will occur on the last day of that month</li>
                            <li>You will be charged through our payment processor, PayPal</li>
                            <li>Payments are processed to "Taktyx" (Diwa Date is a brand operated by Taktyx LLC). Your receipts and payment confirmations from PayPal will reflect payment to Taktyx</li>
                            <li>All prices displayed include applicable taxes and fees unless otherwise stated</li>
                        </ul>
                    </section>

                    <section>
                        <h3>5.3 Price Protection</h3>
                        <p>Your subscription rate is locked in at the time of purchase. If we increase our subscription prices in the future, existing subscribers will continue to pay their original rate as long as their subscription remains active.</p>
                    </section>

                    <section>
                        <h3>5.4 Promotional Pricing</h3>
                        <p>We may offer promotional pricing, including free lifetime premium memberships for a limited time during launch periods. These promotional terms will be clearly disclosed at the time of signup.</p>
                    </section>

                    <section>
                        <h3>5.5 Cancellation</h3>
                        <p>You may cancel your premium subscription at any time by:</p>
                        <ol>
                            <li>Logging into your account</li>
                            <li>Visiting <a href="https://diwadate.com/account/billing">https://diwadate.com/account/billing</a></li>
                            <li>Following the cancellation instructions</li>
                            <li>If you subscribed to Premium Membership using your PayPal account, you can suspend or cancel your subscription in the PayPal dashboard as well</li>
                        </ol>
                        <p>Upon cancellation, you will retain premium access until the end of your current billing period, after which your account will revert to free membership status.</p>
                    </section>

                    <section>
                        <h3>5.6 Refund Policy</h3>
                        <p>Refunds are only provided in the following circumstances:</p>
                        <ul>
                            <li>Technical issues resulting in double billing</li>
                            <li>Payment processing errors</li>
                            <li>Significant site outages or service interruptions that prevent use of the Service</li>
                        </ul>
                        <p>All refund requests must be submitted within 30 days of the billing issue. Refunds are not provided for change of mind, unsuccessful matches, or general dissatisfaction with the Service.</p>
                    </section>

                    <section>
                        <h3>5.7 Profile Visibility and Billing</h3>
                        <p>You have the option to turn off your profile at any time, which will hide your profile from other users. However, turning off your profile does not suspend or cancel your premium membership. Premium members will continue to be charged at the normal rate of their premium membership unless they explicitly cancel or suspend their membership as described in Section 5.5.</p>
                    </section>
                </section>

                <section id="user-conduct">
                    <h2>6. USER CONDUCT AND COMMUNITY GUIDELINES</h2>

                    <section>
                        <h3>6.1 Acceptable Use</h3>
                        <p>You agree to use our Service in accordance with all applicable laws and regulations and in a manner that does not:</p>
                        <ul>
                            <li>Violate the rights of other users</li>
                            <li>Harass, abuse, or harm other users</li>
                            <li>Create fake profiles or misrepresent your identity</li>
                            <li>Engage in commercial solicitation or spam</li>
                            <li>Upload inappropriate, offensive, or illegal content</li>
                        </ul>
                    </section>

                    <section>
                        <h3>6.2 Content Moderation</h3>
                        <p>We employ both AI-driven and human content moderation to review photos, profiles, and may review messages between users to ensure compliance with our <a href="/community-guidelines">Community Guidelines</a>.</p>
                    </section>

                    <section>
                        <h3>6.3 Consequences of Violations</h3>
                        <p>Users who violate our Terms or <a href="/community-guidelines">Community Guidelines</a> may face immediate suspension or account deletion without warning, consent, or explanation. We reserve the right to determine violations at our sole discretion.</p>
                    </section>

                    <section>
                        <h3>6.4 Mail Order Bride Marriages</h3>
                        <p>Our Service does not, and must not be taken to, in any way, aid, procure, promote or provide "mail order bride" marriage-matching services to its users. You acknowledge that the jurisdiction in which you reside may prohibit the advertisement of marriage-matching services or the solicitation of persons to partake in marriages.</p>

                        <p>If you reside in the Philippines, Belarus or any such jurisdiction that prohibits marriage-matching services to its residents, you hereby warrant, represent and covenant that you will not use the Service for any purpose in breach of any legislation prohibiting marriage-matching. You hereby acknowledge and agree that it is your sole responsibility to ensure that you do not breach any prohibition on marriage-matching, and further hereby acknowledge and agree that the indemnity contained in clause 14 will apply to your breach of any legislation prohibiting marriage-matching.</p>
                    </section>
                </section>

                <section id="user-content">
                    <h2>7. USER CONTENT AND DATA</h2>

                    <section>
                        <h3>7.1 Content You Provide</h3>
                        <p>You are solely responsible for all content you upload, post, or transmit through our Service, including photos, profile information, and messages.</p>
                    </section>

                    <section>
                        <h3>7.2 Data Collection and Storage</h3>
                        <p>We collect and store:</p>
                        <ul>
                            <li>Your name and email address</li>
                            <li>Billing address for premium members</li>
                            <li>Photos you upload to your profile</li>
                            <li>Messages and interactions within our platform</li>
                        </ul>
                    </section>

                    <section>
                        <h3>7.3 Data Deletion</h3>
                        <p>When you delete photos from your profile, they are permanently removed from our systems. When your account is suspended or deleted, we delete all your photos and associated data from our system.</p>
                    </section>

                    <section>
                        <h3>7.4 Content License</h3>
                        <p>By uploading content to our Service, you grant us a non-exclusive, royalty-free license to use, display, and distribute such content solely for the purpose of operating and improving our Service.</p>
                    </section>
                </section>

                <section id="privacy">
                    <h2>8. PRIVACY AND DATA PROTECTION</h2>

                    <p>Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. For users in the European Union, we comply with applicable GDPR requirements.</p>
                </section>

                <section id="disclaimers">
                    <h2>9. DISCLAIMERS AND LIMITATIONS OF LIABILITY</h2>

                    <section>
                        <h3>9.1 Service Disclaimer</h3>
                        <p>Our Service is provided "as is" and "as available." We do our best to provide a platform for people to meet and connect, but we make no guarantees about:</p>
                        <ul>
                            <li>The sincerity or accuracy of user profiles</li>
                            <li>The success of any relationships formed through our Service</li>
                            <li>The safety of interactions between users</li>
                        </ul>
                    </section>

                    <section>
                        <h3>9.2 User Safety and Verification</h3>
                        <p>We do not conduct identity verification processes. Users are responsible for their own safety and should exercise caution when meeting people online or in person.</p>
                    </section>

                    <section>
                        <h3>9.3 Scam Prevention</h3>
                        <p>While we implement measures to make our platform as safe and scam-free as possible, we cannot guarantee that all users are sincere or have genuine intentions.</p>
                    </section>

                    <section>
                        <h3>9.4 Limitation of Liability</h3>
                        <p>To the fullest extent permitted by law, Taktyx LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses resulting from your use of our Service.</p>
                    </section>
                </section>

                <section id="intellectual-property">
                    <h2>10. INTELLECTUAL PROPERTY</h2>

                    <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Taktyx LLC and its licensors. The Service is protected by copyright, trademark, and other laws.</p>
                </section>

                <section id="dispute-resolution">
                    <h2>11. DISPUTE RESOLUTION</h2>

                    <section>
                        <h3>11.1 Governing Law</h3>
                        <p>These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, United States, without regard to its conflict of law provisions.</p>
                    </section>

                    <section>
                        <h3>11.2 Mandatory Arbitration</h3>
                        <p>Any dispute, claim, or controversy arising out of or relating to these Terms or your use of our Service shall be settled by binding arbitration in Atlanta, Georgia. You waive your right to participate in class action lawsuits or class-wide arbitration.</p>
                    </section>

                    <section>
                        <h3>11.3 Exceptions to Arbitration</h3>
                        <p>The arbitration requirement does not apply to:</p>
                        <ul>
                            <li>Claims for injunctive relief</li>
                            <li>Individual claims in small claims court</li>
                            <li>Intellectual property disputes</li>
                        </ul>
                    </section>
                </section>

                <section id="termination">
                    <h2>12. TERMINATION</h2>

                    <section>
                        <h3>12.1 Termination by You</h3>
                        <p>You may terminate your account at any time by contacting us or using the account deletion features in your account settings.</p>
                    </section>

                    <section>
                        <h3>12.2 Termination by Us</h3>
                        <p>We may suspend or terminate your account immediately, without prior notice or liability, for any reason, including but not limited to breach of these Terms.</p>
                    </section>

                    <section>
                        <h3>12.3 Effect of Termination</h3>
                        <p>Upon termination, your right to use the Service will cease immediately, and we will delete your data as described in Section 7.3.</p>
                    </section>
                </section>

                <section id="changes">
                    <h2>13. CHANGES TO TERMS</h2>

                    <p>We reserve the right to modify these Terms at any time. We will notify users of material changes by posting a notice on our website or sending an email to registered users. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.</p>
                </section>

                <section id="indemnification">
                    <h2>14. INDEMNIFICATION</h2>

                    <p>To the extent permitted by law, you agree to indemnify, defend and hold the Company, its affiliates, related bodies corporate, shareholders, officers, employees, agents and representatives harmless from and against any and all claims, loss, damage, tax (including GST), liability and/or expense (including legal costs on a full indemnity basis) that may be incurred by the Company, its affiliates, related bodies corporate, shareholders, officers, employees, agents and representatives arising out of or in connection with:</p>

                    <p><strong>(a)</strong> any breach by you of these terms;</p>
                    <p><strong>(b)</strong> any unauthorized use of the site that can be connected or associated to you;</p>
                    <p><strong>(c)</strong> any breach by you of any law; and</p>
                    <p><strong>(d)</strong> any act or omission that you may do in connection with the site;</p>
                    <p><strong>(e)</strong> any claim that any content submitted or transmitted by you violates the copyright, trademark, trade secret, intellectual property, privacy, or other proprietary rights of any third party.</p>

                    <p>You agree to cooperate fully in the defense of any Claim. We reserve the right (but are under no obligation) to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, provided that you shall remain liable for any such Claim.</p>
                </section>

                <section id="contact">
                    <h2>15. CONTACT INFORMATION</h2>

                    <p>If you have any questions about these Terms, please contact us at:</p>

                    <address>
                        <strong>Taktyx LLC</strong><br />
                        3133 Maple Drive NE<br />
                        STE 240 #1283<br />
                        Atlanta, GA 30305<br />
                        United States of America
                    </address>

                    <p>Email: support@diwadate.com</p>
                </section>

                <section id="severability">
                    <h2>16. SEVERABILITY</h2>

                    <p>If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.</p>
                </section>

                <section id="entire-agreement">
                    <h2>17. ENTIRE AGREEMENT</h2>

                    <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and Taktyx LLC regarding the use of our Service.</p>
                </section>

                <hr />

                <p className="agreement-notice"><strong>By using Diwa Date, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong></p>
            </div>
        </SiteWrapper>
    );
}