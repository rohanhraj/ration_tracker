import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../store/DataContext';
import type { CardHolder, RationIssue } from '../store/DataContext';
import { exportToExcel } from '../utils/exportUtils';
import { formatDateTime, formatKg } from '../utils/format';

const BuyerHistory = () => {
  const { getCardHolder, fetchIssueHistory } = useData();
  const [cardNo, setCardNo] = useState('');
  const [card, setCard] = useState<CardHolder | null>(null);
  const [issues, setIssues] = useState<RationIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totals = useMemo(
    () => ({
      rice: issues.reduce((sum, issue) => sum + issue.riceKg, 0),
      ragi: issues.reduce((sum, issue) => sum + issue.ragiKg, 0),
      distributed: issues.filter(issue => issue.status === 'distributed').length,
    }),
    [issues]
  );

  const searchHistory = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!cardNo.trim()) return;
    setLoading(true);
    setError('');
    setCard(null);
    setIssues([]);
    try {
      const [cardData, historyData] = await Promise.all([
        getCardHolder(cardNo.trim()),
        fetchIssueHistory(cardNo.trim()),
      ]);
      setCard(cardData);
      setIssues(historyData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load card history');
    } finally {
      setLoading(false);
    }
  };

  const rows = issues.map(issue => ({
    Month: issue.month,
    Status: issue.status,
    'Rice quantity': issue.riceKg,
    'Ragi quantity': issue.ragiKg,
    'Issued At': formatDateTime(issue.issuedAt),
    'Distributed At': formatDateTime(issue.distributedAt),
  }));

  const exportExcel = () => {
    exportToExcel(rows, `card_history_${cardNo}`, 'Card History');
  };

  const exportPDF = () => {
    if (rows.length === 0) return;
    const doc = new jsPDF();
    doc.text(`Card History - ${cardNo}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Month', 'Status', 'Rice quantity', 'Ragi quantity', 'Issued', 'Distributed']],
      body: issues.map(issue => [
        issue.month,
        issue.status,
        issue.riceKg,
        issue.ragiKg,
        formatDateTime(issue.issuedAt),
        formatDateTime(issue.distributedAt),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 99, 205] },
    });
    doc.save(`card_history_${cardNo}.pdf`);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Card History</h2>
          <p>Search a ration card and review all owner issues and worker distributions.</p>
        </div>
        {issues.length > 0 && (
          <div className="report-actions">
            <button type="button" className="btn-secondary" onClick={exportPDF}>
              <Download size={17} />
              PDF
            </button>
            <button type="button" className="btn-primary" onClick={exportExcel}>
              <Download size={17} />
              Excel
            </button>
          </div>
        )}
      </header>

      <section className="panel">
        <form className="toolbar" onSubmit={searchHistory}>
          <div className="input-with-icon search-wide">
            <Search size={18} />
            <input
              type="text"
              value={cardNo}
              onChange={event => setCardNo(event.target.value)}
              placeholder="Enter card number"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <div className="alert danger">{error}</div>}
      </section>

      {card && (
        <section className="metric-grid">
          <div className="metric-card neutral">
            <span>Card type</span>
            <strong>{card.cardType || '-'}</strong>
          </div>
          <div className="metric-card rice">
            <span>Total rice issued</span>
            <strong>{formatKg(totals.rice)}</strong>
          </div>
          <div className="metric-card ragi">
            <span>Total ragi issued</span>
            <strong>{formatKg(totals.ragi)}</strong>
          </div>
          <div className="metric-card neutral">
            <span>Distributed visits</span>
            <strong>{totals.distributed}</strong>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-title">
          <h3>History</h3>
          <p>{card ? `${issues.length} records for ${card.cardNo}` : 'Search a card to begin.'}</p>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Status</th>
                <th>Rice quantity</th>
                <th>Ragi quantity</th>
                <th>Issued</th>
                <th>Distributed</th>
              </tr>
            </thead>
            <tbody>
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {loading ? 'Loading history...' : 'No history to show.'}
                  </td>
                </tr>
              ) : (
                issues.map(issue => (
                  <tr key={issue.id}>
                    <td>{issue.month}</td>
                    <td>
                      <span className={`status-pill ${issue.status}`}>{issue.status}</span>
                    </td>
                    <td>{formatKg(issue.riceKg)}</td>
                    <td>{formatKg(issue.ragiKg)}</td>
                    <td>{formatDateTime(issue.issuedAt)}</td>
                    <td>{formatDateTime(issue.distributedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default BuyerHistory;
