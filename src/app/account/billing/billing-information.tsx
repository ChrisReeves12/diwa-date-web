'use client';

import { User, UserPhoto } from "@/types";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { AccountSettingsTabs } from "@/app/account/account-settings-tabs";
import { updateBillingInformation, updatePaymentMethod, getBillingInformation, type BillingInformation, type PaymentInformation } from "@/common/server-actions/billing.actions";
import { countries } from "@/config/countries";
import React, { useState, useEffect } from "react";

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

export function BillingInformation({ currentUser }: AccountSettingsProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingPayment, setIsLoadingPayment] = useState(false);
    const [isLoadingBillingInfo, setIsLoadingBillingInfo] = useState(true);

    // Billing information state
    const [billingInfo, setBillingInfo] = useState<BillingInformation>({
        name: '',
        address1: '',
        address2: '',
        city: '',
        region: '',
        postalCode: '',
        country: 'US'
    });

    // Payment information state
    const [paymentInfo, setPaymentInfo] = useState<PaymentInformation>({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardholderName: ''
    });

    // Existing billing info for display
    const [existingBilling, setExistingBilling] = useState<ExistingBillingInfo | null>(null);

    // Load existing billing information on component mount
    useEffect(() => {
        const loadBillingInfo = async () => {
            try {
                const billing = await getBillingInformation();
                if (billing) {
                    setExistingBilling(billing);
                    setBillingInfo({
                        name: billing.name || '',
                        address1: billing.address1 || '',
                        address2: billing.address2 || '',
                        city: billing.city || '',
                        region: billing.region || '',
                        postalCode: billing.postalCode || '',
                        country: billing.country || 'US'
                    });
                }
            } catch (error) {
                console.error('Failed to load billing information:', error);
            } finally {
                setIsLoadingBillingInfo(false);
            }
        };

        loadBillingInfo();
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

    // Get region label based on country
    const getRegionLabel = (country: string) => {
        switch (country) {
            case 'US':
            case 'CA':
                return 'State/Province';
            case 'GB':
                return 'County';
            case 'AU':
                return 'State/Territory';
            default:
                return 'State/Region';
        }
    };

    // Get postal code label based on country
    const getPostalCodeLabel = (country: string) => {
        switch (country) {
            case 'US':
                return 'ZIP Code';
            case 'CA':
                return 'Postal Code';
            case 'GB':
                return 'Postcode';
            default:
                return 'Postal Code';
        }
    };

    const handleBillingSubmit = async (formData: FormData) => {
        setErrors({});
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const result = await updateBillingInformation(billingInfo);

            if (!result.success) {
                setErrors({ billingForm: result.error || 'Failed to update billing information' });
                return;
            }

            setSuccessMessage('Billing information updated successfully');
            
            // Reload billing information to get updated data
            const updatedBilling = await getBillingInformation();
            if (updatedBilling) {
                setExistingBilling(updatedBilling);
            }
        } catch (error) {
            console.error('Billing information update error:', error);
            setErrors({ billingForm: 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentSubmit = async (formData: FormData) => {
        setErrors({});
        setSuccessMessage('');
        setIsLoadingPayment(true);

        try {
            const result = await updatePaymentMethod(paymentInfo);

            if (!result.success) {
                setErrors({ paymentForm: result.error || 'Failed to update payment method' });
                return;
            }

            setSuccessMessage('Payment method updated successfully');
            
            // Clear payment form for security
            setPaymentInfo({
                cardNumber: '',
                expiryMonth: '',
                expiryYear: '',
                cvv: '',
                cardholderName: ''
            });

            // Reload billing information to get updated payment data
            const updatedBilling = await getBillingInformation();
            if (updatedBilling) {
                setExistingBilling(updatedBilling);
            }
        } catch (error) {
            console.error('Payment method update error:', error);
            setErrors({ paymentForm: 'An unexpected error occurred' });
        } finally {
            setIsLoadingPayment(false);
        }
    };

    if (isLoadingBillingInfo) {
        return (
            <CurrentUserProvider currentUser={currentUser}>
                <SiteWrapper>
                    <div className="account-settings-container">
                        <div className="container">
                            <UserSubscriptionPlanDisplay />
                            <h2>Account | Billing Information</h2>
                            <AccountSettingsTabs selectedTab={'billing'}/>
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
                        <h2>Account | Billing Information</h2>
                        <AccountSettingsTabs selectedTab={'billing'}/>
                        <div className="account-settings-form-container billing-settings">

                            {/* Success Message */}
                            {successMessage && (
                                <div className="success-message">
                                    {successMessage}
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

                                    <form action={handleBillingSubmit}>
                                        <div className="form-row">
                                            <div className="input-container">
                                                <label htmlFor="billingName">Full Name</label>
                                                <input
                                                    type="text"
                                                    id="billingName"
                                                    name="billingName"
                                                    value={billingInfo.name}
                                                    onChange={(e) => setBillingInfo({...billingInfo, name: e.target.value})}
                                                    placeholder="Enter your full name"
                                                    required
                                                />
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
                                                    onChange={(e) => setBillingInfo({...billingInfo, address1: e.target.value})}
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
                                                    onChange={(e) => setBillingInfo({...billingInfo, address2: e.target.value})}
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
                                                    onChange={(e) => setBillingInfo({...billingInfo, city: e.target.value})}
                                                    placeholder="City"
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
                                                    onChange={(e) => setBillingInfo({...billingInfo, country: e.target.value})}
                                                    required
                                                >
                                                    {countries.map((country) => (
                                                        <option key={country.code} value={country.code}>
                                                            {country.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="input-container">
                                                <label htmlFor="region">{getRegionLabel(billingInfo.country)}</label>
                                                <input
                                                    type="text"
                                                    id="region"
                                                    name="region"
                                                    value={billingInfo.region}
                                                    onChange={(e) => setBillingInfo({...billingInfo, region: e.target.value})}
                                                    placeholder={getRegionLabel(billingInfo.country)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="input-container">
                                                <label htmlFor="postalCode">{getPostalCodeLabel(billingInfo.country)}</label>
                                                <input
                                                    type="text"
                                                    id="postalCode"
                                                    name="postalCode"
                                                    value={billingInfo.postalCode}
                                                    onChange={(e) => setBillingInfo({...billingInfo, postalCode: e.target.value})}
                                                    placeholder={getPostalCodeLabel(billingInfo.country)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <button
                                                className="btn-primary"
                                                type="submit"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Updating...' : 'Update Billing Address'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Payment Method Section */}
                                <div className="settings-section">
                                    <h3>Payment Method</h3>

                                    {/* Current Payment Method Display */}
                                    {existingBilling?.paymentMethod && existingBilling?.cclast4 && (
                                        <div className="current-payment-method">
                                            <p><strong>Current Payment Method:</strong></p>
                                            <p>{existingBilling.paymentMethod} ending in {existingBilling.cclast4}</p>
                                        </div>
                                    )}

                                    {/* Payment Form Errors */}
                                    {errors.paymentForm && (
                                        <div className="error-message">
                                            {errors.paymentForm}
                                        </div>
                                    )}

                                    <form action={handlePaymentSubmit}>
                                        <div className="form-row">
                                            <div className="input-container">
                                                <label htmlFor="cardholderName">Cardholder Name</label>
                                                <input
                                                    type="text"
                                                    id="cardholderName"
                                                    name="cardholderName"
                                                    value={paymentInfo.cardholderName}
                                                    onChange={(e) => setPaymentInfo({...paymentInfo, cardholderName: e.target.value})}
                                                    placeholder="Name as it appears on card"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="input-container">
                                                <label htmlFor="cardNumber">Card Number</label>
                                                <input
                                                    type="text"
                                                    id="cardNumber"
                                                    name="cardNumber"
                                                    value={paymentInfo.cardNumber}
                                                    onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: formatCardNumber(e.target.value)})}
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
                                                    onChange={(e) => setPaymentInfo({...paymentInfo, expiryMonth: e.target.value})}
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
                                                    onChange={(e) => setPaymentInfo({...paymentInfo, expiryYear: e.target.value})}
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
                                                    onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value.replace(/\D/g, '')})}
                                                    placeholder="123"
                                                    maxLength={4}
                                                    required
                                                />
                                                <small className="help-text">3-4 digit security code on the back of your card</small>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <button
                                                className="btn-primary"
                                                type="submit"
                                                disabled={isLoadingPayment}
                                            >
                                                {isLoadingPayment ? 'Processing...' : 'Update Payment Method'}
                                            </button>
                                        </div>

                                        <div className="payment-security-notice">
                                            <p><small>🔒 Your payment information is securely processed and encrypted. We do not store your complete credit card number.</small></p>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* PayPal Option (Future Implementation) */}
                            <div className="settings-section full-width">
                                <h3>Alternative Payment Methods</h3>
                                <div className="alternative-payment-methods">
                                    <div className="payment-option disabled">
                                        <div className="payment-option-content">
                                            <h4>PayPal</h4>
                                            <p>Pay securely with your PayPal account</p>
                                            <button className="btn-secondary" disabled>
                                                Coming Soon
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
