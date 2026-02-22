import React, { useState, useMemo } from 'react';
import { useData } from '../store/DataContext';
import { format } from 'date-fns';
import { Calendar, Download, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DailyReport: React.FC = () => {
    const { getDailyReport, deleteTransaction } = useData();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const transactions = useMemo(() => getDailyReport(selectedDate), [getDailyReport, selectedDate]);

    const totalRiceQty = transactions.filter(t => t.item === 'Rice').reduce((sum, t) => sum + t.quantity, 0);
    const totalRagiQty = transactions.filter(t => t.item === 'Ragi').reduce((sum, t) => sum + t.quantity, 0);

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text(`Daily Ration Report - ${selectedDate}`, 14, 15);

        autoTable(doc, {
            startY: 20,
            head: [['Time', 'Card No', 'Item', 'Unit', 'Qty']],
            body: transactions.map(tx => [
                format(new Date(tx.date), 'HH:mm:ss'),
                tx.cardNo,
                tx.item,
                tx.unit,
                tx.quantity
            ]),
            theme: 'striped',
            headStyles: { fillColor: [56, 189, 248] },
        });

        doc.save(`daily_report_${selectedDate}.pdf`);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="heading-lg">Daily Report</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Overview of sales for a specific date.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Calendar size={20} className="text-neon" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ width: 'auto' }}
                        />
                    </div>
                    <button onClick={exportPDF} className="btn-primary" style={{ height: '100%' }}>
                        <Download size={20} /> Export PDF
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-neon)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Total Rice Sold</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalRiceQty} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>kg</span></div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Total Ragi Sold</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalRagiQty} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>kg</span></div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Total Transactions</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{transactions.length}</div>
                </div>
            </div>

            <div className="glass-panel table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Card No</th>
                            <th>Item</th>
                            <th>Unit</th>
                            <th>Qty</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No transactions recorded on this date.
                                </td>
                            </tr>
                        ) : (
                            transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td>{format(new Date(tx.date), 'HH:mm:ss')}</td>
                                    <td style={{ fontWeight: 600 }}>{tx.cardNo}</td>
                                    <td>{tx.item}</td>
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
        </div>
    );
};

export default DailyReport;
