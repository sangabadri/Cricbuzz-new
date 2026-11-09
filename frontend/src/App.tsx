import { AppProvider } from './app/providers/AppProvider';
import { AppRouter } from './app/router';

export function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
