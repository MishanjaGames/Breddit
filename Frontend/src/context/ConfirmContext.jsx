import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { type: 'confirm'|'prompt', message, defaultValue, resolve }
  const [inputValue, setInputValue] = useState('');
  const resolveRef = useRef(null);

  const confirm = useCallback((message) => new Promise((resolve) => {
    resolveRef.current = resolve;
    setState({ type: 'confirm', message });
  }), []);

  const prompt = useCallback((message, defaultValue = '') => new Promise((resolve) => {
    resolveRef.current = resolve;
    setInputValue(defaultValue);
    setState({ type: 'prompt', message, defaultValue });
  }), []);

  const finish = (value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {state && (
        <div className="modal-overlay" onClick={() => finish(state.type === 'confirm' ? false : null)}>
          <div className="modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">{state.message}</p>
            {state.type === 'prompt' && (
              <input
                className="confirm-input"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') finish(inputValue); }}
              />
            )}
            <div className="confirm-actions">
              <button className="btn btn-outline" onClick={() => finish(state.type === 'confirm' ? false : null)}>Скасувати</button>
              <button className="btn btn-primary" onClick={() => finish(state.type === 'confirm' ? true : inputValue)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};
