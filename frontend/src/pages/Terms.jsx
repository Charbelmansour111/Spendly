export default function Terms() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm font-medium mb-8 hover:underline">
          ← Back to Spendly
        </a>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">Last updated: April 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Spendly ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
            <p>Spendly is a personal finance management application that allows users to track expenses, set budgets, manage savings goals, and gain AI-powered insights into their spending habits. The Service is provided for personal, non-commercial use.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. User Accounts</h2>
            <p>You must create an account to use Spendly. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. User Data</h2>
            <p>All financial data you enter into Spendly is yours. We do not sell your personal financial data to third parties. We store your data securely and use it solely to provide and improve the Service. See our <a href="/privacy" className="text-violet-600 dark:text-violet-400 hover:underline">Privacy Policy</a> for details.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. AI-Powered Features</h2>
            <p>Spendly uses AI to provide financial insights and recommendations. These insights are informational only and do not constitute financial advice. Always consult a qualified financial advisor before making significant financial decisions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-gray-600 dark:text-gray-400">
              <li>Violate any applicable law or regulation</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Transmit malicious code or interfere with the Service's operation</li>
              <li>Use the Service for commercial purposes without written consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranty of any kind. Spendly does not guarantee the accuracy, completeness, or reliability of any financial calculations or AI-generated insights. Use the Service at your own risk.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Spendly shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including any financial decisions made based on the Service's outputs.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Account Termination</h2>
            <p>You may delete your account at any time from the Profile page. We reserve the right to suspend or terminate accounts that violate these Terms. Upon termination, your data will be permanently deleted.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes your acceptance of the new Terms. We will make reasonable efforts to notify users of significant changes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">11. Contact</h2>
            <p>If you have questions about these Terms, please contact us at <a href="mailto:support@spendly.app" className="text-violet-600 dark:text-violet-400 hover:underline">support@spendly.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
