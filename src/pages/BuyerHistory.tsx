import React, { useState, useMemo } from 'react';
import { useData } from '../store/DataContext';
import { format } from 'date-fns';
import { Search, User, Trash2 } from 'lucide-react';

const BuyerHistory: React.FC = () => {
    const { transactions, deleteTransaction } = useData();
    const [search, setSearch] = useState('');

    const filteredTransactions = useMemo(() => {
        if (!search.trim()) return [];
        return transactions.filter(t => t.cardNo.includes(search.trim()));
    }, [transactions, search]);

    const totalRiceQty = filteredTransactions.filter(t => t.item === 'Rice').reduce((sum, t) => sum + t.quantity, 0);
    const totalRagiQty = filteredTransactions.filter(t => t.item === 'Ragi').reduce((sum, t) => sum + t.quantity, 0);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2 className="heading-lg">Buyer History</h2>
                <p style={{ color: 'var(--text-muted)' }}>Search all historical records by Card No.</p>
            </header>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Search size={24} className="text-neon" />
                <input
                    type="text"
                    placeholder="Search by Card No (e.g. 520200...)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, fontSize: '1.1rem', padding: '1rem' }}
                />
            </div>

            {search.trim() !== '' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={24} className="text-neon" />
                            </div>
                            <div>
                                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 500 }}>Lifetime Visits</h4>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredTransactions.length}</div>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Lifetime Rice</h4>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalRiceQty} kg</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Lifetime Ragi</h4>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalRagiQty} kg</div>
                        </div>
                    </div>

                    <div className="glass-panel table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>System Date</th>
                                    <th>Issue Date</th>
                                    <th>Item</th>
                                    <th>Unit</th>
                                    <th>Qty</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                            No records found for Card No "{search}".
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{format(new Date(tx.date), 'MMM dd yyyy, HH:mm')}</td>
                                            <td>{tx.issueDate}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                                    background: tx.item === 'Rice' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    color: tx.item === 'Rice' ? '#38bdf8' : '#ef4444'
                                                }}>
                                                    {tx.item}
                                                </span>
                                            </td>
                                            <td>{tx.unit}</td>
                                            <td>{tx.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => { if (window.confirm('Delete this record?')) deleteTransaction(tx.id) }}
                                                    style={{ color: 'var(--danger)', padding: '0.25rem' }}
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {search.trim() === '' && (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <User size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                    <p>Please enter a Card No to view history.</p>
                </div>
            )}
        </div>
    );
};

export default BuyerHistory;
