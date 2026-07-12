import { createContext, useContext, useState, useCallback } from 'react';

const CreateCommunityModalContext = createContext(null);

export function CreateCommunityModalProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <CreateCommunityModalContext.Provider value={{ open, openModal, close }}>
      {children}
    </CreateCommunityModalContext.Provider>
  );
}

export const useCreateCommunityModal = () => useContext(CreateCommunityModalContext);