import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { UserRole } from '../../types';

const ONBOARDING_COMPLETE_KEY = '247_onboarding_complete';

type OnboardingChoice = 'CUSTOMER' | 'RIDER' | 'ADMIN';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({ children }) => {
  const { loading: authLoading, isAuthenticated, profile } = useAuth();
  const { role } = useStore();

  const [complete, setComplete] = useState(
    () => localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true'
  );
  const [choice, setChoice] = useState<OnboardingChoice | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-safe-screen bg-stone-950 text-stone-100 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="font-display text-5xl font-black tracking-tight text-amber-400">
            247
          </div>
          <p className="mt-3 text-sm text-stone-500">Initializing...</p>
        </div>
      </div>
    );
  }

  if (complete || (isAuthenticated && profile)) {
    return <>{children}</>;
  }

  const finish = (selectedRole: OnboardingChoice) => {
    setChoice(selectedRole);
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setComplete(true);
  };

  if (choice) {
    const roleCopy: Record<OnboardingChoice, { title: string; body: string }> = {
      CUSTOMER: {
        title: 'Customer',
        body: 'Browse the storefront, build your cart, place orders, and track deliveries.'
      },
      RIDER: {
        title: 'Rider',
        body: 'Access the rider experience for available deliveries, pickups, drop-offs, and earnings.'
      },
      ADMIN: {
        title: 'Admin',
        body: 'Administrative access requires an Admin Pass before the operations interface can be opened.'
      }
    };

    return (
      <div className="min-h-safe-screen bg-stone-950 text-stone-100 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="font-display text-6xl font-black tracking-tight text-amber-400">
              247
            </div>
            <div className="mt-5 inline-flex items-center rounded-full border border-stone-800 bg-stone-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              {roleCopy[choice].title}
            </div>
            <h1 className="font-display mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
              {choice === 'ADMIN' ? 'Admin access' : `Welcome, ${roleCopy[choice].title.toLowerCase()}`}
            </h1>
            <p className="mt-4 text-stone-400 leading-relaxed">
              {roleCopy[choice].body}
            </p>
          </div>

          <div className="space-y-3">
            {choice === 'ADMIN' ? (
              <button
                type="button"
                onClick={completeOnboarding}
                className="w-full rounded-2xl border border-amber-500/40 bg-amber-500 px-5 py-4 font-bold text-stone-950 transition active:scale-[0.99]"
              >
                Continue to Admin Pass
              </button>
            ) : (
              <button
                type="button"
                onClick={completeOnboarding}
                className="w-full rounded-2xl border border-amber-500/40 bg-amber-500 px-5 py-4 font-bold text-stone-950 transition active:scale-[0.99]"
              >
                Enter 247
              </button>
            )}

            <button
              type="button"
              onClick={() => setChoice(null)}
              className="w-full rounded-2xl border border-stone-800 bg-stone-900 px-5 py-4 font-semibold text-stone-300 transition active:scale-[0.99]"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-safe-screen bg-stone-950 text-stone-100 flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="font-display text-7xl font-black tracking-tight text-amber-400">
            247
          </div>
          <h1 className="font-display mt-6 text-3xl sm:text-4xl font-bold tracking-tight">
            What are you here to do?
          </h1>
          <p className="mt-3 text-stone-500">
            Choose your path into 247.
          </p>
        </div>

        <div className="space-y-3">
          {([
            ['CUSTOMER', 'Customer', 'Shop, order, and track deliveries.'],
            ['RIDER', 'Rider', 'Deliver orders and manage your rider work.'],
            ['ADMIN', 'Admin', 'Operate and manage the 247 system.']
          ] as const).map(([value, title, description]) => (
            <button
              key={value}
              type="button"
              onClick={() => finish(value)}
              className="group w-full rounded-2xl border border-stone-800 bg-stone-900/80 p-5 text-left transition hover:border-amber-500/50 hover:bg-stone-900 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-display text-xl font-bold text-stone-100">
                    {title}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-stone-500">
                    {description}
                  </div>
                </div>
                <span className="text-xl text-stone-700 transition group-hover:text-amber-400">
                  →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingGate;
