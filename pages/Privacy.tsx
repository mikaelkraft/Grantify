import React from 'react';

export const Privacy: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-6">Privacy Policy</h1>
      
      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">1. Data Collection</h2>
          <p>At Grantify, we prioritize the protection of your personal data. We collect information necessary to process your loan applications and verify your identity, including:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Personal identification (Name, Age, Address).</li>
            <li>Contact details (Phone Number, Email Address).</li>
            <li>Government-issued ID numbers (NIN, BVN - strictly for verification).</li>
            <li>Financial information regarding your business or income source.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">2. Use of Information</h2>
          <p>Your data is used for the following purposes:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>To assess your eligibility for loans and grants.</li>
            <li>To communicate with you regarding your application status.</li>
            <li>To comply with regulatory requirements mandated by Nigerian financial laws.</li>
            <li>To improve our platform and user experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">3. Data Sharing</h2>
          <p>We do not sell your personal data. However, we may share your information with:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Credit Bureaus: To check credit history or report defaults.</li>
            <li>Verification Services: To authenticate your NIN and identity.</li>
            <li>Law Enforcement: If required by law or to prevent fraud.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">4. Data Security</h2>
          <p>We employ industry-standard security measures, including encryption and secure server infrastructure, to protect your data from unauthorized access, alteration, or disclosure. While we strive to protect your data, no method of transmission over the internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">5. Your Rights</h2>
          <p>You have the right to request access to the personal data we hold about you, request corrections to inaccurate data, or request deletion of your data (subject to legal retention requirements).</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">6. Contact Us</h2>
          <p>If you have questions about this privacy policy or our data practices, please contact our support team.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">7. Advertising & Revenue</h2>
          <p className="mb-2">
            <strong>We love ads! 💰</strong> Advertising is how we keep Grantify running and free for you. Here's what you should know:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>We display advertisements throughout our platform to generate revenue.</li>
            <li>We may share anonymized, non-personal data with advertising partners to improve ad relevance.</li>
            <li>We do NOT sell your personal information (phone number or email address) to advertisers.</li>
            <li>Your data is used to improve our services and help connect you with relevant financial products.</li>
          </ul>
          <p className="mt-3 text-green-700 font-medium">
            Rest assured – we mean no harm to your shared data. Your phone number and optional email address are handled with care and used only to communicate with you about your applications and relevant updates.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Disclaimer</h2>
          <p>
            <strong>Grantify does NOT offer loans directly.</strong> We help individuals find legitimate loan options for informational purposes. 
            You will see advertisements on our platform – this is how we sustain our services. We can show you the best loan offering services 
            and connect you with CBN-approved lenders, but all loan agreements are between you and the respective financial institution.
          </p>
        </section>
        
        <div className="pt-8 border-t">
          <p className="text-xs text-gray-500">Effective Date: June 2025</p>
        </div>
      </div>
    </div>
  );
};
