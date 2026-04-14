# Evoltra Suite

A modern agency management platform built with React, Vite, Tailwind CSS, and Supabase.

## Features

- **Projects & Kanban**: Manage client projects with drag-and-drop task boards
- **Funnel Builder**: Drag-and-drop landing page builder with pre-built templates
- **Client Portal**: Invite clients to view project progress and communicate
- **Billing & Invoicing**: Stripe-powered subscriptions with embedded checkout
- **Team Management**: Invite members, assign roles, collaborate in real-time
- **Lead Capture**: Collect and manage leads from published funnels

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, TypeScript          |
| Styling    | Tailwind CSS, shadcn/ui             |
| Backend    | Supabase (Database, Auth, Edge Functions) |
| Payments   | Stripe (Embedded Checkout)          |
| Email      | Resend / Gmail SMTP                 |

---

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (or [Bun](https://bun.sh/))
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for DB migrations & function deployment)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/evoltra-suite.git
cd evoltra-suite
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Variables

The Supabase connection is already configured in `src/integrations/supabase/client.ts`. No `.env` file is strictly required.

If you prefer environment variables, create a `.env` file:

```env
VITE_SUPABASE_URL=https://nvqnbnzbnzgpuckconte.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4. Run the Dev Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Supabase CLI Setup (Optional)

The Supabase CLI lets you manage database migrations and edge functions from your terminal.

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (all platforms)
npm install -g supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Link to Your Project

```bash
supabase login
supabase link --project-ref nvqnbnzbnzgpuckconte
```

### Common CLI Commands

```bash
# Apply pending migrations to remote database
supabase db push

# Create a new migration file
supabase migration new my_change_name

# Deploy a specific edge function
supabase functions deploy function-name

# Deploy all edge functions
supabase functions deploy

# View edge function logs
supabase functions logs function-name

# Set secrets for edge functions
supabase secrets set KEY=value

# List current secrets
supabase secrets list
```

---

## Edge Function Secrets

The following secrets are configured **server-side on Supabase** and are **NOT** included in the GitHub repository. They are already set on the existing Supabase project. No action is needed unless you switch to a new project.

| Secret                 | Purpose                              | Where to Get It                                    |
|------------------------|--------------------------------------|----------------------------------------------------|
| `STRIPE_SECRET_KEY`    | Stripe payment processing            | [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys) |
| `RESEND_API_KEY`       | Email sending via Resend             | [Resend Dashboard](https://resend.com/api-keys)    |
| `GMAIL_USER`           | Gmail SMTP sender address            | Your Gmail email address                           |
| `GMAIL_APP_PASSWORD`   | Gmail SMTP app password              | [Google App Passwords](https://myaccount.google.com/apppasswords) |

### Setting Secrets (only needed for new Supabase projects)

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set GMAIL_USER=you@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx
```

---

## Project Structure

```
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── billing/       # Stripe checkout, invoices
│   │   ├── funnel/        # Funnel builder widgets
│   │   ├── kanban/        # Kanban board components
│   │   ├── layout/        # Navbar, sidebar, footer
│   │   ├── projects/      # Project cards, messages
│   │   ├── team/          # Team member management
│   │   └── ui/            # shadcn/ui base components
│   ├── contexts/          # React contexts (Auth, ClientAuth)
│   ├── data/              # Static data (funnel templates)
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Supabase client config
│   ├── pages/             # Route pages
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── functions/         # Edge functions (Deno)
│   │   ├── check-subscription/
│   │   ├── create-checkout/
│   │   ├── client-auth/
│   │   ├── client-messages/
│   │   ├── customer-portal/
│   │   ├── notify-lead/
│   │   ├── send-invite-email/
│   │   └── send-invoice-reminder/
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase configuration
└── public/                # Static assets
```

---

## Deployment


### Self-Hosted
1. Build: `npm run build`
2. Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.)
3. Ensure your hosting domain is allowed in Supabase → Auth → URL Configuration

---

## Editing Code



**Use GitHub Codespaces**: Click Code -> Codespaces -> New codespace on the repo page.

---

## Custom Domain


---

## License

Private. All rights reserved.
