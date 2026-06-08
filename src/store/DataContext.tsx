import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Role = 'owner' | 'worker';
export type IssueStatus = 'issued' | 'distributed';

export interface AuthUser {
  username: string;
  role: Role;
}

export interface CardHolder {
  cardNo: string;
  cardType: string;
  isActive: boolean;
}

export interface InventorySnapshot {
  month: string;
  riceTotalKg: number;
  ragiTotalKg: number;
  riceDistributedKg: number;
  ragiDistributedKg: number;
  riceRemainingKg: number;
  ragiRemainingKg: number;
  distributedCount: number;
}

export interface RationIssue {
  id: string;
  cardNo: string;
  month: string;
  unit: number;
  riceKg: number;
  ragiKg: number;
  status: IssueStatus;
  issuedAt: string;
  issuedBy: string;
  distributedAt: string | null;
  distributedBy: string | null;
  cardType: string;
}

export interface IssueInput {
  cardNo: string;
  month: string;
  unit: number;
  riceKg: number;
  ragiKg: number;
}

export interface CardHolderInput {
  cardNo: string;
  cardType: string;
  isActive: boolean;
}

export interface InventoryInput {
  riceAmount: number;
  riceMeasure: 'kg' | 'quintal';
  ragiAmount: number;
  ragiMeasure: 'kg' | 'quintal';
}

interface IssueResponse {
  issue: RationIssue;
  duplicateWarning: boolean;
}

interface DistributionResponse {
  issue: RationIssue;
}

interface DataContextType {
  user: AuthUser | null;
  authLoading: boolean;
  isOnline: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCardHolders: (search?: string, includeInactive?: boolean) => Promise<CardHolder[]>;
  getCardHolder: (cardNo: string) => Promise<CardHolder>;
  createCardHolder: (card: CardHolderInput) => Promise<CardHolder>;
  updateCardHolder: (originalCardNo: string, card: CardHolderInput) => Promise<CardHolder>;
  fetchInventory: (month: string) => Promise<InventorySnapshot>;
  saveInventory: (month: string, input: InventoryInput) => Promise<InventorySnapshot>;
  fetchIssues: (month: string, status?: IssueStatus, cardNo?: string) => Promise<RationIssue[]>;
  fetchIssueHistory: (cardNo: string) => Promise<RationIssue[]>;
  createIssue: (input: IssueInput) => Promise<IssueResponse>;
  updateIssue: (id: string, input: IssueInput) => Promise<IssueResponse>;
  deleteIssue: (id: string) => Promise<void>;
  clearIssuesForMonth: (month: string) => Promise<number>;
  distributeIssue: (id: string) => Promise<DistributionResponse>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const apiRequest = async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data as T;
};

const withQuery = (base: string, params: Record<string, string | undefined>) => {
  const url = new URL(base, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}`;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiRequest<{ user: AuthUser | null }>('/api/auth/me');
        setUser(data.user);
        setIsOnline(true);
      } catch (error) {
        console.warn('Unable to reach the ration API:', error);
        setIsOnline(false);
      } finally {
        setAuthLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiRequest<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
    setIsOnline(true);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const fetchCardHolders = useCallback(async (search = '', includeInactive = false) => {
    return apiRequest<CardHolder[]>(
      withQuery('/api/card-holders', {
        search,
        includeInactive: includeInactive ? 'true' : undefined,
        limit: '80',
      })
    );
  }, []);

  const getCardHolder = useCallback(async (cardNo: string) => {
    return apiRequest<CardHolder>(`/api/card-holders/${encodeURIComponent(cardNo)}`);
  }, []);

  const createCardHolder = useCallback(async (card: CardHolderInput) => {
    return apiRequest<CardHolder>('/api/card-holders', {
      method: 'POST',
      body: JSON.stringify(card),
    });
  }, []);

  const updateCardHolder = useCallback(async (originalCardNo: string, card: CardHolderInput) => {
    return apiRequest<CardHolder>(`/api/card-holders/${encodeURIComponent(originalCardNo)}`, {
      method: 'PUT',
      body: JSON.stringify(card),
    });
  }, []);

  const fetchInventory = useCallback(async (month: string) => {
    return apiRequest<InventorySnapshot>(`/api/inventory/${encodeURIComponent(month)}`);
  }, []);

  const saveInventory = useCallback(async (month: string, input: InventoryInput) => {
    return apiRequest<InventorySnapshot>(`/api/inventory/${encodeURIComponent(month)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }, []);

  const fetchIssues = useCallback(async (month: string, status?: IssueStatus, cardNo = '') => {
    return apiRequest<RationIssue[]>(
      withQuery('/api/issues', {
        month,
        status,
        cardNo,
      })
    );
  }, []);

  const fetchIssueHistory = useCallback(async (cardNo: string) => {
    return apiRequest<RationIssue[]>(`/api/issues/history/${encodeURIComponent(cardNo)}`);
  }, []);

  const createIssue = useCallback(async (input: IssueInput) => {
    return apiRequest<IssueResponse>('/api/issues', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }, []);

  const updateIssue = useCallback(async (id: string, input: IssueInput) => {
    return apiRequest<IssueResponse>(`/api/issues/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }, []);

  const deleteIssue = useCallback(async (id: string) => {
    await apiRequest<{ success: boolean }>(`/api/issues/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }, []);

  const clearIssuesForMonth = useCallback(async (month: string) => {
    const response = await apiRequest<{ success: boolean; deletedCount: number }>(
      `/api/issues/month/${encodeURIComponent(month)}`,
      {
        method: 'DELETE',
      }
    );
    return response.deletedCount;
  }, []);

  const distributeIssue = useCallback(async (id: string) => {
    return apiRequest<DistributionResponse>(`/api/issues/${encodeURIComponent(id)}/distribute`, {
      method: 'POST',
    });
  }, []);

  return (
    <DataContext.Provider
      value={{
        user,
        authLoading,
        isOnline,
        login,
        logout,
        fetchCardHolders,
        getCardHolder,
        createCardHolder,
        updateCardHolder,
        fetchInventory,
        saveInventory,
        fetchIssues,
        fetchIssueHistory,
        createIssue,
        updateIssue,
        deleteIssue,
        clearIssuesForMonth,
        distributeIssue,
      }}
    >
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
