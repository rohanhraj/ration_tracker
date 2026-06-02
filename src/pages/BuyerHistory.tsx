import React, { useState, useMemo } from 'react';
import { useData } from '../store/DataContext';
import { format } from 'date-fns';
import { Search, User, Trash2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToExcel } from '../utils/exportUtils';

const BuyerHistory: React.FC = () => {
    const { transactions, deleteTransaction } = useData();
    const [search, setSearch] = useState('');

    const filteredTransactions = useMemo(() => {
        if (!search.trim()) return [];
        return transactions.filter(t => t.cardNo.includes(search.trim()));
    }, [transactions, search]);

    const totalRiceQty = filteredTransactions.filter(t => t.item === 'Rice').reduce((sum, t) => sum + t.quantity, 0);
    const totalRagiQty = filteredTransactions.filter(t => t.item === 'Ragi').reduce((sum, t) => sum + t.quantity, 0);

    const exportPDF = () => {
        if (filteredTransactions.length === 0) return;
        const doc = new jsPDF();
        doc.text(`Buyer Ration History - Card No: ${search}`, 14, 15);

        autoTable(doc, {
            startY: 20,
            head: [['System Date', 'Issue Date', 'Item', 'Unit', 'Qty']],
            body: filteredTransactions.map(tx => [
                format(new Date(tx.date), 'MMM dd yyyy, HH:mm'),
                tx.issueDate,
                tx.item,
                tx.unit,
                tx.quantity
            ]),
            theme: 'striped',
            headStyles: { fillColor: [56, 189, 248] },
        });

        doc.save(`buyer_history_${search}.pdf`);
    };

    const exportExcel = () => {
        if (filteredTransactions.length === 0) return;
        const excelData = filteredTransactions.map(tx => ({
            'System Date': format(new Date(tx.date), 'yyyy-MM-dd HH:mm'),
            'Issue Date': tx.issueDate,
            'Card No': search,
            'Item': tx.item,
            'Unit': tx.unit,
            'Qty (kg)': tx.quantity,
        }));
        exportToExcel(excelData, `buyer_history_${search}`, 'Buyer History');
    };

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 className="heading-md" style={{ margin: 0 }}>Search Results</h3>
                        {filteredTransactions.length > 0 && (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={exportPDF} className="btn-primary" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-neon)', border: '1px solid var(--accent-neon)', boxShadow: 'none' }}>
                                    <Download size={18} /> Export PDF
                                </button>
                                <button onClick={exportExcel} className="btn-primary">
                                    <Download size={18} /> Export Excel
                                </button>
                            </div>
                        )}
                    </div>

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
