'use client';

import { User, UserPhoto } from "@/types";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { AccountSettingsTabs } from "@/app/account/account-settings-tabs";
import {
    updateBillingInformation,
    getBillingInformation,
    getSubscriptionPlans,
    enrollInSubscriptionPlan,
    isBillingInformationComplete,
    cancelSubscription,
    reactivateSubscription,
    getCurrentSubscriptionDetails,
    deletePaymentMethod,
    updateBillingAndPaymentWithAuthorizeNet,
    type BillingInformation,
    type PaymentInformation,
    getRegionsForCountry
} from "@/app/account/billing/billing.actions";
import { PaymentHistory } from "@/app/account/billing/payment-history";
import { isPostalCodeRequired } from "@/utils/postal-code-utils";
import { countries } from "@/config/countries";
import React, { useState, useEffect } from "react";
import "../account-settings.scss";
import { CheckCircleIcon, ExclamationCircleIcon, TrashIcon } from "react-line-awesome";

interface AccountSettingsProps {
    currentUser?: User & {
        isSubscriptionActive: boolean;
        mainPhotoCroppedImageData?: CroppedImageData;
        publicMainPhoto?: string;
        publicPhotos: UserPhoto[]
    }
}

interface ExistingBillingInfo {
    name: string;
    address1: string;
    address2: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    paymentMethod: string;
    cclast4: string;
}

interface SubscriptionPlan {
    id: number;
    name: string;
    description: string;
    listPrice: number;
    listPriceUnit: string;
}

interface SubscriptionDetails {
    id: number;
    endsAt: string | null;
    nextPaymentAt: string;
    startedAt: string;
    price: number;
    priceUnit: string;
    planName: string;
}

