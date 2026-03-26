import React from 'react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdConfig } from '../types';

export const Terms: React.FC = () => {
  const [ads, setAds] = React.useState<AdConfig | null>(null);

  React.useEffect(() => {
    ApiService.getAds().then(setAds).catch(console.error);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm max-w-4xl mx-auto border border-gray-100 dark:border-gray-800">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-6">Terms and Conditions</h1>
      
      {/* Header Ad Slot */}
      {ads?.header && (
        <div className="my-8 flex justify-center">
          <AdSlot htmlContent={ads.header} label="Sponsor" />
        </div>
      )}

      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">1. Introduction</h2>
          <p>
            Welcome to Grantify. By accessing or using our website and services, you agree to these Terms and Conditions.
            If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">2. Eligibility</h2>
          <p>To use Grantify, you must:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Be at least 18 years of age.</li>
            <li>Provide accurate information when you submit a request, application, review, or message.</li>
            <li>Use the service in compliance with applicable laws and these terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">3. What Grantify Does (and Does Not Do)</h2>
          <p>
            <strong>Grantify does not provide loans or grants directly.</strong> We help you discover and connect with third-party
            programs, lenders, and grant opportunities. Any product terms (rates, fees, eligibility, repayment schedules, and
            approvals) are set by the third-party provider.
          </p>
          <p className="mt-2">
            You are responsible for reviewing the providers own terms before applying or accepting any offer.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">4. Accuracy & Verification</h2>
          <p>
            You agree to provide accurate, current, and complete information. Some providers may require identity or business
            verification. Grantify may also perform basic checks to reduce spam, fraud, and abuse.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">5. User Obligations</h2>
          <p>
            You must not misuse the platform, including by attempting to access accounts you do not own, scraping restricted
            areas, submitting malicious content, or impersonating others. We may suspend or terminate access if we believe the
            service is being abused.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">6. Limitation of Liability</h2>
          <p>
            Grantify is provided on an as is and as available basis. To the maximum extent permitted by law, we are not
            liable for indirect, incidental, or consequential damages arising from your use of the service, or from third-party
            providers decisions, products, content, availability, or outcomes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">7. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. Changes take effect when posted. Continued use of the service after
            an update means you accept the revised terms.
          </p>
        </section>
        
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated: March 2026</p>
        </div>
      </div>

      {/* Footer Ad Slot */}
      {ads?.footer && (
        <div className="mt-12 flex justify-center bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <AdSlot htmlContent={ads.footer} label="Sponsor" />
        </div>
      )}

    </div>
  );
};
