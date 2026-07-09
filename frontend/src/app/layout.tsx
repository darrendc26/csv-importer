import React from 'react';
import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'AI CSV CRM Lead Importer',
  description: 'Intelligent CRM lead importer mapping any CSV to GrowEasy CRM format using AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-XEDZJ7Q5WV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-XEDZJ7Q5WV');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}

