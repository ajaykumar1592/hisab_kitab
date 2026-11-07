import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Digital Khata Book
          </h1>
          <p className="text-blue-100 text-lg">
            Complete customer ledger management system with WhatsApp integration,
            rate list management, and professional PDF generation for Indian businesses.
          </p>
        </div>
        <div className="text-blue-200 text-sm">
          Built for Indian businesses, wholesalers, and retailers
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}