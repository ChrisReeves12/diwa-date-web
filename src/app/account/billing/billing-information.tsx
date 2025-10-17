'use client';

import { User } from "@/types";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { AccountSettingsTabs } from "@/app/account/account-settings-tabs";
import { FaInfoCircle } from "react-icons/fa";
import {
    updateBillingInformation,
    getBillingInformation,
    getSubscriptionPlans,
    cancelSubscription,
    reactivateSubscription,
    removeSubscription,
    getCurrentSubscriptionDetails,
    handlePayPalSubscription,
    type BillingInformation,
    getRegionsForCountry
} from "@/app/account/billing/billing.actions";
import { PaymentHistory } from "@/app/account/billing/payment-history";
import { isPostalCodeRequired } from "@/utils/postal-code-utils";
import { countries } from "@/config/countries";
import React, { useState, useEffect } from "react";
import "../account-settings.scss";
import { CheckCircleIcon, ExclamationCircleIcon, InfoCircleIcon, TrashIcon } from "react-line-awesome";
import Link from "next/link";

// PayPal SDK types
declare global {
    interface Window {
        paypal?: {
            Buttons: (options: {
                style: any;
                createSubscription: (data: any, actions: any) => Promise<string>;
                onApprove: (data: any, actions: any) => void;
                onError?: (err: any) => void;
            }) => {
                render: (selector: string) => Promise<void>;
            };
        };
    }
}

interface AccountSettingsProps {
    currentUser?: User
}

interface ExistingBillingInfo {
    name: string;
    address1: string;
    address2: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
}

interface SubscriptionPlan {
    id: number;
    name: string;
    description: string;
    listPrice: number;
    listPriceUnit: string;
    paypalPlanId?: string;
}

interface SubscriptionDetails {
    id: number;
    endsAt: string | null;
    nextPaymentAt: string;
    startedAt: string;
    paypalSubscriptionId?: string;
    price: number;
    priceUnit: string;
    planName: string;
    paymentDisputeMessage?: string | null;
    paymentDisputeDate?: string | null;
}

