export default function Privacy() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm font-medium mb-8 hover:underline">
          ← Back to Spendly
        </a>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. What We Collect</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3">When you use Spendly, we collect the following information:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li><strong className="text-gray-800 dark:text-gray-200">Account information:</strong> name, email address, and encrypted password</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Financial data:</strong> expenses, income, budgets, savings goals, debts, and subscriptions you enter manually</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Preferences:</strong> currency, dark mode setting, and account type</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Usage data:</strong> basic analytics to improve the Service (no tracking pixels or ad networks)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. How We Use Your Data</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3">Your data is used solely to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Provide and operate the Spendly service</li>
              <li>Generate AI-powered insights based on your financial data</li>
              <li>Send transactional emails (e.g. email verification, password reset)</li>
              <li>Improve the app's features and performance</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-3">We do <strong className="text-gray-800 dark:text-gray-200">not</strong> sell, rent, or share your personal or financial data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. AI Features & Data</h2>
            <p className="text-gray-600 dark:text-gray-400">When you use AI Insights, your financial summary (totals and categories — not raw transaction descriptions) is sent to our AI provider to generate responses. This data is processed securely and is not stored by the AI provider beyond the request.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. Data Storage & Security</h2>
            <p className="text-gray-600 dark:text-gray-400">Your data is stored in a secure, encrypted PostgreSQL database hosted on Render. Passwords are hashed using industry-standard algorithms. Access tokens are JWT-based and expire automatically. We apply reasonable technical and organizational measures to protect your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. Third-Party Services</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3">Spendly uses the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li><strong className="text-gray-800 dark:text-gray-200">Render</strong> — cloud hosting for the backend and database</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Anthropic Claude</strong> — AI model for financial insights</li>
              <li><strong className="text-gray-800 dark:text-gray-200">NewsAPI</strong> — financial news headlines on the dashboard</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Resend</strong> — transactional email delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Your Rights</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li><strong className="text-gray-800 dark:text-gray-200">Access</strong> — view all data we hold about you via your Profile</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Export</strong> — download your transaction history as CSV from Reports</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Delete</strong> — permanently delete your account and all associated data from the Profile page</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Correct</strong> — update any inaccurate data directly in the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Cookies & Local Storage</h2>
            <p className="text-gray-600 dark:text-gray-400">Spendly uses browser localStorage to store your authentication token, user preferences (currency, dark mode), and game high scores. We do not use tracking cookies or third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. Children's Privacy</h2>
            <p className="text-gray-600 dark:text-gray-400">Spendly is not intended for users under the age of 13. We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Changes to This Policy</h2>
            <p className="text-gray-600 dark:text-gray-400">We may update this Privacy Policy from time to time. We will notify users of material changes via email or an in-app notice. Continued use of the Service constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">10. Contact</h2>
            <p className="text-gray-600 dark:text-gray-400">For any privacy-related questions or requests, contact us at <a href="mailto:support@spendly.app" className="text-violet-600 dark:text-violet-400 hover:underline">support@spendly.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
