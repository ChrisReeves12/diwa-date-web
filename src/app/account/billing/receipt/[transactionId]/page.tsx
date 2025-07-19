import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import "./receipt.scss";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getPaymentTransaction } from "@/server-side-helpers/billing.helpers";
import moment from "moment";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Receipt`
    };
}

export default async function ReceiptPage({ params }: any) {
    const currentUser = await getCurrentUser(await cookies());
    const lParams = await params;
    const { transactionId } = lParams;
    
    if (!currentUser) {
        redirect('/');
    }

    const paymentTransaction = await getPaymentTransaction(transactionId, currentUser.id);
    const { amount, accountNumber, status, description, paymentMethod, transId, createdAt } = paymentTransaction as any;
    const receiptDate = moment(createdAt).format('MMMM D, YYYY');

    return (
        <div className="receipt-container">
            <h1>Diwa Date Payment Receipt</h1>
            <hr/>
            <div className="receipt-info">
                <h2>Receipt Details</h2>
                <div className="info-row">
                    <span className="info-label">Receipt Number:</span>
                    <span className="info-value">{transId}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Payment Date:</span>
                    <span className="info-value">{receiptDate}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Transaction Status:</span>
                    <span style={{textTransform: 'capitalize'}} className="info-value">{status}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Customer Email:</span>
                    <span className="info-value">{currentUser.email}</span>
                </div>
            </div>
            
            <div className="transaction-details">
                <h3>Transaction Details</h3>
                
                <div className="item-row">
                    <div className="item-details">
                        <div className="item-name">{description} Membership (1 Month)</div>
                    </div>
                    <div className="item-price">
                        <div className="label">Amount Due:</div>
                        <div className="amount">${amount}</div>
                    </div>
                </div>
                
                <div className="total-row">
                    <span className="total-label">Total Paid:</span>
                    <span className="total-amount">${amount}</span>
                </div>
                
                <div className="payment-method">
                    <h4>Payment Method</h4>
                    <p>{paymentMethod} {accountNumber}</p>
                </div>
            </div>
        </div>
    );
}