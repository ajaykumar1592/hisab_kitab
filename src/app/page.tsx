import Link from 'next/link';
import { ArrowRight, Users, TrendingUp, Package, MessageSquare } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Digital Khata Book
            <span className="text-blue-600"> & Business Manager</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Complete customer ledger management system with WhatsApp integration,
            rate list management, and professional PDF generation for Indian businesses.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center">
              Go to Dashboard <ArrowRight className="inline ml-2" size={20} />
            </Link>
            <Link href="/login" className="border border-gray-300 text-gray-700 bg-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
