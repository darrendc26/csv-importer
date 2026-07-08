import React from 'react';
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
      <body>{children}</body>
    </html>
  );
}
