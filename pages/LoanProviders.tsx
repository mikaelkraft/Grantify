import React from 'react';
import { ExternalLink, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { AdverticaBanner } from '../components/AdverticaBanner';

interface LoanProvider {
  name: string;
  description: string;
  loanRange: string;
  interestRange: string;
  tenure: string;
  website: string;
  playStoreUrl?: string;
}

const cbnApprovedLenders: LoanProvider[] = [
  {
    name: "FairMoney",
    description: "Offers instant loans without collateral. One of the leading digital banks in Nigeria with CBN approval.",
    loanRange: "NGN 1,500 - NGN 3,000,000",
    interestRange: "5% - 30% monthly",
    tenure: "2 - 12 months",
    website: "https://fairmoney.ng",
    playStoreUrl: "https://play.google.com/store/apps/details?id=ng.com.fairmoney.fairmoney"
  },
  {
    name: "Carbon (Paylater)",
    description: "Provides quick loans, bill payments, and investment services. Formerly known as Paylater.",
    loanRange: "NGN 2,000 - NGN 1,000,000",
    interestRange: "5% - 15% monthly",
    tenure: "1 - 6 months",
    website: "https://getcarbon.co",
    playStoreUrl: "https://play.google.com/store/apps/details?id=co.paylater.android"
  },
  {
    name: "Branch",
    description: "International lending app offering loans in Nigeria, Kenya, and other African countries.",
    loanRange: "NGN 1,000 - NGN 500,000",
    interestRange: "4% - 21% monthly",
    tenure: "1 - 12 months",
    website: "https://branch.co",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.branch_international.branch.branch_demo_android"
  },
  {
    name: "PalmCredit",
    description: "Quick loan app with simple application process and fast disbursement.",
    loanRange: "NGN 2,000 - NGN 500,000",
    interestRange: "5% - 20% monthly",
    tenure: "14 days - 6 months",
    website: "https://palmcredit.io",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.transsnetfinancial.palmcredit"
  },
  {
    name: "Renmoney",
    description: "Licensed lending company offering personal and business loans with competitive rates.",
    loanRange: "NGN 50,000 - NGN 6,000,000",
    interestRange: "2.5% - 4% monthly",
    tenure: "3 - 24 months",
    website: "https://renmoney.com",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.renmoney"
  },
  {
    name: "Specta",
    description: "A product by Sterling Bank offering instant loans to salary earners and business owners.",
    loanRange: "NGN 50,000 - NGN 5,000,000",
    interestRange: "2% - 3% monthly",
    tenure: "3 - 12 months",
    website: "https://specta.com.ng"
  },
  {
    name: "QuickCheck",
    description: "AI-powered lending platform providing quick loans based on mobile data analysis.",
    loanRange: "NGN 1,500 - NGN 500,000",
    interestRange: "5% - 30% monthly",
    tenure: "1 - 6 months",
    website: "https://quickcheck.ng",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.quickcheckng"
  },
  {
    name: "Aella Credit",
    description: "Provides salary advances and personal loans to employed individuals.",
    loanRange: "NGN 1,500 - NGN 1,000,000",
    interestRange: "4% - 20% monthly",
    tenure: "1 - 12 months",
    website: "https://aellaapp.com",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.alohapayday.android"
  },
  {
    name: "Kuda Bank",
    description: "Digital bank offering overdraft facilities to customers based on account history.",
    loanRange: "NGN 2,000 - NGN 100,000",
    interestRange: "0.3% daily",
    tenure: "Up to 30 days",
    website: "https://kuda.com",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.kudabank.app"
  },
  {
    name: "OPay",
    description: "Fintech platform offering OKash loans with quick approval and disbursement.",
    loanRange: "NGN 3,000 - NGN 500,000",
    interestRange: "5% - 14% monthly",
    tenure: "14 days - 6 months",
    website: "https://opay.com",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.opay.merchant"
  }
];

export const LoanProviders: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-4">CBN-Approved Loan Providers</h1>
      
      {/* Important Disclaimer Banner */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h2 className="font-bold text-red-700 text-lg">Important Disclaimer</h2>
            <p className="text-red-700 text-sm mt-1">
              <strong>Grantify does NOT offer loans directly.</strong> We are here to help individuals find legitimate loan options for informational and educational purposes. 
              The information provided below is for reference only. Always conduct your own research and read each lender's terms and conditions carefully before applying.
            </p>
          </div>
        </div>
      </div>

      {/* Advertica Banner Slot 1 */}
      <div className="my-8 flex justify-center">
        <AdverticaBanner />
      </div>

      {/* CBN Approval Notice */}
      <div className="bg-green-50 border border-green-200 p-4 mb-8 rounded-lg">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-grantify-green flex-shrink-0 mt-1" size={24} />
          <div>
            <h2 className="font-bold text-grantify-green text-lg">CBN-Approved Lenders</h2>
            <p className="text-gray-700 text-sm mt-1">
              The Central Bank of Nigeria (CBN) regulates digital lenders in Nigeria. The loan apps listed below are licensed or 
              operate through CBN-licensed financial institutions. Always verify a lender's status before sharing personal information.
            </p>
          </div>
        </div>
      </div>

      {/* Advice Section */}
      <div className="bg-blue-50 border border-blue-200 p-4 mb-8 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h2 className="font-bold text-blue-700 text-lg">Before You Borrow</h2>
            <ul className="text-gray-700 text-sm mt-2 space-y-1 list-disc ml-4">
              <li>Read and understand all terms, including interest rates and repayment schedules.</li>
              <li>Only borrow what you can afford to repay.</li>
              <li>Beware of loan apps that request upfront fees before disbursement - this is often a scam.</li>
              <li>Check reviews and complaints about the lender online.</li>
              <li>Protect your personal data and only share with verified lenders.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Loan Providers Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {cbnApprovedLenders.map((provider, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gray-50">
            <h3 className="font-bold text-lg text-grantify-green mb-2">{provider.name}</h3>
            <p className="text-gray-600 text-sm mb-3">{provider.description}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Loan Range:</span>
                <span className="font-medium text-gray-800">{provider.loanRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Interest Rate:</span>
                <span className="font-medium text-gray-800">{provider.interestRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tenure:</span>
                <span className="font-medium text-gray-800">{provider.tenure}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a 
                href={provider.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-grantify-green hover:underline"
              >
                <ExternalLink size={14} /> Visit Website
              </a>
              {provider.playStoreUrl && (
                <a 
                  href={provider.playStoreUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink size={14} /> Play Store
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Advertica Banner Slot 2 */}
      <div className="my-10 flex justify-center bg-gray-50 p-4 rounded-xl">
        <AdverticaBanner />
      </div>

      {/* Final Notes */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="font-bold text-yellow-800 mb-2">📋 Remember:</h3>
        <p className="text-yellow-800 text-sm">
          Interest rates, loan amounts, and terms may vary based on your credit profile and the lender's current policies. 
          This list is provided for informational purposes only. Grantify does not endorse any specific lender and is not responsible for 
          any transactions or agreements you make with these providers.
        </p>
      </div>

      <div className="mt-6 pt-6 border-t text-center">
        <p className="text-gray-500 text-sm">
          Information last updated: December 2024
        </p>
      </div>
    </div>
  );
};
