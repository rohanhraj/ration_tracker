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
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  getDailyReport: (dateString: string) => Transaction[];
  getMonthlyReport: (monthString: string) => Transaction[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ration_transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse transactions', e);
      }
    }
  }, []);

  // Save to LocalStorage whenever transactions change
  useEffect(() => {
    localStorage.setItem('ration_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const getDailyReport = (dateString: string) => {
    // dateString should be YYYY-MM-DD
    return transactions.filter(t => t.date.startsWith(dateString));
  };

  const getMonthlyReport = (monthString: string) => {
    // monthString should be YYYY-MM
    return transactions.filter(t => t.issueDate.startsWith(monthString));
  };

  return (
    <DataContext.Provider value={{
      transactions,
      addTransaction,
      deleteTransaction,
      getDailyReport,
      getMonthlyReport
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
