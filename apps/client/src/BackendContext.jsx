import { createContext, useContext, useState } from 'react';

const BACKENDS = {
  node: { label: 'Node.js / Express', base: '/api/node' },
  java: { label: 'Java / Spring', base: '/api/java' },
};

const BackendContext = createContext(null);

function BackendProvider({ children }) {
  const [backendKey, setBackendKey] = useState(
    () => localStorage.getItem('backend') || 'node'
  );

  function selectBackend(key) {
    localStorage.setItem('backend', key);
    setBackendKey(key);
  }

  const value = {
    backendKey,
    backend: BACKENDS[backendKey],
    backends: BACKENDS,
    selectBackend,
  };

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

function useBackend() {
  return useContext(BackendContext);
}

export { BackendProvider, useBackend, BACKENDS };
