import React from 'react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdConfig } from '../types';

export const Privacy: React.FC = () => {
  const [ads, setAds] = React.useState<AdConfig | null>(null);

  React.useEffect(() => {
    ApiService.getAds().then(setAds).catch(console.error);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm max-w-4xl mx-auto border border-gray-100 dark:border-gray-800">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-6">Privacy Policy</h1>
      
      {/* Header Ad Slot */}
      {ads?.header && (
        <div className="my-8 flex justify-center">
          <AdSlot htmlContent={ads.header} label="Sponsor" />
        </div>
      )}

      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        {/* Body Ad Slot */}
        {ads?.body && (
          <div className="my-8 flex justify-center">
            <AdSlot htmlContent={ads.body} label="Sponsor" />
          </div>
        )}
        
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">1. Data Collection</h2>
          <p>
            We collect information you choose to provide and limited technical data needed to operate the platform. The exact
            fields may vary based on what you submit (for example, a match request, a contact message, or a review).
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Contact details (such as name, phone number, and optional email address).</li>
            <li>Basic profile and request details you enter (such as business details and funding preferences).</li>
            <li>Content you submit (such as reviews, messages, and support requests).</li>
            <li>Technical data (such as IP address, device/browser info, and usage logs) for security and reliability.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">2. Use of Information</h2>
          <p>Your data is used for the following purposes:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>To provide matching, recommendations, and platform features.</li>
            <li>To communicate with you about your requests, updates, and support.</li>
            <li>To prevent fraud, abuse, and security incidents.</li>
            <li>To improve performance, reliability, and user experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share information in limited cases, such as:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Service providers who help us run the site (hosting, database, analytics, and error monitoring).</li>
            <li>Advertising partners (generally in aggregated or pseudonymous form, depending on the integration).</li>
            <li>Legal or safety reasons (to comply with law, enforce policies, or protect users).</li>
          </ul>
          <p className="mt-2">
            If you click through to a third-party providers website, their privacy policy applies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">4. Data Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational safeguards to protect data. No method of storage
            or transmission is completely secure, so we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">5. Your Rights</h2>
          <p>
            You may request access, correction, or deletion of personal data we hold about you (subject to legal, security,
            or operational requirements). You can also request help removing content youve posted.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">6. Contact Us</h2>
          <p>If you have questions about this privacy policy or our data practices, please contact our support team.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">7. Advertising & Revenue</h2>
          <p className="mb-2">
            <strong>Advertising helps us keep Grantify free for you.</strong> Here's what you should know about how we use advertising:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>We display advertisements throughout our platform to generate revenue.</li>
            <li>We may use cookies or similar technologies to measure performance and improve relevance.</li>
            <li>We do NOT sell your personal information (phone number or email address) to advertisers.</li>
            <li>Your data helps us operate the service and connect you with relevant opportunities.</li>
          </ul>
          <p className="mt-3 text-green-700 dark:text-green-300 font-medium">
            Your phone number and optional email address are handled with care and used primarily to communicate with you about
            your requests and relevant updates.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Disclaimer</h2>
          <p>
            <strong>Grantify does NOT offer loans or grants directly.</strong> We help people find reputable opportunities and connect with
            third-party providers. Any agreement is strictly between you and the provider.
          </p>
        </section>
        
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Effective Date: March 2026</p>
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
