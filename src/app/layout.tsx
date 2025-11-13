import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.scss";
import GlobalAlertProvider from "@/common/alert-dialog/global-alert-provider";
import { CookieConsentProvider } from '@/common/cookie-consent/cookie-consent-provider';
import CookieConsentPopup from '@/common/cookie-consent/cookie-consent-popup';
import DynamicThemeProvider from '@/theme/dynamic-theme-provider';

export const metadata: Metadata = {
  title: `${process.env.APP_NAME} | ${process.env.APP_TAGLINE}`,
  description: process.env.APP_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="initial-scale=1, width=device-width, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&family=Oswald:wght@200..700&display=swap"
          rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css"
        />
        {/* Google Tag Manager - Only load in production */}
        {process.env.NEXT_PUBLIC_ENV === 'production' && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=AW-11218713754"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'AW-11218713754');
              `}
            </Script>
          </>
        )}
        {/* Meta Pixel Code - Only load in production */}
        {process.env.NEXT_PUBLIC_ENV === 'production' && !!process.env.NEXT_META_DATASET_ID && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_META_DATASET_ID}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img height="1" width="1" style={{display: 'none'}}
                src={`https://www.facebook.com/tr?id=${process.env.NEXT_META_DATASET_ID}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}
      </head>
      <body>
        <DynamicThemeProvider>
          <CookieConsentProvider>
            <GlobalAlertProvider>
              {children}
            </GlobalAlertProvider>
            <CookieConsentPopup />
          </CookieConsentProvider>
        </DynamicThemeProvider>
      </body>
    </html>
  );
}
