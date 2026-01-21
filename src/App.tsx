import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import { KioskPage } from './views/KioskPage';
import { useNetworkStatus, useSyncEmployees } from './queries';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient();

const KioskApp = () => {
  useNetworkStatus(); // Chạy heartbeat
  useSyncEmployees(); // Chạy sync nhân viên
  return <KioskPage />;
};

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <KioskApp />
        <ToastContainer position="bottom-left" />
      </QueryClientProvider>
    </Provider>
  );
}
