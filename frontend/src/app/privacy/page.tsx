import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Style It Yourself',
  description:
    'How Style It Yourself and its browser extension collect, use, and protect your data.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-[clamp(22px,2.4vw,30px)] leading-tight tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-ink-2 leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[720px] px-6 py-20 max-md:py-14">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          Style It Yourself
        </span>
        <h1 className="mt-3 font-display text-[clamp(34px,5vw,52px)] leading-[0.98] tracking-[-0.02em] text-ink">
          Privacy Policy
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          Last updated August 2026
        </p>

        <hr className="my-8 border-t border-ink" />

        <p className="text-ink-2 leading-relaxed">
          Style It Yourself is a styling app that helps you build outfits from
          clothes you own. This policy explains what the app and its Chrome
          extension collect, why, and how it is handled. If anything here is
          unclear, reach us at the address at the bottom.
        </p>

        <Section title="What we collect">
          <p>Account information. When you sign up we store your email address and
          the login session that keeps you signed in. Authentication is handled by
          Supabase.</p>
          <p>Your closet. The clothing items, colors, outfits, and any photos you
          upload for virtual try-on are stored in your account so the app can show
          them back to you and build outfits.</p>
          <p>Captured products. When you use the browser extension on a product
          page and choose to capture an item, the extension reads that page’s
          product details (image, title, brand, price, and page address) and sends
          them to our backend to save or match the item. The extension reads a page
          only when you ask it to, and it contacts only Style It Yourself.</p>
        </Section>

        <Section title="How we use it">
          <p>We use your data only to run the product: to store your closet, score
          and recommend outfit combinations, generate virtual try-on images from a
          photo you provide, and keep you signed in. We do not use your data for
          advertising, and we do not sell or rent it to anyone.</p>
        </Section>

        <Section title="Who processes it">
          <p>We rely on a small set of service providers that process data on our
          behalf: Supabase for the database, authentication, and file storage, and
          Google Gemini for generating virtual try-on images from the photo and
          item images you submit. Hosting is provided by Vercel and Google Cloud.
          These providers process data only to deliver their part of the service.</p>
        </Section>

        <Section title="The browser extension">
          <p>The extension stores your login session locally in your browser
          (chrome.storage.local) so you stay connected between uses. It reads a web
          page’s content only on the specific page you choose to capture from, and
          only when you act. It does not track your browsing, run in the background
          on other sites, or read pages you have not asked it to.</p>
        </Section>

        <Section title="Your choices">
          <p>You can delete individual items and outfits from your closet at any
          time inside the app. You can disconnect the extension by signing out or
          removing it from your browser. To delete your account and the data
          associated with it, contact us at the address below and we will remove it.</p>
        </Section>

        <Section title="Data retention and security">
          <p>We keep your data for as long as your account is active. Access to the
          backend and database is restricted, and traffic is encrypted in transit.
          No system is perfectly secure, but we limit what we collect to what the
          product needs.</p>
        </Section>

        <Section title="Changes">
          <p>If we change this policy we will update the date at the top of this
          page. Continued use after a change means you accept the updated policy.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests about your data: {' '}
            <a
              href="mailto:privacy@styleityourself.ca"
              className="text-ink underline underline-offset-2 hover:text-accent"
            >
              privacy@styleityourself.ca
            </a>
          </p>
        </Section>
      </div>
    </div>
  )
}
