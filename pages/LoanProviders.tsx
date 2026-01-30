import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdConfig, LoanProvider } from '../types';

export const LoanProviders: React.FC = () => {
  const [providers, setProviders] = useState<LoanProvider[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [providersData, adsData] = await Promise.all([
          ApiService.getLoanProviders(),
          ApiService.getAds()
        ]);
        setProviders(providersData);
        setAds(adsData);
      } catch (e) {
        console.error("Failed to load loan providers", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="bg-white p-4 md:p-8 rounded-lg shadow-sm max-w-5xl mx-auto">
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

      {/* Header Ad Slot */}
      {ads?.header && (
        <div className="my-8 flex justify-center">
          <AdSlot htmlContent={ads.header} label="Sponsor" />
        </div>
      )}

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

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-grantify-green" size={40} />
          <span className="ml-3 text-gray-500">Finding verified lenders...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {providers.map((provider, index) => (
            <div key={provider.id || index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gray-50 flex flex-col">
              <h3 className="font-bold text-lg text-grantify-green mb-2">{provider.name}</h3>
              <p className="text-gray-600 text-sm mb-3 flex-grow">{provider.description}</p>
              
              <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
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

              <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                <a 
                  href={provider.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-grantify-green text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700 transition-colors"
                >
                  <ExternalLink size={16} /> Get Loan Now
                </a>
                {provider.playStoreUrl && (
                  <a 
                    href={provider.playStoreUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink size={14} /> Play Store
                  </a>
                )}
              </div>
            </div>
          ))}
          
          {providers.length === 0 && !isLoading && (
            <div className="col-span-full py-10 text-center text-gray-500 italic">
              No providers found. Please check back later.
            </div>
          )}
        </div>
      )}

      {/* Body Ad Slot */}
      {ads?.body && (
        <div className="my-12 flex justify-center bg-gray-50 p-4 rounded-xl">
          <AdSlot htmlContent={ads.body} label="Sponsor" />
        </div>
      )}

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
          Information last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
};
