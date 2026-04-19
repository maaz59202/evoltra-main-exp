import { Link } from 'react-router-dom';
import { ArrowLeft } from '@/components/ui/icons';
import Footer from '@/components/layout/Footer';

const CookiePolicy = () => {
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

        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 11, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help us recognize your browser, remember your preferences, and improve your overall experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. How We Use Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies for authentication (keeping you logged in), analytics (understanding how you use our platform), and functionality (remembering your preferences and settings).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Types of Cookies We Use</h2>
            <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
              <li><strong>Essential Cookies:</strong> Required for the platform to function, such as authentication and security cookies.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand usage patterns and improve our services.</li>
              <li><strong>Preference Cookies:</strong> Remember your settings like theme and language preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some cookies are placed by third-party services that appear on our pages, such as analytics providers and payment processors. We do not control these cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can control and delete cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact us at privacy@evoltra.com.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
