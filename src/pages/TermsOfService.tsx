import { Link } from 'react-router-dom';
import { ArrowLeft } from '@/components/ui/icons';
import Footer from '@/components/layout/Footer';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-12 flex-1 max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 11, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Evoltra, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use Evoltra for any unlawful purpose or in violation of these terms. You may not attempt to gain unauthorized access to our systems, interfere with other users, or transmit harmful content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Subscription & Billing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid features are billed on a recurring basis. You authorize us to charge your payment method for all fees incurred. You may cancel your subscription at any time, effective at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of Evoltra are owned by us and protected by intellectual property laws. You retain ownership of any content you create using our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Evoltra is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these terms. Upon termination, your right to use the service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact us at legal@evoltra.com.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;
