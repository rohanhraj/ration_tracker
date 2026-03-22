import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../store/DataContext';
import type { ItemType } from '../store/DataContext';
import { format } from 'date-fns';
import { PlusCircle, Save, Trash2 } from 'lucide-react';

const DataEntry: React.FC = () => {
    const { addTransaction, transactions, deleteTransaction } = useData();
    const cardNoRef = useRef<HTMLInputElement>(null);

    // Auto-focus Card No. on mount and whenever the browser tab/window becomes active
    useEffect(() => {
        const focusCardNo = () => cardNoRef.current?.focus();

        // Defer slightly so the browser has settled after mount/refresh
        const timer = setTimeout(focusCardNo, 100);

        // Browser tab switched back (Ctrl+Tab / clicking tab)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') focusCardNo();
        });

        // Window regains focus from another app
        window.addEventListener('focus', focusCardNo);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', focusCardNo);
            window.removeEventListener('focus', focusCardNo);
        };
    }, []);

    // Current Entry State
    const [cardNo, setCardNo] = useState('');
    const [unit, setUnit] = useState<number | ''>('');
    const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [item, setItem] = useState<ItemType>('Rice');

    // Prefix handling
    const handleCardNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;

        // Auto-fill logic when user types the first digit
        if (val.length === 1 && cardNo === '') {
            if (val === '5') val = '520200';
            else if (val === '2') val = '250';
            else if (val === '3') val = '301000';
            else if (val === '1') val = '150';
        }

        setCardNo(val);
    };

    const submitData = () => {
        if (!cardNo || unit === '' || unit <= 0) return;

        addTransaction({
            cardNo,
            unit: Number(unit),
            quantity: Number(unit) * 10,
            date: new Date().toISOString(), // Fixed system date
            issueDate,
            item
        });

        // Reset simple fields, keep date and item for convenience
        setCardNo('');
        setUnit('');
        // Return focus to Card No. ready for next entry
        setTimeout(() => cardNoRef.current?.focus(), 0);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        submitData();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitData();
        }
    };

    const quantity = unit === '' ? 0 : unit * 10;
    const todayStr = format(new Date(), 'MMM dd, yyyy HH:mm');

    // Simple quick view of today's recently added
    const recentTransactions = transactions
        .slice(0, 5)
        .filter(t => new Date(t.date).toDateString() === new Date().toDateString());

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2 className="heading-lg">Data Entry Window</h2>
                <p style={{ color: 'var(--text-muted)' }}>Spreadsheet-style single entry system.</p>
            </header>

            <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h3 className="heading-md" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlusCircle className="text-neon" size={24} /> New Record
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Card No.</label>
                        <input
                            ref={cardNoRef}
                            type="text"
                            value={cardNo}
                            onChange={handleCardNoChange}
                            onKeyDown={handleKeyDown}
                            placeholder="E.g., 5..."
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Unit</label>
                        <input
                            type="number"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value === '' ? '' : Number(e.target.value))}
                            onKeyDown={handleKeyDown}
                            placeholder="0"
                            min="0.1"
                            step="0.1"
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Quantity (Auto x10)</label>
                        <input
                            type="number"
                            value={quantity}
                            readOnly
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Item</label>
                        <select value={item} onChange={(e) => setItem(e.target.value as ItemType)} onKeyDown={handleKeyDown}>
                            <option value="Rice">Rice</option>
                            <option value="Ragi">Ragi</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Issue Date (Modifiable)</label>
                        <input
                            type="date"
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                            onKeyDown={handleKeyDown}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Today's Date (Fixed sys)</label>
                        <input
                            type="text"
                            value={todayStr}
                            readOnly
                        />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-primary">
                        <Save size={18} /> Save Record
                    </button>
                </div>
            </form>

            {/* Quick recent view */}
            <h3 className="heading-md" style={{ marginTop: '3rem', marginBottom: '1rem' }}>Today's Recent Entries</h3>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time added</th>
                            <th>Card No</th>
                            <th>Item</th>
                            <th>Unit</th>
                            <th>Qty</th>
                            <th>Issue Date</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No entries made today.
                                </td>
                            </tr>
                        ) : (
                            recentTransactions.map(tx => (
                                <tr key={tx.id}>
                                    <td>{format(new Date(tx.date), 'HH:mm:ss')}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.cardNo}</td>
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
                                    <td>{tx.issueDate}</td>
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
        </div>
    );
};

export default DataEntry;
