import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KioskPage } from './views/KioskPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KioskPage />
      <ToastContainer position="bottom-left" autoClose={3000} />
    </QueryClientProvider>
  );
}
