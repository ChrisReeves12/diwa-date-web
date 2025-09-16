import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './privacy-policy.scss';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';

export const metadata = {
    title: `${process.env.APP_NAME} | Privacy Policy`,
};

export default async function PrivacyPolicyPage() {
    const currentUser = await getCurrentUser(await cookies());

    return (
        <SiteWrapper currentUser={currentUser}>
            <div className="privacy-policy-container">
                <h1>Privacy Policy</h1>

                <div className="policy-metadata">
                    <p>Effective Date: September 15, 2025</p>
                    <p>Last Updated: September 15, 2025</p>
                </div>

                <hr />

                <section id="introduction">
                    <h2>1. INTRODUCTION</h2>

                    <p>Welcome to Diwa Date, operated by Taktyx LLC ("Company," "we," "us," or "our"). This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our dating website located at https://diwadate.com (the "Service").</p>

                    <p>We are committed to protecting your privacy and ensuring transparency about our data practices. This Privacy Policy applies to all users of our Service, including those in the European Union, and complies with applicable data protection laws including the General Data Protection Regulation (GDPR).</p>

                    <p>By using our Service, you consent to the data practices described in this Privacy Policy. If you do not agree with this Privacy Policy, please do not use our Service.</p>
                </section>

                <hr />

                <section id="information-collection">
                    <h2>2. INFORMATION WE COLLECT</h2>

                    <section>
                        <h3>2.1 Information You Provide Directly</h3>

                        <div className="info-group">
                            <h4><strong>Account Registration Information:</strong></h4>
                            <ul>
                                <li>Full name</li>
                                <li>Email address</li>
                                <li>Date of birth (to verify age requirement)</li>
                                <li>Password (encrypted and stored securely)</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Profile Information:</strong></h4>
                            <ul>
                                <li>Profile photos you upload</li>
                                <li>Profile description and personal details</li>
                                <li>Relationship preferences and interests</li>
                                <li>Location information</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Premium Subscription Information:</strong></h4>
                            <ul>
                                <li>Billing name and address</li>
                                <li>Payment method information (processed securely through Authorize.net)</li>
                                <li>Subscription preferences and history</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Communications:</strong></h4>
                            <ul>
                                <li>Messages you send and receive through our platform</li>
                                <li>Customer support communications</li>
                                <li>Feedback and survey responses</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>2.2 Information We Collect Automatically</h3>

                        <div className="info-group">
                            <h4><strong>Usage Information:</strong></h4>
                            <ul>
                                <li>Pages viewed and features used</li>
                                <li>Time spent on the Service</li>
                                <li>Click patterns and navigation paths</li>
                                <li>Device information (browser type, operating system)</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Technical Information:</strong></h4>
                            <ul>
                                <li>IP address and general location data</li>
                                <li>Device identifiers</li>
                                <li>Browser settings and preferences</li>
                                <li>Cookies and similar tracking technologies</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Log Information:</strong></h4>
                            <ul>
                                <li>Access times and dates</li>
                                <li>Error logs and technical diagnostics</li>
                                <li>Security-related events</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>2.3 Information from Third Parties</h3>

                        <p>We do not currently collect information from third-party sources, but we may do so in the future with your consent and will update this Privacy Policy accordingly.</p>
                    </section>
                </section>

                <hr />

                <section id="information-usage">
                    <h2>3. HOW WE USE YOUR INFORMATION</h2>

                    <section>
                        <h3>3.1 Primary Purposes</h3>

                        <div className="info-group">
                            <h4><strong>To Provide Our Service:</strong></h4>
                            <ul>
                                <li>Create and maintain your account</li>
                                <li>Display your profile to other users</li>
                                <li>Enable messaging and communication features</li>
                                <li>Process premium subscriptions and payments</li>
                                <li>Provide customer support</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>To Improve User Experience:</strong></h4>
                            <ul>
                                <li>Personalize your experience on the platform</li>
                                <li>Suggest potential matches based on preferences</li>
                                <li>Develop and enhance platform features</li>
                                <li>Conduct research and analytics</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>3.2 Safety and Security</h3>

                        <div className="info-group">
                            <h4><strong>Platform Safety:</strong></h4>
                            <ul>
                                <li>Monitor for fake profiles and fraudulent activity</li>
                                <li>Detect and prevent harassment or inappropriate behavior</li>
                                <li>Enforce our <a href="/terms-of-service">Terms of Service</a> and <a href="/community-guidelines">Community Guidelines</a></li>
                                <li>Protect against spam, scams, and security threats</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Content Moderation:</strong></h4>
                            <ul>
                                <li>Review profile photos using AI and human moderation</li>
                                <li>Monitor messages when reported for policy violations</li>
                                <li>Ensure compliance with our content standards</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>3.3 Legal and Business Purposes</h3>

                        <div className="info-group">
                            <h4><strong>Legal Compliance:</strong></h4>
                            <ul>
                                <li>Comply with applicable laws and regulations</li>
                                <li>Respond to legal requests and court orders</li>
                                <li>Protect our rights and the rights of our users</li>
                                <li>Prevent illegal activities</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Business Operations:</strong></h4>
                            <ul>
                                <li>Process payments and manage subscriptions</li>
                                <li>Send important service announcements</li>
                                <li>Conduct business analysis and planning</li>
                            </ul>
                        </div>
                    </section>
                </section>

                <hr />

                <section id="information-sharing">
                    <h2>4. INFORMATION SHARING AND DISCLOSURE</h2>

                    <section>
                        <h3>4.1 With Other Users</h3>

                        <div className="info-group">
                            <h4><strong>Public Profile Information:</strong></h4>
                            <ul>
                                <li>Your profile photos and description are visible to other users</li>
                                <li>Your general location (if provided) may be shown to potential matches</li>
                                <li>Your activity status and last seen information may be displayed</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Private Communications:</strong></h4>
                            <ul>
                                <li>Messages are only visible to you and the recipient</li>
                                <li>We do not share your private conversations with other users</li>
                                <li>Messages may be reviewed only when reported for policy violations</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>4.2 With Service Providers</h3>

                        <p>We share information with trusted third-party service providers who help us operate our Service:</p>

                        <div className="info-group">
                            <h4><strong>Payment Processing:</strong></h4>
                            <ul>
                                <li>Authorize.net processes payment information securely</li>
                                <li>We do not store complete payment card details</li>
                                <li>Billing information is shared only as necessary for payment processing</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Technical Services:</strong></h4>
                            <ul>
                                <li>Cloud hosting providers for data storage and platform operation</li>
                                <li>Analytics services to understand usage patterns</li>
                                <li>Customer support tools and communication platforms</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Content Moderation:</strong></h4>
                            <ul>
                                <li>AI moderation services for photo and content review</li>
                                <li>Human moderators (our employees or contractors) for content review</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>4.3 Legal Disclosures</h3>

                        <p>We may disclose your information when required by law or to protect our rights:</p>
                        <ul>
                            <li>In response to legal process (subpoenas, court orders)</li>
                            <li>To prevent fraud, illegal activities, or security threats</li>
                            <li>To protect the safety of our users or the public</li>
                            <li>In connection with business transfers or acquisitions</li>
                        </ul>
                    </section>

                    <section>
                        <h3>4.4 With Your Consent</h3>

                        <p>We may share your information for other purposes with your explicit consent, such as:</p>
                        <ul>
                            <li>Promotional partnerships (only with your opt-in consent)</li>
                            <li>Research studies (only with your voluntary participation)</li>
                            <li>Social media integration (only if you choose to connect accounts)</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="data-retention">
                    <h2>5. DATA RETENTION AND DELETION</h2>

                    <section>
                        <h3>5.1 How Long We Keep Your Data</h3>

                        <div className="info-group">
                            <h4><strong>Active Accounts:</strong></h4>
                            <ul>
                                <li>We retain your account information as long as your account is active</li>
                                <li>Profile photos and information remain until you delete them or close your account</li>
                                <li>Messages are retained to maintain conversation history</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Closed Accounts:</strong></h4>
                            <ul>
                                <li>When you delete your account, we immediately begin the data deletion process</li>
                                <li>Most personal information is deleted within 30 days</li>
                                <li>Some information may be retained longer for legal or safety reasons</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Payment Information:</strong></h4>
                            <ul>
                                <li>Billing information is retained for tax and accounting purposes</li>
                                <li>Payment history may be kept for up to 7 years as required by law</li>
                                <li>Payment card information is handled by Authorize.net and not stored by us</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>5.2 Data Deletion Process</h3>

                        <div className="info-group">
                            <h4><strong>User-Initiated Deletion:</strong></h4>
                            <ul>
                                <li>You can delete individual photos, which are immediately removed from our systems</li>
                                <li>You can delete your entire account through your account settings</li>
                                <li>Upon account deletion, we remove all your photos and personal data</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Automatic Deletion:</strong></h4>
                            <ul>
                                <li>Inactive accounts may be deleted after extended periods of inactivity</li>
                                <li>Temporary data (logs, analytics) is automatically purged on regular schedules</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>5.3 Data We May Retain</h3>

                        <p>Even after account deletion, we may retain limited information for:</p>
                        <ul>
                            <li>Legal compliance and regulatory requirements</li>
                            <li>Fraud prevention and security purposes</li>
                            <li>Resolving disputes or enforcing our agreements</li>
                            <li>Aggregated, anonymized data for research and analytics</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="privacy-rights">
                    <h2>6. YOUR PRIVACY RIGHTS</h2>

                    <section>
                        <h3>6.1 General Rights (All Users)</h3>

                        <div className="info-group">
                            <h4><strong>Access and Control:</strong></h4>
                            <ul>
                                <li>View and update your profile information at any time</li>
                                <li>Download your data through your account settings</li>
                                <li>Delete your photos and account when desired</li>
                                <li>Control who can contact you and view your profile</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Communication Preferences:</strong></h4>
                            <ul>
                                <li>Opt out of promotional emails</li>
                                <li>Choose notification settings</li>
                                <li>Control marketing communications</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>6.2 Additional Rights for EU Users (GDPR)</h3>

                        <p>If you are located in the European Union, you have additional rights under GDPR:</p>

                        <div className="info-group">
                            <h4><strong>Right of Access:</strong></h4>
                            <ul>
                                <li>Request a copy of all personal data we hold about you</li>
                                <li>Receive information about how your data is processed</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Right to Rectification:</strong></h4>
                            <ul>
                                <li>Correct inaccurate or incomplete personal data</li>
                                <li>Update your information through your account settings</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Right to Erasure ("Right to be Forgotten"):</strong></h4>
                            <ul>
                                <li>Request deletion of your personal data in certain circumstances</li>
                                <li>We will comply unless we have legitimate grounds to retain the information</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Right to Data Portability:</strong></h4>
                            <ul>
                                <li>Receive your personal data in a structured, machine-readable format</li>
                                <li>Transfer your data to another service provider</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Right to Object:</strong></h4>
                            <ul>
                                <li>Object to processing of your personal data for direct marketing</li>
                                <li>Object to processing based on legitimate interests</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Right to Restrict Processing:</strong></h4>
                            <ul>
                                <li>Request limitation of processing in certain circumstances</li>
                                <li>We will only store your data and not process it further</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Right to Withdraw Consent:</strong></h4>
                            <ul>
                                <li>Withdraw consent for any processing based on consent</li>
                                <li>Withdrawal does not affect the lawfulness of previous processing</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>6.3 How to Exercise Your Rights</h3>

                        <p>To exercise any of these rights:</p>
                        <ul>
                            <li>Log into your account and use the available settings</li>
                            <li>Contact our support team with your request</li>
                            <li>Send an email to our Data Protection Officer (contact details below)</li>
                            <li>We will respond to requests within 30 days (or as required by applicable law)</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="cookies">
                    <h2>7. COOKIES AND TRACKING TECHNOLOGIES</h2>

                    <section>
                        <h3>7.1 What Are Cookies</h3>

                        <p>Cookies are small text files stored on your device that help us provide and improve our Service. We use both session cookies (deleted when you close your browser) and persistent cookies (remain until deleted or expired).</p>
                    </section>

                    <section>
                        <h3>7.2 How We Use Cookies</h3>

                        <div className="info-group">
                            <h4><strong>Essential Cookies:</strong></h4>
                            <ul>
                                <li>Keep you logged in to your account</li>
                                <li>Remember your preferences and settings</li>
                                <li>Ensure proper functioning of the Service</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Analytics Cookies:</strong></h4>
                            <ul>
                                <li>Understand how users interact with our Service</li>
                                <li>Identify popular features and content</li>
                                <li>Improve user experience and platform performance</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Security Cookies:</strong></h4>
                            <ul>
                                <li>Detect suspicious activity and potential security threats</li>
                                <li>Prevent fraud and protect user accounts</li>
                                <li>Ensure secure transmission of data</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>7.3 Managing Cookies</h3>

                        <div className="info-group">
                            <h4><strong>Browser Settings:</strong></h4>
                            <ul>
                                <li>Most browsers allow you to control cookies through settings</li>
                                <li>You can delete existing cookies and prevent future cookies</li>
                                <li>Disabling cookies may affect Service functionality</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Opt-Out Options:</strong></h4>
                            <ul>
                                <li>You can opt out of analytics cookies through your account settings</li>
                                <li>Third-party analytics tools may have their own opt-out mechanisms</li>
                            </ul>
                        </div>
                    </section>
                </section>

                <hr />

                <section id="security">
                    <h2>8. DATA SECURITY</h2>

                    <section>
                        <h3>8.1 Security Measures</h3>

                        <p>We implement comprehensive security measures to protect your personal information:</p>

                        <div className="info-group">
                            <h4><strong>Technical Safeguards:</strong></h4>
                            <ul>
                                <li>Encryption of data in transit and at rest</li>
                                <li>Secure protocols for data transmission (HTTPS/SSL)</li>
                                <li>Regular security assessments and updates</li>
                                <li>Access controls and authentication systems</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Administrative Safeguards:</strong></h4>
                            <ul>
                                <li>Limited access to personal data on a need-to-know basis</li>
                                <li>Regular security training for employees and contractors</li>
                                <li>Incident response procedures for security breaches</li>
                                <li>Regular security policy reviews and updates</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Physical Safeguards:</strong></h4>
                            <ul>
                                <li>Secure data centers with restricted access</li>
                                <li>Environmental controls and monitoring</li>
                                <li>Backup systems and disaster recovery procedures</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>8.2 Payment Security</h3>

                        <div className="info-group">
                            <h4><strong>Secure Payment Processing:</strong></h4>
                            <ul>
                                <li>All payment processing is handled by Authorize.net, a PCI DSS compliant payment processor</li>
                                <li>We do not store complete credit card numbers or sensitive payment information</li>
                                <li>Payment data is encrypted and transmitted securely</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>8.3 Data Breach Response</h3>

                        <p>In the event of a data breach affecting personal information:</p>
                        <ul>
                            <li>We will assess the breach and take immediate containment measures</li>
                            <li>Affected users will be notified as required by applicable law</li>
                            <li>Relevant authorities will be notified within required timeframes</li>
                            <li>We will provide regular updates on our response efforts</li>
                        </ul>
                    </section>
                </section>

                <hr />

                <section id="international-transfers">
                    <h2>9. INTERNATIONAL DATA TRANSFERS</h2>

                    <section>
                        <h3>9.1 Data Location</h3>

                        <p>Your personal information may be stored and processed in:</p>
                        <ul>
                            <li>United States (where our primary servers are located)</li>
                            <li>Other countries where our service providers operate</li>
                            <li>We ensure appropriate safeguards are in place for international transfers</li>
                        </ul>
                    </section>

                    <section>
                        <h3>9.2 EU Data Transfers</h3>

                        <p>For users in the European Union:</p>
                        <ul>
                            <li>We ensure adequate protection for data transferred outside the EU</li>
                            <li>We rely on approved transfer mechanisms such as Standard Contractual Clauses</li>
                            <li>We conduct assessments to ensure ongoing protection of transferred data</li>
                        </ul>
                    </section>

                    <section>
                        <h3>9.3 Safeguards for International Transfers</h3>

                        <div className="info-group">
                            <h4><strong>Contractual Protections:</strong></h4>
                            <ul>
                                <li>Standard Contractual Clauses with service providers</li>
                                <li>Data processing agreements with appropriate security requirements</li>
                                <li>Regular audits and assessments of data protection practices</li>
                            </ul>
                        </div>
                    </section>
                </section>

                <hr />

                <section id="childrens-privacy">
                    <h2>10. CHILDREN'S PRIVACY</h2>

                    <section>
                        <h3>10.1 Age Requirements</h3>

                        <div className="info-group">
                            <h4><strong>Minimum Age:</strong></h4>
                            <ul>
                                <li>Our Service is only available to users 18 years of age and older</li>
                                <li>We do not knowingly collect personal information from anyone under 18</li>
                                <li>Users must verify they meet the age requirement during registration</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>10.2 If We Learn of Underage Users</h3>

                        <div className="info-group">
                            <h4><strong>Immediate Action:</strong></h4>
                            <ul>
                                <li>If we discover a user is under 18, we will immediately delete their account</li>
                                <li>We will remove all personal information associated with the underage account</li>
                                <li>We will take steps to prevent future underage registrations</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Parental Notification:</strong></h4>
                            <ul>
                                <li>Parents who believe their child has created an account should contact us immediately</li>
                                <li>We will work with parents to ensure complete removal of any information</li>
                            </ul>
                        </div>
                    </section>
                </section>

                <hr />

                <section id="policy-changes">
                    <h2>11. CHANGES TO THIS PRIVACY POLICY</h2>

                    <section>
                        <h3>11.1 Policy Updates</h3>

                        <div className="info-group">
                            <h4><strong>How We Update:</strong></h4>
                            <ul>
                                <li>We may update this Privacy Policy to reflect changes in our practices or applicable law</li>
                                <li>Material changes will be posted prominently on our website</li>
                                <li>We will notify users of significant changes via email or in-app notification</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Effective Date:</strong></h4>
                            <ul>
                                <li>Changes become effective on the date posted unless otherwise specified</li>
                                <li>Your continued use of the Service after changes constitutes acceptance</li>
                                <li>If you disagree with changes, you may delete your account</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3>11.2 Review and Compliance</h3>

                        <div className="info-group">
                            <h4><strong>Regular Reviews:</strong></h4>
                            <ul>
                                <li>We regularly review this Privacy Policy to ensure accuracy and compliance</li>
                                <li>We assess our data practices against current legal requirements</li>
                                <li>We update our procedures based on privacy best practices and user feedback</li>
                            </ul>
                        </div>
                    </section>
                </section>

                <hr />

                <section id="contact">
                    <h2>12. CONTACT INFORMATION</h2>

                    <section>
                        <h3>12.1 General Privacy Questions</h3>

                        <p>For questions about this Privacy Policy or our privacy practices:</p>

                        <address className="contact-info">
                            <strong>Taktyx LLC</strong><br />
                            3133 Maple Drive NE<br />
                            STE 240 #1283<br />
                            Atlanta, GA 30305<br />
                            United States of America
                        </address>

                        <p>Email: support@diwadate.com</p>
                        <p>Website: <a href="https://diwadate.com">https://diwadate.com</a></p>
                    </section>

                    <section>
                        <h3>12.2 Data Protection Officer</h3>

                        <p>For GDPR-related requests or EU privacy matters:</p>

                        <div className="contact-info">
                            <strong>Data Protection Officer</strong><br />
                            Email: technology@taktyx.com
                        </div>
                    </section>

                    <section>
                        <h3>12.3 Supervisory Authority</h3>

                        <p>EU users have the right to lodge a complaint with their local supervisory authority if they believe their privacy rights have been violated.</p>
                    </section>
                </section>

                <hr />

                <section id="legal-basis">
                    <h2>13. LEGAL BASIS FOR PROCESSING (GDPR)</h2>

                    <section>
                        <h3>13.1 Lawful Basis for Processing</h3>

                        <p>We process personal data based on the following legal grounds:</p>

                        <div className="info-group">
                            <h4><strong>Consent:</strong></h4>
                            <ul>
                                <li>Processing profile information for matching purposes</li>
                                <li>Sending promotional communications (with opt-in consent)</li>
                                <li>Using cookies for analytics and marketing</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Contract Performance:</strong></h4>
                            <ul>
                                <li>Processing necessary to provide our dating Service</li>
                                <li>Managing your account and subscription</li>
                                <li>Facilitating communication between users</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Legitimate Interests:</strong></h4>
                            <ul>
                                <li>Ensuring platform safety and security</li>
                                <li>Preventing fraud and abuse</li>
                                <li>Improving our Service through analytics</li>
                                <li>Direct marketing (with opt-out option)</li>
                            </ul>
                        </div>

                        <div className="info-group">
                            <h4><strong>Legal Obligation:</strong></h4>
                            <ul>
                                <li>Complying with applicable laws and regulations</li>
                                <li>Responding to legal requests</li>
                                <li>Tax and accounting requirements</li>
                            </ul>
                        </div>
                    </section>
                </section>

                <hr />

                <section id="conclusion">
                    <h2>CONCLUSION</h2>

                    <p>This Privacy Policy represents our commitment to protecting your personal information and being transparent about our data practices. We encourage you to read this Policy carefully and contact us with any questions or concerns.</p>

                    <p>Your privacy matters to us, and we will continue to evolve our practices to maintain your trust while providing an excellent dating experience.</p>
                </section>

                <hr />

                <footer className="policy-footer">
                    <p className="thank-you"><strong>Thank you for choosing Diwa Date!</strong></p>
                    <p className="last-updated"><em>This Privacy Policy was last updated on September 15, 2025</em></p>
                </footer>
            </div>
        </SiteWrapper>
    );
}