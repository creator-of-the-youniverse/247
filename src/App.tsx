import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { BottomNav, CustomerTab } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { HomeScreen } from './components/customer/HomeScreen';
import { ShopScreen } from './components/customer/ShopScreen';
import { OrdersScreen } from './components/customer/OrdersScreen';
import { TraderPassScreen } from './components/customer/TraderPassScreen';
import { ResourcesScreen } from './components/customer/ResourcesScreen';
import { SponsorScreen } from './components/customer/SponsorScreen';
import { CartDrawer } from './components/customer/CartDrawer';
import { CheckoutModal } from './components/customer/CheckoutModal';
import { FreeEssentialModal } from './components/customer/FreeEssentialModal';
import { SendTraderScreen } from './components/customer/SendTraderScreen';
import { AskTraderScreen } from './components/customer/AskTraderScreen';
import { RiderCockpit } from './components/rider/RiderCockpit';
import { AdminDashboard } from './components/admin/AdminDashboard';

const MainApp: React.FC = () => {
  const { role, orders } = useStore();
  const [customerTab, setCustomerTab] = useState<CustomerTab>('HOME');

  // Modals & Drawers state
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [freeModalOpen, setFreeModalOpen] = useState(false);
  const [sendTraderOpen, setSendTraderOpen] = useState(false);
  const [askTraderOpen, setAskTraderOpen] = useState(false);

  const activeOrdersCount = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Offline Status Pill */}
      <OfflineIndicator />

      {/* Header */}
      <Header onOpenCart={() => setCartOpen(true)} />

      {/* PWA Install Banner (Prompts on mobile browsers) */}
      <PWAInstallBanner />

      {/* Main Content Area with safe bottom spacing for mobile BottomNav */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 ${role === 'CUSTOMER' ? 'has-bottom-nav pb-28 sm:pb-8' : 'pb-8'}`}>
        {role === 'CUSTOMER' && (
          <>
            {customerTab === 'HOME' && (
              <HomeScreen
                onNavigate={(tab) => setCustomerTab(tab)}
                onOpenSendTrader={() => setSendTraderOpen(true)}
                onOpenAskTrader={() => setAskTraderOpen(true)}
                onOpenFreeEssentialModal={() => setFreeModalOpen(true)}
              />
            )}

            {customerTab === 'SHOP' && (
              <ShopScreen
                onOpenFreeEssentialModal={() => setFreeModalOpen(true)}
              />
            )}

            {customerTab === 'ORDERS' && (
              <OrdersScreen />
            )}

            {customerTab === 'TRADER_PASS' && (
              <TraderPassScreen />
            )}

            {customerTab === 'RESOURCES' && (
              <ResourcesScreen />
            )}

            {customerTab === 'ACCOUNT' && (
              <SponsorScreen />
            )}

            {/* Mobile Bottom Navigation Bar (Customer Only) */}
            <BottomNav
              currentTab={customerTab}
              onSelectTab={(tab) => setCustomerTab(tab)}
              activeOrderCount={activeOrdersCount}
            />
          </>
        )}

        {role === 'RIDER' && (
          <RiderCockpit />
        )}

        {role === 'ADMIN' && (
          <AdminDashboard />
        )}
      </main>

      {/* Customer Drawers & Modals */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onOpenCheckout={() => setCheckoutOpen(true)}
        onOpenFreeEssentialModal={() => setFreeModalOpen(true)}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onOrderCompleted={() => {
          setCustomerTab('ORDERS');
        }}
      />

      <FreeEssentialModal
        isOpen={freeModalOpen}
        onClose={() => setFreeModalOpen(false)}
      />

      <SendTraderScreen
        isOpen={sendTraderOpen}
        onClose={() => setSendTraderOpen(false)}
        onOpenCart={() => setCartOpen(true)}
      />

      <AskTraderScreen
        isOpen={askTraderOpen}
        onClose={() => setAskTraderOpen(false)}
      />

      {/* Industrial Notifications */}
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <MainApp />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
