import React from 'react';

export const Terms: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-6">Terms and Conditions</h1>
      
      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">1. Introduction</h2>
          <p>Welcome to Grantify Nigeria. By accessing our website and using our loan/grant application services, you agree to comply with and be bound by the following terms and conditions. Please read them carefully.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">2. Eligibility</h2>
          <p>To apply for a loan or grant on Grantify, you must:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Be a Nigerian citizen or legal resident.</li>
            <li>Be at least 18 years of age.</li>
            <li>Possess a valid means of identification (NIN, PVC, or International Passport).</li>
            <li>Have a verifiable source of income or a registered small business.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">3. Loan Terms & Repayment</h2>
          <p>
            <strong>Interest Rate:</strong> All loans attract a flat interest rate of 5%.<br/>
            <strong>Duration:</strong> Standard loans must be repaid within 3 months. Fast-Track loans allow for up to 6 months.<br/>
            <strong>Repayment:</strong> Repayments are due on the agreed date. Failure to repay may result in penalties, reporting to credit bureaus, and legal action.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">4. Fast-Track Processing Fee</h2>
          <p>
            Users opting for the "Fast-Track" service acknowledge that a <strong>non-refundable processing fee of ₦20,000</strong> is applicable. This fee covers priority verification and expedited disbursement processing. Payment of this fee does not guarantee approval if verification fails.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">5. User Obligations</h2>
          <p>You agree to provide accurate, current, and complete information during the application process. Providing false information (e.g., incorrect Name, NIN, or Phone Number) constitutes fraud and will lead to immediate disqualification and potential blacklisting.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">6. Limitation of Liability</h2>
          <p>Grantify Nigeria shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services, including but not limited to damages for loss of profits, data, or other intangibles.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">7. Modifications</h2>
          <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Continued use of the service constitutes acceptance of the modified terms.</p>
        </section>
        
        <div className="pt-8 border-t">
          <p className="text-xs text-gray-500">Last Updated: October 2023</p>
        </div>
      </div>
    </div>
  );
};