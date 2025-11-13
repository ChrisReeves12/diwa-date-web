import { redirect } from "next/navigation";
import { getCurrentUser, isUserPremium } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { Metadata } from "next";
import "./upgrade.scss";
import { CheckCircleIcon, CheckIcon, TimesIcon } from "react-line-awesome";
import { prismaRead } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Upgrade to Premium`
    };
}

export default async function UpgradePage({ searchParams }: { searchParams: any }) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/upgrade');
    }

    // Check if user is already premium - redirect to billing if so
    const isPremium = await isUserPremium(Number(currentUser.id));
    if (isPremium) {
        redirect('/account/billing');
    }

    const lSearchParams = await searchParams;
    const feature = lSearchParams.feature; // e.g., 'likes'

    // Fetch the first subscription plan from the database
    const subscriptionPlan = await prismaRead.subscriptionPlans.findFirst({
        orderBy: { id: 'asc' }
    });

    const price = subscriptionPlan?.listPrice || 19.99;
    const priceUnit = subscriptionPlan?.listPriceUnit || 'USD';

    return (
        <div className="upgrade-page">
            <div className="upgrade-container">
                <div className="upgrade-header">
                    <h1>Unlock Premium Features</h1>
                    <p className="upgrade-subtitle">
                        Take your dating experience to the next level
                    </p>
                </div>

                <div className="premium-features">
                    <div className="feature-grid">

                        <div className="feature-card">
                            <div className="feature-icon">
                                <img alt="Messages" title="Messages" src="/images/upgrade-message-blue.svg" />
                            </div>
                            <h3>Unlimited Messages</h3>
                            <p>Send as many messages as you want to your matches without any limits or restrictions.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <img alt="Search" title="Search" src="/images/upgrade-search-blue.svg" />
                            </div>
                            <h3>Advanced Search Filters</h3>
                            <p>Find your perfect match with detailed filters for education, interests, lifestyle preferences, and more.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <img alt="Support" title="Support" src="/images/upgrade-support-blue.svg" />
                            </div>
                            <h3>Priority Support</h3>
                            <p>Get faster response times and priority assistance from our dedicated support team.</p>
                        </div>
                    </div>
                </div>

                <div className="pricing-section">
                    <div className="pricing-card">
                        <div className="pricing-header">
                            <h2>Premium Membership</h2>
                            <div className="price">
                                <span className="currency">{priceUnit === 'USD' ? '$' : priceUnit}</span>
                                <span className="amount">{price.toFixed(2)}</span>
                                <span className="period">/month</span>
                            </div>
                        </div>
                        <ul className="features-list">
                            <li><CheckCircleIcon /> Unlimited messages</li>
                            <li><CheckCircleIcon /> Advanced search filters</li>
                            <li><CheckCircleIcon /> Priority support</li>
                        </ul>
                        <div className="cta-section">
                            <a href="/account/billing" className="upgrade-btn primary">
                                Upgrade Now
                            </a>
                            <p className="billing-note">
                                Cancel anytime • Secure billing • No hidden fees
                            </p>
                        </div>
                    </div>
                </div>

                <div className="final-cta">
                    <h2>Ready to Find Your Perfect Match?</h2>
                    <a href="/account/billing" className="upgrade-btn primary large">
                        Start Your Premium Journey
                    </a>
                </div>
            </div>
        </div>
    );
}