export function BillingInformation({ currentUser }: AccountSettingsProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingBillingInfo, setIsLoadingBillingInfo] = useState(true);
    const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
    const isUsingPayPal = true;

    // Billing information state
    const [billingInfo, setBillingInfo] = useState<BillingInformation>({
        name: '',
        address1: '',
        address2: '',
        city: '',
        region: '',
        postalCode: '',
        country: currentUser?.country || ''
    });

    // Existing billing info for display
    const [existingBilling, setExistingBilling] = useState<ExistingBillingInfo | null>(null);

    // Subscription plans state
    const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

    // Current subscription management state
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [isLoadingCancel, setIsLoadingCancel] = useState(false);
    const [isLoadingReactivate, setIsLoadingReactivate] = useState(false);
    const [isLoadingRemove, setIsLoadingRemove] = useState(false);
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const [states, setStates] = useState<Array<{ code: string | null, name: string }>>([]);

    const isFoundingMember = currentUser?.isFoundingMember || false;

    // Load existing billing information and subscription plans on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load billing information
                const billing = await getBillingInformation();
                if (billing) {
                    setExistingBilling(billing);

                    // Normalize country - convert code to name if necessary
                    let countryValue = billing.country || currentUser?.country || '';
                    if (countryValue.length === 2) {
                        // It's a country code, convert to name
                        const countryObj = countries.find(c => c.code === countryValue);
                        if (countryObj) {
                            countryValue = countryObj.name;
                        }
                    }

                    setBillingInfo({
                        name: billing.name || '',
                        address1: billing.address1 || '',
                        address2: billing.address2 || '',
                        city: billing.city || '',
                        region: billing.region || '',
                        postalCode: billing.postalCode || '',
                        country: countryValue
                    });
                }

                // Load regions for the existing country
                if (billingInfo.country) {
                    // Check if billing.country is a code or a name
                    let countryCode = billingInfo.country;

                    // If it's a 2-letter code, keep it; otherwise find the code from name
                    if (billingInfo.country.length > 2) {
                        const countryObj = countries.find(c => c.name === billingInfo.country);
                        if (countryObj) {
                            countryCode = countryObj.code;
                        }
                    }

                    const regions = await getRegionsForCountry(countryCode);
                    setStates(regions.map(s => ({ name: s.name, code: s.stateCode })));
                }

                // Load subscription plans
                const plans = await getSubscriptionPlans();
                setSubscriptionPlans(plans);

                // Load current subscription details if user is premium
                if (currentUser?.isSubscriptionActive) {
                    const subscriptionDetails = await getCurrentSubscriptionDetails();
                    setSubscriptionDetails(subscriptionDetails);
                }
            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                setIsLoadingBillingInfo(false);
            }
        };

        loadData();
    }, []);

    // Load PayPal SDK and initialize buttons when subscription plans are loaded
    useEffect(() => {
        if (subscriptionPlans.length > 0 && !currentUser?.isSubscriptionActive) {
            // Get PayPal Client ID from environment variable
            const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

            if (!paypalClientId) {
                console.error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set in environment variables');
                setErrors({ subscriptionForm: 'PayPal is not configured. Please contact support.' });
                return;
            }

            // Load PayPal SDK
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&vault=true&intent=subscription`;
            script.setAttribute('data-sdk-integration-source', 'button-factory');

            script.onload = () => {
                // Initialize PayPal buttons for each plan
                subscriptionPlans.forEach((plan) => {
                    const containerId = `paypal-button-container-${plan.id}`;
                    const container = document.getElementById(containerId);

                    if (container && window.paypal) {
                        container.innerHTML = ''; // Clear any existing content

                        window.paypal.Buttons({
                            style: {
                                shape: 'rect',
                                color: 'silver',
                                layout: 'vertical',
                                label: 'subscribe'
                            },
                            createSubscription: function (data: any, actions: any) {
                                const paypalPlanId = plan.paypalPlanId;
                                return actions.subscription.create({
                                    plan_id: paypalPlanId
                                });
                            },
                            onApprove: function (data: any, actions: any) {
                                handlePayPalSuccess(data.subscriptionID, plan.id);
                            },
                            onError: function (err: any) {
                                console.error('PayPal error:', err);
                                setErrors({ subscriptionForm: 'PayPal subscription error occurred' });
                            }
                        }).render(`#${containerId}`);
                    }
                });
            };

            if (!document.querySelector('script[src*="paypal.com/sdk"]')) {
                document.head.appendChild(script);
            }
        }
    }, [subscriptionPlans, currentUser?.isSubscriptionActive]);


    // Get region label based on country name
    const getRegionLabel = (countryName: string) => {
        const countryObj = countries.find((c: any) => c.name === countryName);
        return countryObj?.regionLabel || 'State/Region';
    };

    // Get postal code label based on country name
    const getPostalCodeLabel = (countryName: string) => {
        switch (countryName) {
            case 'United States':
                return 'Zip Code';
            case 'Philippines':
                return 'Zip/Postal Code';
            case 'Canada':
                return 'Postal Code';
            case 'United Kingdom':
                return 'Postcode';
            default:
                return 'Postal Code';
        }
    };

    const handleBillingSubmit = async (formData: FormData) => {
        setErrors({});
        setSuccessMessage('');
        setIsLoading(true);

        setTimeout(async () => {
            try {
                // Update billing information
                const billingResult = await updateBillingInformation(billingInfo);

                if (!billingResult.success) {
                    setErrors({ billingForm: billingResult.error || 'Failed to update billing information' });
                    return;
                }

                setSuccessMessage('Billing information updated successfully');

                // Reload billing information to get updated data
                const updatedBilling = await getBillingInformation();
                if (updatedBilling) {
                    setExistingBilling(updatedBilling);
                }
            } catch (error) {
                console.error('Billing update error:', error);
                setErrors({ form: 'An unexpected error occurred' });
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    // PayPal subscription handler
    const handlePayPalSuccess = async (subscriptionID: string, planId: number) => {
        try {
            const result = await handlePayPalSubscription(subscriptionID, planId);

            if (result.success) {
                setSuccessMessage('Successfully enrolled in premium membership!');
                // Force a page reload to update the user's subscription status
                window.location.reload();
            } else {
                setErrors({ subscriptionForm: result.error || 'Failed to process subscription' });
            }
        } catch (error) {
            console.error('PayPal subscription error:', error);
            setErrors({ subscriptionForm: 'An unexpected error occurred' });
        }
    };

    const handleCancelSubscription = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsLoadingCancel(true);

        setTimeout(async () => {
            try {
                const result = await cancelSubscription();

                if (!result.success) {
                    setErrors({ subscriptionForm: result.error || 'Failed to cancel subscription' });
                    return;
                }

                setSuccessMessage('Your subscription has been cancelled and will end at your next billing date.');
                setShowCancelConfirmation(false);

                // Reload subscription details
                const updatedDetails = await getCurrentSubscriptionDetails();
                setSubscriptionDetails(updatedDetails);
            } catch (error) {
                console.error('Subscription cancellation error:', error);
                setErrors({ subscriptionForm: 'An unexpected error occurred' });
            } finally {
                setIsLoadingCancel(false);
            }
        }, 500);
    };

    const handleReactivateSubscription = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsLoadingReactivate(true);

        setTimeout(async () => {
            try {
                const result = await reactivateSubscription();

                if (!result.success) {
                    setErrors({ subscriptionForm: result.error || 'Failed to reactivate subscription' });
                    return;
                }

                setSuccessMessage('Your subscription has been reactivated and will continue automatically.');

                // Reload subscription details
                const updatedDetails = await getCurrentSubscriptionDetails();
                setSubscriptionDetails(updatedDetails);
            } catch (error) {
                console.error('Subscription reactivation error:', error);
                setErrors({ subscriptionForm: 'An unexpected error occurred' });
            } finally {
                setIsLoadingReactivate(false);
            }
        }, 500);
    };

    const handleRemoveSubscription = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsLoadingRemove(true);

        setTimeout(async () => {
            try {
                const result = await removeSubscription();

                if (!result.success) {
                    setErrors({ subscriptionForm: result.error || 'Failed to remove subscription' });
                    return;
                }

                setSuccessMessage('Your subscription has been removed. You can now create a new subscription with a different payment method.');
                setShowRemoveConfirmation(false);

                // Force a page reload to update the user's subscription status
                window.location.reload();
            } catch (error) {
                console.error('Subscription removal error:', error);
                setErrors({ subscriptionForm: 'An unexpected error occurred' });
            } finally {
                setIsLoadingRemove(false);
            }
        }, 500);
    };


    if (isLoadingBillingInfo) {
        return (
            <CurrentUserProvider currentUser={currentUser}>
                <SiteWrapper>
                    <div className="account-settings-container">
                        <div className="container">
                            <UserSubscriptionPlanDisplay />
                            <h2>Premium Membership</h2>
                            <AccountSettingsTabs selectedTab={'billing'} />
                            <div className="account-settings-form-container billing-settings">
                                <div className="loading-message">
                                    <p>Loading billing information...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </SiteWrapper>
            </CurrentUserProvider>
        );
    }

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="account-settings-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <h2>Premium Membership</h2>
                        <AccountSettingsTabs selectedTab={'billing'} />
                        <div className="account-settings-form-container billing-settings">

                            {/* Success Message */}
                            {successMessage && (
                                <div className="success-message">
                                    {successMessage}
                                </div>
                            )}

                            {/* Subscription Management Section */}
                            <div className="settings-section full-width membership-section">
                                <h3>Premium Membership</h3>

                                {/* Subscription Form Errors */}
                                {errors.subscriptionForm && (
                                    <div className="error-message">
                                        {errors.subscriptionForm}
                                    </div>
                                )}

                                {currentUser?.isSubscriptionActive ? (
                                    /* Current Premium Member */
                                    <div className="current-subscription">
                                        {subscriptionDetails && (
                                            <>
                                                {/* Payment Dispute Warning */}
                                                {subscriptionDetails.paymentDisputeMessage ? (
                                                    <div className="subscription-status">
                                                        <div className="error-message">
                                                            <ExclamationCircleIcon /> <strong>Billing Issue:</strong> {subscriptionDetails.paymentDisputeMessage}
                                                            {subscriptionDetails.paymentDisputeDate && (
                                                                <p>Date: {new Date(subscriptionDetails.paymentDisputeDate).toLocaleDateString()}</p>
                                                            )}
                                                            <p>You can resolve the payment issue with PayPal, or remove your subscription enrollment, then subscribe again with a new payment method.</p>
                                                        </div>
                                                        <div className="cancel-actions">
                                                            <button
                                                                className="btn-danger"
                                                                onClick={() => setShowRemoveConfirmation(true)}
                                                                disabled={isLoadingRemove}
                                                            >
                                                                Remove Subscription
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="subscription-status">
                                                        <div className="status-badge active">
                                                            <CheckCircleIcon /> Premium Member
                                                        </div>
                                                        <p>You are currently enrolled in the <strong>{subscriptionDetails.planName}</strong> plan.</p>

                                                        <>
                                                            {subscriptionDetails.endsAt ? (
                                                                /* Subscription scheduled to end */
                                                                <div className="cancellation-notice">
                                                                    <div className="warning-message">
                                                                        <p><strong><ExclamationCircleIcon /> Your membership is scheduled to end on {new Date(subscriptionDetails.endsAt).toLocaleDateString()}.</strong></p>
                                                                        <p>You will continue to have premium access until that date.</p>
                                                                    </div>
                                                                    <div className="reactivate-actions">
                                                                        <button
                                                                            className="btn-primary"
                                                                            onClick={handleReactivateSubscription}
                                                                            disabled={isLoadingReactivate || !subscriptionDetails.paypalSubscriptionId}
                                                                        >
                                                                            {isLoadingReactivate ? 'Processing...' : 'Continue My Membership'}
                                                                        </button>
                                                                        {!subscriptionDetails.paypalSubscriptionId &&
                                                                            <div className="reactivate-note">
                                                                                <InfoCircleIcon /> Since your subscription was cancelled at PayPal, to enroll in auto-billing again, you will need to wait until your billing period ends on <strong>{new Date(subscriptionDetails.endsAt).toLocaleDateString()}</strong> to enroll in a new subscription.
                                                                            </div>}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                isFoundingMember ? (
                                                                    <div className="founding-member-subscription-info">
                                                                        <p><strong>Lifetime Premium Access</strong></p>
                                                                        <p>Your founding member status provides permanent premium benefits with no billing required.</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="active-subscription-info">
                                                                        <p>Next billing date: <strong>{new Date(subscriptionDetails.nextPaymentAt).toLocaleDateString()}</strong></p>
                                                                        {Number(subscriptionDetails.price) > 0 ?
                                                                            <p>Amount: <strong>${subscriptionDetails.price}/{subscriptionDetails.priceUnit === 'USD' ? 'month' : subscriptionDetails.priceUnit}</strong></p> :
                                                                            <p>Amount: <strong>Free</strong></p>}

                                                                        <div className="cancel-actions">
                                                                            <button
                                                                                className="btn-secondary"
                                                                                onClick={() => setShowCancelConfirmation(true)}
                                                                                disabled={isLoadingCancel}
                                                                            >
                                                                                Cancel Membership
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* Not a premium member - show enrollment options */
                                    subscriptionPlans.length > 0 ? (
                                        <div className="subscription-plans">
                                            <div className="subscription-info">
                                                <p>Upgrade to premium to unlock additional features and connect with more people.</p>
                                            </div>

                                            <div className="plan-options">
                                                {subscriptionPlans.map((plan) => (
                                                    <div key={plan.id} className="plan-option">
                                                        <div className="plan-header">
                                                            <h4>{plan.name}</h4>
                                                            <div className="plan-price">
                                                                ${plan.listPrice}/{plan.listPriceUnit === 'USD' ? 'month' : plan.listPriceUnit}
                                                            </div>
                                                        </div>
                                                        <p className="plan-description">{plan.description}</p>
                                                        <div className="plan-features">
                                                            <p><CheckCircleIcon /> Unlimited messages</p>
                                                            <p><CheckCircleIcon /> Advanced search filters</p>
                                                            <p><CheckCircleIcon /> Priority support</p>
                                                        </div>
                                                        <div className="paypal-button-wrapper">
                                                            <div id={`paypal-button-container-${plan.id}`}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p>No subscription plans available at this time.</p>
                                    )
                                )}

                                {/* Cancellation Confirmation Dialog */}
                                {showCancelConfirmation && (
                                    <div className="dialog-overlay">
                                        <div className="dialog">
                                            <h4>Cancel Premium Membership</h4>
                                            <p>Are you sure you want to cancel your premium membership?</p>
                                            <p>Your membership will remain active until your next billing date
                                                ({subscriptionDetails ? new Date(subscriptionDetails.nextPaymentAt).toLocaleDateString() : ''}) and then will automatically end.</p>

                                            <div className="dialog-actions">
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => setShowCancelConfirmation(false)}
                                                    disabled={isLoadingCancel}
                                                >
                                                    Keep My Membership
                                                </button>
                                                <button
                                                    className="btn-danger"
                                                    onClick={handleCancelSubscription}
                                                    disabled={isLoadingCancel}
                                                >
                                                    {isLoadingCancel ? 'Processing...' : 'Yes, Cancel Membership'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Remove Subscription Confirmation Dialog */}
                                {showRemoveConfirmation && (
                                    <div className="dialog-overlay">
                                        <div className="dialog">
                                            <h4>Remove Subscription</h4>
                                            <p>Are you sure you want to remove your subscription enrollment?</p>
                                            <p><strong>This action will:</strong></p>
                                            <ul>
                                                <li>Permanently delete your current subscription</li>
                                                <li>Cancel the subscription with PayPal</li>
                                                <li>Remove your premium access immediately</li>
                                                <li>Allow you to create a new subscription with a different payment method</li>
                                            </ul>
                                            <p><strong>This cannot be undone.</strong></p>

                                            <div className="dialog-actions">
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => setShowRemoveConfirmation(false)}
                                                    disabled={isLoadingRemove}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn-danger"
                                                    onClick={handleRemoveSubscription}
                                                    disabled={isLoadingRemove}
                                                >
                                                    {isLoadingRemove ? 'Removing...' : 'Yes, Remove Subscription'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="payment-plan-notes">
                                <FaInfoCircle className={"icon"} />
                                <div className="note">
                                    <strong>Note</strong>: Payments will be made via PayPal to <strong>Taktyx</strong>, as Diwa Date is a brand operated by <strong>Taktyx LLC</strong>, as stated in our <Link target="_blank" href="/terms-of-service">terms of service agreement</Link>.
                                </div>
                            </div>

                            {/* Billing Address Form */}
                            {!isUsingPayPal && <form action={handleBillingSubmit}>
                                {/* Form-level errors */}
                                {errors.form && (
                                    <div className="error-message">
                                        {errors.form}
                                    </div>
                                )}

                                {/* Billing Address Section */}
                                <div className="settings-section full-width">
                                    <h3>Billing Address</h3>

                                    {/* Billing Form Errors */}
                                    {errors.billingForm && (
                                        <div className="error-message">
                                            {errors.billingForm}
                                        </div>
                                    )}

                                    <div className="form-row">
                                        <div className="input-container">
                                            <label htmlFor="billingName">Full Name</label>
                                            <input
                                                type="text"
                                                id="billingName"
                                                name="billingName"
                                                value={billingInfo.name}
                                                onChange={(e) => setBillingInfo({ ...billingInfo, name: e.target.value })}
                                                placeholder="Enter your full name"
                                                required
                                                disabled={isFoundingMember}
                                                readOnly={isFoundingMember}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="input-container">
                                            <label htmlFor="country">Country</label>
                                            <select
                                                id="country"
                                                name="country"
                                                value={billingInfo.country}
                                                onChange={(e) => {
                                                    setBillingInfo({ ...billingInfo, country: e.target.value, region: '' });

                                                    // Load states
                                                    if (e.target.value) {
                                                        // Find the country code for the selected country name
                                                        const selectedCountry = countries.find(c => c.name === e.target.value);
                                                        if (selectedCountry) {
                                                            getRegionsForCountry(selectedCountry.code)
                                                                .then((states) => {
                                                                    setStates(states.map(s => ({ name: s.name, code: s.stateCode })))
                                                                });
                                                        }
                                                    } else {
                                                        setStates([]);
                                                    }
                                                }}
                                                required
                                                disabled={isFoundingMember}
                                            >
                                                <option value=''>Select Country</option>
                                                {countries.map((country) => (
                                                    <option key={country.code} value={country.name}>
                                                        {country.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="input-container">
                                            <label htmlFor="address1">Address Line 1</label>
                                            <input
                                                type="text"
                                                id="address1"
                                                name="address1"
                                                value={billingInfo.address1}
                                                onChange={(e) => setBillingInfo({ ...billingInfo, address1: e.target.value })}
                                                placeholder="Street address"
                                                required
                                                disabled={isFoundingMember}
                                                readOnly={isFoundingMember}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="input-container">
                                            <label htmlFor="address2">Address Line 2 (Optional)</label>
                                            <input
                                                type="text"
                                                id="address2"
                                                name="address2"
                                                value={billingInfo.address2}
                                                onChange={(e) => setBillingInfo({ ...billingInfo, address2: e.target.value })}
                                                placeholder="Apartment, suite, etc."
                                                disabled={isFoundingMember}
                                                readOnly={isFoundingMember}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="input-container">
                                            <label htmlFor="city">City</label>
                                            <input
                                                type="text"
                                                id="city"
                                                name="city"
                                                value={billingInfo.city}
                                                onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
                                                placeholder="City"
                                                required
                                                disabled={isFoundingMember}
                                                readOnly={isFoundingMember}
                                            />
                                        </div>
                                    </div>

                                    {states.length > 0 &&
                                        <div className="form-row">
                                            <div className="input-container">
                                                <label htmlFor="region">{getRegionLabel(billingInfo.country)}</label>
                                                <select
                                                    id="region"
                                                    required
                                                    name="region"
                                                    value={billingInfo.region}
                                                    onChange={(e) => setBillingInfo({ ...billingInfo, region: e.target.value })}
                                                    disabled={isFoundingMember}
                                                >
                                                    <option value="">Select {getRegionLabel(billingInfo.country)}</option>
                                                    {states.map(state =>
                                                        <option key={state.name} value={state.name}>{state.name}</option>)}
                                                </select>
                                            </div>
                                        </div>}

                                    <div className="form-row">
                                        <div className="input-container">
                                            <label htmlFor="postalCode">
                                                {getPostalCodeLabel(billingInfo.country)}
                                            </label>
                                            <input
                                                type="text"
                                                id="postalCode"
                                                name="postalCode"
                                                value={billingInfo.postalCode}
                                                onChange={(e) => setBillingInfo({ ...billingInfo, postalCode: e.target.value })}
                                                placeholder={getPostalCodeLabel(billingInfo.country)}
                                                required={isPostalCodeRequired(countries.find(c => c.name === billingInfo.country)?.code || '')}
                                                disabled={isFoundingMember}
                                                readOnly={isFoundingMember}
                                            />
                                            {billingInfo.country && !isPostalCodeRequired(countries.find(c => c.name === billingInfo.country)?.code || '') && (
                                                <small className="help-text">Postal code is optional for this country</small>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <button
                                            className="btn-primary"
                                            type="submit"
                                            disabled={isLoading || isFoundingMember}
                                        >
                                            {isLoading ? 'Updating...' : 'Update Billing Address'}
                                        </button>
                                    </div>
                                </div>
                            </form>}

                            {!isFoundingMember &&
                                <PaymentHistory />}
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
