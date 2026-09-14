import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Bike, 
  ShieldCheck, 
  Sparkles, 
  BatteryCharging, 
  MapPin, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Zap, 
  Compass, 
  Gift, 
  Sliders, 
  Navigation, 
  Radio, 
  Check, 
  X,
  Layers,
  ChevronRight
} from 'lucide-react';
import { UserRole } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

interface OnboardingSequenceProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
}

interface StepContent {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  features: {
    label: string;
    detail: string;
    icon: React.ElementType;
  }[];
  previewComponent?: React.ReactNode;
}

export const OnboardingSequence: React.FC<OnboardingSequenceProps> = ({
  isOpen,
  onClose,
  initialRole
}) => {
  const { role: currentRole, setRole, addToast, enableCleanBuild } = useStore();
  const { quickDemoLogin } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || currentRole || 'CUSTOMER');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [hasChosenRole, setHasChosenRole] = useState<boolean>(!!initialRole);

  // User preferences configured during onboarding
  const [customerNeighborhood, setCustomerNeighborhood] = useState('Downtown Elm St Corridor');
  const [customerSmsAlerts, setCustomerSmsAlerts] = useState(true);
  const [riderVehicleType, setRiderVehicleType] = useState('Heavy Cargo e-Bike (250W)');
  const [riderShiftReady, setRiderShiftReady] = useState(true);
  const [adminDefaultView, setAdminDefaultView] = useState('Live Fleet Radar');
  const [adminAudiblePings, setAdminAudiblePings] = useState(true);

  if (!isOpen) return null;

  // Complete onboarding and launch clean build
  const handleFinishOnboarding = async () => {
    await enableCleanBuild();
    localStorage.setItem('247_onboarding_completed', 'true');
    localStorage.setItem('247_selected_role', selectedRole);
    localStorage.setItem('trader24_onboarding_completed', 'true');
    localStorage.setItem('trader24_selected_role', selectedRole);
    setRole(selectedRole);

    try {
      await quickDemoLogin(selectedRole);
    } catch (err) {
      console.warn('Silent identity initialization fallback:', err);
    }

    addToast(
      'Clean Build Active',
      `Welcome to 247 Manchester. Onboarding complete as ${selectedRole}.`,
      'success'
    );

    onClose();
  };

  const customerSteps: StepContent[] = [
    {
      title: '24/7 Rapid Manchester Delivery',
      subtitle: 'Bicycle Messenger Rapid Transit Across City Sectors',
      badge: 'SPEED & REACH',
      icon: Bike,
      description:
        '247 operates 24 hours a day, 365 days a year. Our couriers pilot custom cargo bicycles and mobile carts across Manchester, New Hampshire with a guaranteed target delivery within 60 minutes or less.',
      features: [
        {
          label: 'Within 60 Min or Less Guarantee',
          detail: 'Hyper-local staging hubs ensure couriers roll out instantly upon dispatch.',
          icon: Clock
        },
        {
          label: 'All-Weather Mobile Staging',
          detail: 'Rain, snow, or heat, our riders cover Elm St, Millyard, Rimmon Heights, and South End.',
          icon: MapPin
        },
        {
          label: 'Live GPS Courier Tracker',
          detail: 'Track your courier turn-by-turn with contactless drop-off options and 4-digit PIN verification.',
          icon: Navigation
        }
      ]
    },
    {
      title: 'Free Essential Supply Program',
      subtitle: 'Community Supply Fund Sponsorship on Every Order',
      badge: 'MUTUAL AID',
      icon: Gift,
      description:
        'Nobody goes without fundamental life supplies. Every single qualifying order lets you select one free community essential item, funded directly through the Manchester Community Supply Fund.',
      features: [
        {
          label: '1 Free Choice Per Order',
          detail: 'Choose bottled spring water, protein snacks, wet wipes, hand warmers, or blister care.',
          icon: Sparkles
        },
        {
          label: 'Community Sponsored',
          detail: 'Local partners and sponsors pool funds to subsidize essential goods for anyone in need.',
          icon: CheckCircle2
        },
        {
          label: 'Dignified & Zero Friction',
          detail: 'Integrated right into the checkout cart with zero paperwork or approval hurdles.',
          icon: Check
        }
      ]
    },
    {
      title: 'Tesla Hot-Swap Battery Network',
      subtitle: 'BYO Rechargeable Powerbank Courier & Hub Exchange',
      badge: 'ENERGY HARDWARE',
      icon: BatteryCharging,
      description:
        'Never run out of phone power on the street. With the Tesla Pass or Combined Pass ($20–$30/mo), hand over your depleted battery pack and exchange it for a tested, 100% certified full unit via our mobile bicycle couriers or at our 247 Base Hub.',
      features: [
        {
          label: '2k to 20k mAh Pack Sizes',
          detail: 'Standardized bay slots for 2,000, 5,000, 10,000, and 20,000 mAh rechargeable packs.',
          icon: Zap
        },
        {
          label: 'Express Courier & Hub Swaps',
          detail: 'Request a mobile courier swap anywhere on your route or reserve a ready pack at the 247 Base Hub.',
          icon: Clock
        },
        {
          label: 'Street Hand-Over Option',
          detail: 'Bicycle couriers can also bring a fresh pack directly to your street location for a hot swap.',
          icon: Bike
        }
      ]
    },
    {
      title: 'Personalized Setup & Clean Launch',
      subtitle: 'Set Delivery Preferences & Enter 247 Store',
      badge: 'READY TO ROLL',
      icon: ShoppingBag,
      description:
        'Configure your default neighborhood in Manchester for fast checkout routing. All demo badges and mock test states will be dismissed, launching you directly into the clean production build.',
      features: [
        {
          label: 'Natural Language AI Assistant',
          detail: 'Use "Send Rider" to describe what you need in plain English and auto-build your cart.',
          icon: Radio
        },
        {
          label: 'Member Pricing & Credit',
          detail: 'Trader Pass members receive $20 monthly store credit and free delivery on all orders.',
          icon: Sparkles
        }
      ]
    }
  ];

  const riderSteps: StepContent[] = [
    {
      title: 'Cargo Courier Cockpit',
      subtitle: 'Mobile Command Center for Bicycle Couriers',
      badge: 'MISSION CONTROL',
      icon: Bike,
      description:
        'Your industrial cockpit designed specifically for street cycling. Track active battery percentage, cargo payload capacity, daily completed drop-offs, and shift clock-in times.',
      features: [
        {
          label: 'Shift Status & Availability',
          detail: 'Toggle between AVAILABLE, ON BREAK, or OFF SHIFT with instant dispatcher sync.',
          icon: Clock
        },
        {
          label: 'Payload & Cargo Tracking',
          detail: 'Monitor cart weight distribution and insulated tote capacity in real-time.',
          icon: Layers
        },
        {
          label: 'Direct Earnings Tally',
          detail: 'Transparent per-delivery payouts, speed bonuses, and 100% customer tips retained.',
          icon: Sparkles
        }
      ]
    },
    {
      title: 'Live Dispatch Queue & 60-Min SLA',
      subtitle: 'Rapid Response Queue with Countdown Timers',
      badge: 'DISPATCH RADAR',
      icon: Radio,
      description:
        'Orders routed to you based on your proximity in Manchester. Review items, destination sector, and customer notes before one-tap job acceptance.',
      features: [
        {
          label: 'Within 60 Min or Less SLA Timer',
          detail: 'Real-time countdown keeps riders paced for our within 60 min or less guarantee.',
          icon: Clock
        },
        {
          label: 'Order Details & Staging',
          detail: 'Clear itemized loadout manifests so you never miss an essential or free item.',
          icon: ShoppingBag
        },
        {
          label: 'Customer Drop-Off Notes',
          detail: 'Specific delivery access instructions, building codes, and safety requests.',
          icon: MapPin
        }
      ]
    },
    {
      title: 'GPS Navigation & Proof-of-Delivery',
      subtitle: 'Turn-by-Turn Route Guidance & Contactless PIN',
      badge: 'VERIFICATION',
      icon: Navigation,
      description:
        'Follow optimized bike corridors along Elm St and the Millyard trails. Complete deliveries securely with dual-factor customer PIN or photo verification.',
      features: [
        {
          label: 'Secure 4-Digit Customer PIN',
          detail: 'Customer provides their secret PIN upon drop-off to eliminate misdelivered parcels.',
          icon: ShieldCheck
        },
        {
          label: 'Photo Proof of Delivery',
          detail: 'Capture doorstep or street hand-over snapshots directly from your phone camera.',
          icon: CheckCircle2
        },
        {
          label: 'Live Telemetry Broadcasting',
          detail: 'Automatic position beacon keeps dispatch informed of your transit status.',
          icon: Radio
        }
      ]
    },
    {
      title: 'Street Battery Swaps & Clean Launch',
      subtitle: 'Tesla Battery Relays & Dispatch Readiness',
      badge: 'HARDWARE LOGISTICS',
      icon: BatteryCharging,
      description:
        'Riders carry charged replacement batteries in dedicated insulated cart bays. Perform on-the-spot battery swaps for members and return discharged packs to the 247 Base Hub.',
      features: [
        {
          label: 'Fleet Battery Relays',
          detail: 'Restock charged packs from 247 Base Hub and carry certified units on active runs.',
          icon: Zap
        },
        {
          label: 'Street Hand-Over Verification',
          detail: 'Inspect returned pack cell condition and hand over 100% full replacement in 30 seconds.',
          icon: CheckCircle2
        }
      ]
    }
  ];

  const adminSteps: StepContent[] = [
    {
      title: 'Central Dispatch & Live Fleet Radar',
      subtitle: 'City-Wide Telemetry of Bicycles, Orders & Micro-Depots',
      badge: 'OPERATIONS',
      icon: Radio,
      description:
        'Full situational awareness of Manchester. Monitor every cargo bicycle in motion, pending order pickups, active route waypoints, and mobile fleet inventory.',
      features: [
        {
          label: 'Live Multi-Courier Radar',
          detail: 'Real-time position markers, speed, heading, and battery telemetry across the city.',
          icon: Navigation
        },
        {
          label: 'Interactive Map Overlay',
          detail: 'Filter by active riders, delivery destinations, and 4 battery exchange hubs.',
          icon: MapPin
        },
        {
          label: 'Instant Courier Broadcasts',
          detail: 'Send high-priority audio dispatch pings and route advisories directly to rider cockpits.',
          icon: Radio
        }
      ]
    },
    {
      title: 'Order Dispatch & Inventory Allocation',
      subtitle: 'Atomic Stock Deductions & Warehouse Transfers',
      badge: 'SUPPLY CHAIN',
      icon: ShoppingBag,
      description:
        'Manage incoming customer orders, reassign couriers on the fly, and oversee inventory across mobile carts and the central resupply warehouse.',
      features: [
        {
          label: 'Atomic Inventory Deductions',
          detail: 'Purchases and free essential allocations decrement live stock counts with zero race conditions.',
          icon: Layers
        },
        {
          label: 'Automated Reorder Alerts',
          detail: 'Real-time low stock warnings trigger replenishment from central resupply.',
          icon: CheckCircle2
        },
        {
          label: 'Merchant Compliance Review',
          detail: 'Verify age restrictions (18+/21+) and delivery compliance before goods enter the public catalog.',
          icon: ShieldCheck
        }
      ]
    },
    {
      title: 'Unit Economics & Cart Margin Optimizer',
      subtitle: 'Profitability Modeling & Break-Even Simulation',
      badge: 'FINANCIAL INTELLIGENCE',
      icon: Sliders,
      description:
        'Fine-tune business sustainability. Analyze gross and net margins per order, simulate delivery fee elasticities, and run AI-assisted cart optimization.',
      features: [
        {
          label: 'Real-Time Margin Diagnostics',
          detail: 'Track cost of goods sold, courier wages, packaging, and net contribution margin.',
          icon: Sparkles
        },
        {
          label: 'Break-Even & Scenario Simulator',
          detail: 'Simulate the impact of changing delivery fees, order volumes, or pass subscription prices.',
          icon: Clock
        },
        {
          label: 'Community Supply Fund Audit',
          detail: 'Monitor sponsor balance, donor contributions, and subsidized essential allocations.',
          icon: Gift
        }
      ]
    },
    {
      title: 'Fleet Diagnostics & Clean Launch',
      subtitle: 'Hardware Telemetry & Immutable Audit Logs',
      badge: 'GOVERNANCE',
      icon: ShieldCheck,
      description:
        'Review mobile fleet status, cargo capacity, battery pack reserves, and courier health telemetry before rolling out.',
      features: [
        {
          label: 'Hardware Telemetry',
          detail: 'Real-time monitoring of available 2k, 5k, 10k, and 20k mAh packs across active couriers and 247 Base Hub.',
          icon: BatteryCharging
        },
        {
          label: 'Immutable Audit Trail',
          detail: 'Every stock movement, price adjustment, and role action is logged with user attribution.',
          icon: CheckCircle2
        }
      ]
    }
  ];

  const currentSteps = 
    selectedRole === 'CUSTOMER' ? customerSteps :
    selectedRole === 'RIDER' ? riderSteps :
    adminSteps;

  const currentStep = currentSteps[currentStepIndex] || currentSteps[0];
  const isLastStep = currentStepIndex === currentSteps.length - 1;

  return (
    <div
      id="onboarding-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/90 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-tight text-white">247 MANCHESTER</span>
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  SYSTEM ONBOARDING
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono-code">
                Rapid Cargo-Bicycle Micro-Store &amp; Courier Operating System
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-white border border-stone-800 flex items-center justify-center transition-colors"
            title="Skip Onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Persona Switcher Tabs if in walkthrough mode */}
        {hasChosenRole && (
          <div className="px-5 py-2.5 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono-code text-stone-400 uppercase tracking-wider mr-1">
                Active Tour:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('CUSTOMER');
                  setCurrentStepIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all ${
                  selectedRole === 'CUSTOMER'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('RIDER');
                  setCurrentStepIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all ${
                  selectedRole === 'RIDER'
                    ? 'bg-sky-500 text-stone-950 shadow-sm'
                    : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Bike className="w-3 h-3" />
                <span>Rider</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('ADMIN');
                  setCurrentStepIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all ${
                  selectedRole === 'ADMIN'
                    ? 'bg-purple-500 text-stone-950 shadow-sm'
                    : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {currentSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStepIndex
                      ? 'w-6 bg-amber-400'
                      : i < currentStepIndex
                      ? 'w-2 bg-stone-600'
                      : 'w-2 bg-stone-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {!hasChosenRole ? (
            /* STEP 0: Role Selection Screen */
            <div className="space-y-5">
              <div className="text-center max-w-lg mx-auto space-y-2">
                <span className="text-xs font-mono-code font-bold text-amber-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/60">
                  Welcome to 247 OS
                </span>
                <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight">
                  Choose Your Operating Experience
                </h1>
                <p className="text-xs sm:text-sm text-stone-400 font-sans leading-relaxed">
                  Select how you want to experience Manchester’s rapid mobile delivery network. Each choice provides a guided walkthrough and dedicated cockpit controls.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
                {/* Customer Choice Card */}
                <div
                  onClick={() => {
                    setSelectedRole('CUSTOMER');
                    setHasChosenRole(true);
                    setCurrentStepIndex(0);
                  }}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedRole === 'CUSTOMER'
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/40'
                      : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black text-base text-white">Customer</h3>
                        <span className="text-[10px] font-mono-code text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800/60">
                          STOREFRONT
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        Order food, cold-weather supplies &amp; essentials delivered by cargo bike within 60 mins or less.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-stone-800/80 text-[11px] text-stone-300 font-mono-code">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>1 Free essential item with order</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Tesla hot-swap battery network</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Trader Pass $20/mo with $20 credit</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3">
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-stone-950 font-mono-code font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-colors"
                    >
                      <span>Start Customer Tour</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rider Choice Card */}
                <div
                  onClick={() => {
                    setSelectedRole('RIDER');
                    setHasChosenRole(true);
                    setCurrentStepIndex(0);
                  }}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedRole === 'RIDER'
                      ? 'bg-sky-950/20 border-sky-500/60 shadow-lg shadow-sky-950/30 ring-1 ring-sky-500/40'
                      : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black text-base text-white">Rider</h3>
                        <span className="text-[10px] font-mono-code text-sky-400 font-bold px-1.5 py-0.2 rounded bg-sky-950/80 border border-sky-800/60">
                          COURIER
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        Cargo bicycle cockpit, real-time dispatch queue, GPS bike route map &amp; drop-off PINs.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-stone-800/80 text-[11px] text-stone-300 font-mono-code">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Live 60-min or less SLA countdown</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Photo &amp; 4-digit PIN verification</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Street battery swap execution</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3">
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl bg-sky-500 group-hover:bg-sky-400 text-stone-950 font-mono-code font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-colors"
                    >
                      <span>Start Rider Tour</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Admin Choice Card */}
                <div
                  onClick={() => {
                    setSelectedRole('ADMIN');
                    setHasChosenRole(true);
                    setCurrentStepIndex(0);
                  }}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedRole === 'ADMIN'
                      ? 'bg-purple-950/20 border-purple-500/60 shadow-lg shadow-purple-950/30 ring-1 ring-purple-500/40'
                      : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black text-base text-white">Admin</h3>
                        <span className="text-[10px] font-mono-code text-purple-400 font-bold px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-800/60">
                          DISPATCH &amp; OPS
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        Live fleet radar, order dispatching, unit economics, supply fund &amp; mobile fleet telemetry.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-stone-800/80 text-[11px] text-stone-300 font-mono-code">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Live radar with moving bike beacons</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Economics &amp; cart margin optimizer</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Battery reserves &amp; fleet diagnostics</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3">
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl bg-purple-500 group-hover:bg-purple-400 text-stone-950 font-mono-code font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-colors"
                    >
                      <span>Start Admin Tour</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Skip button to jump to clean app */}
              <div className="pt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    handleFinishOnboarding();
                  }}
                  className="text-xs text-stone-400 hover:text-stone-200 underline font-mono-code transition-colors"
                >
                  Skip sequence &amp; open clean build directly →
                </button>
              </div>
            </div>
          ) : (
            /* STEPPED WALKTHROUGH FOR CHOSEN ROLE */
            <div className="space-y-6">
              {/* Step Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {currentStep.badge}
                    </span>
                    <span className="text-xs font-mono-code text-stone-500">
                      Step {currentStepIndex + 1} of {currentSteps.length}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-display font-black text-white">
                    {currentStep.title}
                  </h2>
                  <p className="text-xs font-mono-code text-stone-400">
                    {currentStep.subtitle}
                  </p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <currentStep.icon className="w-6 h-6" />
                </div>
              </div>

              {/* Step Summary Paragraph */}
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-sans bg-stone-950/40 p-3.5 rounded-xl border border-stone-800/60">
                {currentStep.description}
              </p>

              {/* Step Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentStep.features.map((feat, idx) => {
                  const FeatIcon = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-1.5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-750 flex items-center justify-center text-amber-400 mb-1">
                        <FeatIcon className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-white font-mono-code">
                        {feat.label}
                      </h4>
                      <p className="text-[11px] text-stone-400 leading-normal">
                        {feat.detail}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* FINAL STEP: CONFIGURATION PREFERENCES */}
              {isLastStep && (
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h3 className="font-mono-code font-bold text-xs uppercase text-stone-200 tracking-wider">
                      Initial {selectedRole} Setup &amp; Preferences
                    </h3>
                  </div>

                  {selectedRole === 'CUSTOMER' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-mono-code text-stone-400">
                            Primary Manchester Delivery Sector:
                          </label>
                          <span className="text-[10px] font-mono-code text-amber-400 font-semibold">
                            ≤60 MIN GUARANTEE
                          </span>
                        </div>
                        <select
                          value={customerNeighborhood}
                          onChange={(e) => setCustomerNeighborhood(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-white font-mono-code text-xs focus:outline-none focus:border-amber-400"
                        >
                          <option value="Downtown Elm St Corridor">Downtown Elm St Corridor (Target ≤30 min • ≤60 min guarantee)</option>
                          <option value="Millyard Technology Zone">Millyard Technology Zone (Target ≤45 min • ≤60 min guarantee)</option>
                          <option value="West Side & Rimmon Heights">West Side &amp; Rimmon Heights (Target ≤45 min • ≤60 min guarantee)</option>
                          <option value="South End & Somerville St">South End &amp; Somerville St (Target ≤50 min • ≤60 min guarantee)</option>
                          <option value="East Side & Lake Ave Approach">East Side &amp; Lake Ave (Target ≤55 min • ≤60 min guarantee)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                        <div>
                          <span className="font-mono-code text-stone-200 block text-xs">Real-Time SMS &amp; Web Pings</span>
                          <span className="text-[10px] text-stone-500">Live courier departure and arrival alerts</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customerSmsAlerts}
                          onChange={(e) => setCustomerSmsAlerts(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {selectedRole === 'RIDER' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-mono-code text-stone-400 mb-1">
                          Assigned Courier Transport Rig:
                        </label>
                        <select
                          value={riderVehicleType}
                          onChange={(e) => setRiderVehicleType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-white font-mono-code text-xs focus:outline-none focus:border-sky-400"
                        >
                          <option value="Heavy Cargo e-Bike (250W)">Heavy Cargo e-Bike (250W - 120kg payload)</option>
                          <option value="Standard Messenger Road Bike">Messenger Road Bike (Speed Courier - 25kg)</option>
                          <option value="Longtail Utility Bike">Longtail Cargo Bike (Insulated Totes)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                        <div>
                          <span className="font-mono-code text-stone-200 block text-xs">Active Shift Status</span>
                          <span className="text-[10px] text-stone-500">Clock in immediately upon launch</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={riderShiftReady}
                          onChange={(e) => setRiderShiftReady(e.target.checked)}
                          className="w-4 h-4 rounded text-sky-500 accent-sky-500"
                        />
                      </div>
                    </div>
                  )}

                  {selectedRole === 'ADMIN' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-mono-code text-stone-400 mb-1">
                          Default Operations Workspace:
                        </label>
                        <select
                          value={adminDefaultView}
                          onChange={(e) => setAdminDefaultView(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-white font-mono-code text-xs focus:outline-none focus:border-purple-400"
                        >
                          <option value="Live Fleet Radar">Live Fleet Radar &amp; Telemetry</option>
                          <option value="Order Dispatch Queue">Order Dispatch &amp; Routing</option>
                          <option value="Unit Economics Dashboard">Unit Economics &amp; Margin Optimizer</option>
                          <option value="Battery Hub Network">Tesla Battery Network &amp; Base Hub</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                        <div>
                          <span className="font-mono-code text-stone-200 block text-xs">Critical Alert Audio Pings</span>
                          <span className="text-[10px] text-stone-500">Audible chimes for late SLAs and low stocks</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={adminAudiblePings}
                          onChange={(e) => setAdminAudiblePings(e.target.checked)}
                          className="w-4 h-4 rounded text-purple-500 accent-purple-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-[11px] text-emerald-400 font-mono-code flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Clean build activated: All mock data controls and demo badges will be dismissed.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-5 py-3.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between shrink-0">
          <div>
            {hasChosenRole ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStepIndex > 0) {
                    setCurrentStepIndex(prev => prev - 1);
                  } else {
                    setHasChosenRole(false);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-white border border-stone-800 font-mono-code text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{currentStepIndex === 0 ? 'Change Role' : 'Previous'}</span>
              </button>
            ) : (
              <span className="text-xs text-stone-500 font-mono-code">
                Select a persona above to proceed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasChosenRole && !isLastStep && (
              <button
                type="button"
                onClick={() => setCurrentStepIndex(prev => prev + 1)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-white font-mono-code font-bold text-xs flex items-center gap-1.5 border border-stone-700 transition-colors"
              >
                <span>Next Feature</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {hasChosenRole && isLastStep && (
              <button
                type="button"
                id="btn-complete-onboarding"
                onClick={handleFinishOnboarding}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono-code font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all hover:scale-102"
              >
                <span>Complete Onboarding &amp; Enter 247 Clean App</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
