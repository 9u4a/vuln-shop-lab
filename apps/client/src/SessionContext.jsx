import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useBackend } from './BackendContext.jsx';
import { fetchSession, logout as apiLogout } from './api.js';

const SessionContext = createContext(null);

function SessionProvider({ children }) {
  const { backend } = useBackend();
  const [user, setUser] = useState(null);

  const refresh = useCallback(() => {
    fetchSession(backend.base)
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, [backend.base]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function logout() {
    await apiLogout(backend.base);
    setUser(null);
  }

  return (
    <SessionContext.Provider value={{ user, setUser, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

function useSession() {
  return useContext(SessionContext);
}

export { SessionProvider, useSession };
