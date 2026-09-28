'use client';

import { useState } from 'react';
import Link from 'next/link';

interface BillingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  credits: number;
  highlight?: boolean;
  features: string[];
}

const TIERS: BillingTier[] = [
  {
    id: 'starter',
    name: 'Open Core / Starter',
    price: '€0',
    period: 'forever',
    credits: 500,
    features: [
      'Single-tenant CRM',
      'Entity Resolution & Lead Triage',
      '500 monthly verification credits',
      'Community Slack support',
    ],
  },
  {
    id: 'business',
    name: 'Business Cloud',
    price: '€20',
    period: 'per user / month',
    credits: 10000,
    highlight: true,
    features: [
      'Managed Cloud hosting on Hetzner EU',
      'Multi-tenant team & RBAC controls',
      '10,000 monthly enrichment credits',
      'Privacy-preserving Consented Network',
      'Automated nightly database snapshots',
      'Priority SLA support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Dedicated',
    price: 'Custom',
    period: 'annual billing',
    credits: 100000,
    features: [
      'Dedicated VPC & Cloudflare Tunnel ingress',
      'Custom data sovereignty & GDPR erasure guarantees',
      'Unlimited seat licenses & custom API rate limits',
      '24/7 dedicated support engineer',
    ],
  },
];

export default function BillingPage() {
  const [balance, setBalance] = useState({ available: 9450, total: 10000, tier: 'Business Cloud' });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleRefill = (pack: string, credits: number) => {
    setLoadingAction(pack);
    setTimeout(() => {
      setBalance((prev) => ({ ...prev, available: prev.available + credits, total: prev.total + credits }));
      setLoadingAction(null);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">
              CDB Hub Cloud
            </span>
            <span className="text-xs text-slate-500 font-mono">v1.44.0-cloud</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Credits & SaaS Subscription</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your Cloud tenant tier, Stripe billing cycle, and privacy-preserving enrichment credits.
          </p>
        </div>

        {/* Quick balance card */}
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex items-center gap-6">
          <div>
            <div className="text-xs text-slate-400 font-medium">Available Credits</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {balance.available.toLocaleString()}
              <span className="text-xs text-slate-400 font-normal"> / {balance.total.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-800" />
          <div>
            <div className="text-xs text-slate-400 font-medium">Current Plan</div>
            <div className="text-sm font-semibold text-slate-100">{balance.tier}</div>
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Subscription Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-2xl p-6 transition flex flex-col justify-between ${
                tier.highlight
                  ? 'bg-slate-900 text-white shadow-xl ring-2 ring-emerald-500 relative'
                  : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 right-6 bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Active Plan
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{tier.name}</h3>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-3xl font-extrabold font-mono">{tier.price}</span>
                  <span className={`text-xs ${tier.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                    {tier.period}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-lg mb-6 flex items-center justify-between text-xs font-semibold font-mono ${
                    tier.highlight ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>Monthly Allowance:</span>
                  <span>{tier.credits.toLocaleString()} Credits</span>
                </div>

                <ul className="space-y-2.5 text-xs mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 shrink-0 ${tier.highlight ? 'text-emerald-400' : 'text-emerald-600'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={tier.highlight ? 'text-slate-300' : 'text-slate-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {tier.highlight ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                  >
                    Current Active Tier
                  </button>
                ) : (
                  <button
                    onClick={() => alert(`Upgrading to ${tier.name} via Stripe Checkout...`)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                  >
                    {tier.id === 'starter' ? 'Downgrade' : 'Contact Sales'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Refills */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Instant Credit Refills</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add non-expiring verification and entity resolution credits to your tenant account.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Powered by Stripe Billing Integration
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'pack-5k', name: '5,000 Credits', price: '€10', credits: 5000 },
            { id: 'pack-25k', name: '25,000 Credits', price: '€45', credits: 25000, discount: 'Save 10%' },
            { id: 'pack-100k', name: '100,000 Credits', price: '€160', credits: 100000, discount: 'Save 20%' },
          ].map((pack) => (
            <div
              key={pack.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 transition hover:shadow-md flex flex-col justify-between bg-slate-50/50"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-800">{pack.name}</span>
                  {pack.discount && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      {pack.discount}
                    </span>
                  )}
                </div>
                <div className="text-xl font-extrabold text-slate-900 font-mono mb-4">{pack.price}</div>
              </div>
              <button
                onClick={() => handleRefill(pack.id, pack.credits)}
                disabled={loadingAction === pack.id}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
              >
                {loadingAction === pack.id ? 'Processing...' : 'Buy Instant Pack'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