export function BillingInformation({ currentUser }: AccountSettingsProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingBillingInfo, setIsLoadingBillingInfo] = useState(true);
    const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

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

    // Payment information state
    const [paymentInfo, setPaymentInfo] = useState<PaymentInformation>({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: ''
    });

    // Existing billing info for display
    const [existingBilling, setExistingBilling] = useState<ExistingBillingInfo | null>(null);

    // Subscription plans state
    const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [isBillingComplete, setIsBillingComplete] = useState(false);

    // Current subscription management state
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [isLoadingCancel, setIsLoadingCancel] = useState(false);
    const [isLoadingReactivate, setIsLoadingReactivate] = useState(false);
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const [states, setStates] = useState<Array<{ code: string | null, name: string }>>([]);

    // Payment method deletion state
    const [isLoadingDeletePayment, setIsLoadingDeletePayment] = useState(false);

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

                // Check if billing is complete
                const billingComplete = await isBillingInformationComplete();
                setIsBillingComplete(billingComplete);

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

    // Generate year options for credit card expiry
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear + i);

    // Format card number with spaces
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

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

    const handleBillingAndPaymentSubmit = async (formData: FormData) => {
        setErrors({});
        setSuccessMessage('');
        setIsLoading(true);

        setTimeout(async () => {
            try {
                // If no payment method exists, use the combined function for payment processing
                if (!existingBilling?.paymentMethod) {
                    const result = await updateBillingAndPaymentWithAuthorizeNet({
                        billingInfo,
                        paymentInfo
                    });

                    if (!result.success) {
                        setErrors({ form: result.error || 'Failed to update billing and payment information' });
                        return;
                    }

                    setSuccessMessage('Billing information and payment method updated successfully.');

                    // Clear payment form for security
                    setPaymentInfo({
                        cardNumber: '',
                        expiryMonth: '',
                        expiryYear: '',
                        cvv: ''
                    });
                } else {
                    // If payment method exists, just update billing information
                    const billingResult = await updateBillingInformation(billingInfo);

                    if (!billingResult.success) {
                        setErrors({ billingForm: billingResult.error || 'Failed to update billing information' });
                        return;
                    }

                    setSuccessMessage('Billing information updated successfully');
                }

                // Reload billing information to get updated data
                const updatedBilling = await getBillingInformation();
                if (updatedBilling) {
                    setExistingBilling(updatedBilling);
                }

                // Recheck billing completeness
                const billingComplete = await isBillingInformationComplete();
                setIsBillingComplete(billingComplete);
            } catch (error) {
                console.error('Billing and payment update error:', error);
                setErrors({ form: 'An unexpected error occurred' });
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    const handleSubscriptionEnrollment = async () => {
        if (!selectedPlanId) {
            setErrors({ subscriptionForm: 'Please select a subscription plan' });
            return;
        }

        setErrors({});
        setSuccessMessage('');
        setIsLoadingSubscription(true);

        setTimeout(async () => {
            try {
                const result = await enrollInSubscriptionPlan(selectedPlanId);

                if (!result.success) {
                    setErrors({ subscriptionForm: result.error || 'Failed to enroll in subscription plan' });
                    return;
                }

                setSuccessMessage('Successfully enrolled in premium membership!');
                setSelectedPlanId(null);

                // Force a page reload to update the user's subscription status
                window.location.reload();
            } catch (error) {
                console.error('Subscription enrollment error:', error);
                setErrors({ subscriptionForm: 'An unexpected error occurred' });
            } finally {
                setIsLoadingSubscription(false);
            }
        }, 500);
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

    const handleDeletePayment = async () => {
        setIsLoadingDeletePayment(true);
        setErrors({});
        setSuccessMessage('');

        setTimeout(async () => {
            try {
                const result = await deletePaymentMethod();

                if (!result.success) {
                    setErrors({ paymentForm: result.error || 'Failed to delete payment method' });
                    return;
                }

                setSuccessMessage('Payment method deleted successfully');

                const billingComplete = await isBillingInformationComplete();
                setIsBillingComplete(billingComplete);

                window.location.reload();
            } catch (error) {
                console.error('Delete payment method error:', error);
                setErrors({ paymentForm: 'Failed to delete payment method' });
            } finally {
                setIsLoadingDeletePayment(false);
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
                                                <div className="subscription-status">
                                                    <div className="status-badge active">
                                                        <CheckCircleIcon /> Premium Member
                                                    </div>
                                                    <p>You are currently enrolled in the <strong>{subscriptionDetails.planName}</strong> plan.</p>

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
                                                                    disabled={isLoadingReactivate || !isBillingComplete}
                                                                >
                                                                    {isLoadingReactivate ? 'Processing...' : 'Continue My Membership'}
                                                                </button>
                                                                {!isBillingComplete && (
                                                                    <p className="help-text">Please ensure your billing information is up to date first</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Active subscription - show cancel option */
                                                        <div className="active-subscription-info">
                                                            <p>Next billing date: <strong>{new Date(subscriptionDetails.nextPaymentAt).toLocaleDateString()}</strong></p>
                                                            <p>Amount: <strong>${subscriptionDetails.price}/{subscriptionDetails.priceUnit === 'USD' ? 'month' : subscriptionDetails.priceUnit}</strong></p>

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
                                                    )}
                                                </div>
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
                                                    <div
                                                        key={plan.id}
                                                        className={`plan-option ${selectedPlanId === plan.id ? 'selected' : ''}`}
                                                        onClick={() => setSelectedPlanId(plan.id)}
                                                    >
                                                        <div className="plan-header">
                                                            <h4>{plan.name}</h4>
                                                            <div className="plan-price">
                                                                ${plan.listPrice}/{plan.listPriceUnit === 'USD' ? 'month' : plan.listPriceUnit}
                                                            </div>
                                                        </div>
                                                        <p className="plan-description">{plan.description}</p>
                                                        <div className="plan-features">
                                                            <p><CheckCircleIcon /> Unlimited messages</p>
                                                            <p><CheckCircleIcon /> See who liked you</p>
                                                            <p><CheckCircleIcon /> Advanced search filters</p>
                                                            <p><CheckCircleIcon /> Priority support</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {selectedPlanId && (
                                                <div className="enrollment-actions">
                                                    <button
                                                        className="btn-primary"
                                                        onClick={handleSubscriptionEnrollment}
                                                        disabled={isLoadingSubscription || !isBillingComplete}
                                                    >
                                                        {isLoadingSubscription ? 'Processing...' : 'Enroll in Premium'}
                                                    </button>
                                                    {!isBillingComplete && (
                                                        <p className="help-text">Please add your payment method below.</p>
                                                    )}
                                                </div>
                                            )}
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
                            </div>

                            {/* Combined Billing and Payment Form */}
                            <form action={handleBillingAndPaymentSubmit}>
                                {/* Form-level errors */}
                                {errors.form && (
                                    <div className="error-message">
                                        {errors.form}
                                    </div>
                                )}

                                {/* Side by side sections */}
                                <div className="settings-row">
                                    {/* Billing Address Section */}
                                    <div className="settings-section">
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
                                                />
                                                {billingInfo.country && !isPostalCodeRequired(countries.find(c => c.name === billingInfo.country)?.code || '') && (
                                                    <small className="help-text">Postal code is optional for this country</small>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method Section */}
                                    <div className="settings-section">
                                        <h3>Payment Method</h3>

                                        {/* Payment Form Errors */}
                                        {errors.paymentForm && (
                                            <div className="error-message">
                                                {errors.paymentForm}
                                            </div>
                                        )}

                                        {/* Show payment method info with delete button if exists */}
                                        {existingBilling?.paymentMethod && existingBilling?.cclast4 ? (
                                            <div className="payment-method-display">
                                                <div className="current-payment-method">
                                                    <p><strong>Current Payment Method:</strong></p>
                                                    <p>{existingBilling.paymentMethod} ending in {existingBilling.cclast4}</p>
                                                </div>
                                                <div className="payment-method-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-danger"
                                                        onClick={handleDeletePayment}
                                                        disabled={isLoadingDeletePayment}
                                                    >
                                                        {isLoadingDeletePayment ? 'Deleting...' : <><TrashIcon /> Delete Payment Method</>}
                                                    </button>
                                                    <p className="help-text">
                                                        <small>This will permanently remove your payment method from this account.</small>
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Show payment form if no payment method exists */
                                            <>
                                                <div className="form-row">
                                                    <div className="input-container">
                                                        <label htmlFor="cardNumber">Card Number</label>
                                                        <input
                                                            type="text"
                                                            id="cardNumber"
                                                            name="cardNumber"
                                                            value={paymentInfo.cardNumber}
                                                            onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: formatCardNumber(e.target.value) })}
                                                            placeholder="1234 5678 9012 3456"
                                                            maxLength={19}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-row form-row-split">
                                                    <div className="input-container">
                                                        <label htmlFor="expiryMonth">Expiry Month</label>
                                                        <select
                                                            id="expiryMonth"
                                                            name="expiryMonth"
                                                            value={paymentInfo.expiryMonth}
                                                            onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryMonth: e.target.value })}
                                                            required
                                                        >
                                                            <option value="">Month</option>
                                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                                <option key={month} value={month.toString().padStart(2, '0')}>
                                                                    {month.toString().padStart(2, '0')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="input-container">
                                                        <label htmlFor="expiryYear">Expiry Year</label>
                                                        <select
                                                            id="expiryYear"
                                                            name="expiryYear"
                                                            value={paymentInfo.expiryYear}
                                                            onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryYear: e.target.value })}
                                                            required
                                                        >
                                                            <option value="">Year</option>
                                                            {yearOptions.map(year => (
                                                                <option key={year} value={year.toString()}>
                                                                    {year}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-row">
                                                    <div className="input-container">
                                                        <label htmlFor="cvv">CVV</label>
                                                        <input
                                                            type="text"
                                                            id="cvv"
                                                            name="cvv"
                                                            value={paymentInfo.cvv}
                                                            onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value.replace(/\D/g, '') })}
                                                            placeholder="123"
                                                            maxLength={4}
                                                            required
                                                        />
                                                        <small className="help-text">3-4 digit security code on the back of your card</small>
                                                    </div>
                                                </div>

                                                <div className="payment-security-notice">
                                                    <p><small>🔒 Your payment information is securely processed and encrypted. We do not store your complete credit card number.</small></p>
                                                </div>

                                                <div className="form-row">
                                                    <button
                                                        className="btn-primary"
                                                        type="submit"
                                                        disabled={isLoading}
                                                    >
                                                        {isLoading ? 'Updating...' : 'Update Payment Information'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {existingBilling?.paymentMethod && existingBilling?.cclast4 && (
                                    <div className="form-row full-width billing-settings-submit-container">
                                        <button
                                            className="btn-primary"
                                            type="submit"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Updating...' : 'Update Billing Address'}
                                        </button>
                                    </div>
                                )}
                            </form>

                            {/* Payment History Section */}
                            <PaymentHistory />
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
