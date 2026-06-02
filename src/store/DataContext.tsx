import React, { createContext, useContext, useState, useEffect } from 'react';

export type ItemType = 'Rice' | 'Ragi';

export interface Transaction {
  id: string;
  cardNo: string;
  unit: number;
  quantity: number;
  date: string; // ISO format
  issueDate: string; // YYYY-MM-DD format
  item: ItemType;
}

interface DataContextType {
  transactions: Transaction[];
  isOnline: boolean;
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;
  getDailyReport: (dateString: string) => Transaction[];
  getMonthlyReport: (monthString: string) => Transaction[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from database on mount, fall back to LocalStorage if offline
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/transactions');
        if (!res.ok) throw new Error('Database server error');
        const data = await res.json();
        setTransactions(data);
        setIsOnline(true);
        // Sync database state to LocalStorage so it is cached for offline use
        localStorage.setItem('ration_transactions', JSON.stringify(data));
      } catch (err) {
        console.warn('Failed to connect to Neon database. Operating in offline mode.', err);
        setIsOnline(false);
        const saved = localStorage.getItem('ration_transactions');
        if (saved) {
          try {
            setTransactions(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse transactions from LocalStorage', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
    };

    if (isOnline) {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTx),
        });
        if (res.ok) {
          const savedTx = await res.json();
          setTransactions(prev => {
            const updated = [savedTx, ...prev];
            localStorage.setItem('ration_transactions', JSON.stringify(updated));
            return updated;
          });
          return;
        } else {
          throw new Error('Failed to post transaction to server');
        }
      } catch (err) {
        console.error('Database save failed, falling back to LocalStorage', err);
        setIsOnline(false);
      }
    }

    // Offline / Fallback flow
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      localStorage.setItem('ration_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteTransaction = async (id: string) => {
    if (isOnline) {
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setTransactions(prev => {
            const updated = prev.filter(t => t.id !== id);
            localStorage.setItem('ration_transactions', JSON.stringify(updated));
            return updated;
          });
          return;
        } else {
          throw new Error('Failed to delete transaction on server');
        }
      } catch (err) {
        console.error('Database delete failed, falling back to LocalStorage', err);
        setIsOnline(false);
      }
    }

    // Offline / Fallback flow
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('ration_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  const bulkDeleteTransactions = async (ids: string[]) => {
    if (isOnline) {
      try {
        const res = await fetch('/api/transactions/delete-bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) {
          const idSet = new Set(ids);
          setTransactions(prev => {
            const updated = prev.filter(t => !idSet.has(t.id));
            localStorage.setItem('ration_transactions', JSON.stringify(updated));
            return updated;
          });
          return;
        } else {
          throw new Error('Failed to bulk delete transactions on server');
        }
      } catch (err) {
        console.error('Database bulk delete failed, falling back to LocalStorage', err);
        setIsOnline(false);
      }
    }

    // Offline / Fallback flow
    const idSet = new Set(ids);
    setTransactions(prev => {
      const updated = prev.filter(t => !idSet.has(t.id));
      localStorage.setItem('ration_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  const getDailyReport = (dateString: string) => {
    return transactions.filter(t => t.date.startsWith(dateString));
  };

  const getMonthlyReport = (monthString: string) => {
    return transactions.filter(t => t.issueDate.startsWith(monthString));
  };

  return (
    <DataContext.Provider value={{
      transactions,
      isOnline,
      loading,
      addTransaction,
      deleteTransaction,
      bulkDeleteTransactions,
      getDailyReport,
      getMonthlyReport
    }}>
      {children}
    </DataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
