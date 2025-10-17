'use client';

import React, { useState, useEffect } from 'react';
import { getPaymentHistory } from './billing.actions';
import { EyeIcon } from 'react-line-awesome';
import Link from 'next/link';

interface PaymentTransaction {
    transId: string;
    id: number,
    paymentMethod: string,
    amount: number;
    description: string;
    accountNumber: string;
    createdAt: string;
    status: string;
}

export function PaymentHistory() {
    const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPaymentHistory = async () => {
            try {
                const history = await getPaymentHistory();
                setPaymentHistory(history);
            } catch (error) {
                console.error('Failed to load payment history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPaymentHistory();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatAmount = (amount: number) => {
        return amount.toFixed(2);
    };

    const getPaymentMethod = (accountNumber: string) => {
        if (!accountNumber) return '•••• •••• •••• 6892';
        return accountNumber;
    };

    if (isLoading) {
        return (
            <div className="settings-section full-width">
                <h3>Payment History</h3>
                <div className="loading-message">
                    <p>Loading payment history...</p>
                </div>
            </div>
        );
    }

    if (paymentHistory.length === 0) {
        return (
            <div className="settings-section full-width">
                <h3>Payment History</h3>
                <p>No payment history found.</p>
            </div>
        );
    }

    return (
        <div className="settings-section full-width">
            <h3>Payment History</h3>

            <div className="payment-history-table-mobile">
                {paymentHistory.map((transaction) => (
                    <div key={transaction.transId} className="payment-history-row">
                        <div className="payment-history-info">
                            <div className="payment-date">{formatDate(transaction.createdAt)}</div>
                            <div className="payment-desc">
                                {transaction.description || 'Premium Membership'}
                            </div>
                            <div className="payment-method">
                                <div>{transaction.paymentMethod?.toUpperCase()}</div>
                            </div>
                            <div className="view-receipt">
                                <Link target='_blank' href={`/account/billing/receipt/${transaction.transId}`} className="view-receipt">
                                    <EyeIcon size='lg' /> View
                                </Link>
                            </div>
                        </div>
                        <div className="payment-amount">
                            {formatAmount(transaction.amount)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="payment-history-table">
                <div className="payment-history-header">
                    <div className="header-cell date-col">Date</div>
                    <div className="header-cell status">Status</div>
                    <div className="header-cell description-col">Description</div>
                    <div className="header-cell payment-method-col">Payment Method</div>
                    <div className="header-cell receipt-col">Receipt</div>
                    <div className="header-cell total-col">Total</div>
                </div>

                {paymentHistory.map((transaction) => (
                    <div key={transaction.transId} className="payment-history-row">
                        <div className="payment-cell date-col">
                            {formatDate(transaction.createdAt)}
                        </div>
                        <div className="payment-cell status">{transaction.status}</div>
                        <div className="payment-cell description-col">
                            {transaction.description || 'Premium Membership'}
                        </div>
                        <div className="payment-cell payment-method-col">
                            <div>
                                <div className="payment-method">{transaction.paymentMethod?.toUpperCase()}</div>
                                <div className="payment-method-number">
                                    {transaction.accountNumber}
                                </div>
                            </div>
                        </div>
                        <div className="payment-cell receipt-col">
                            <Link target='_blank' href={`/account/billing/receipt/${transaction.transId}`} className="view-receipt">
                                <EyeIcon size='lg' /> View
                            </Link>
                        </div>
                        <div className="payment-cell total-col">
                            {formatAmount(transaction.amount)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="payment-history-note">
                <p>We only show up to 1 year of billing history</p>
            </div>
        </div>
    );
}
