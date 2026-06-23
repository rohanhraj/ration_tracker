import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../store/DataContext';
import type { InventorySnapshot, IssueStatus, RationIssue } from '../store/DataContext';
import { exportToExcel } from '../utils/exportUtils';
import { formatDateTime, formatKg, getCurrentMonth } from '../utils/format';

const emptyInventory = (month: string): InventorySnapshot => ({
  month,
  riceTotalKg: 0,
  ragiTotalKg: 0,
  riceDistributedKg: 0,
  ragiDistributedKg: 0,
  riceRemainingKg: 0,
  ragiRemainingKg: 0,
  distributedCount: 0,
});

const MonthlyReport = () => {
  const { fetchIssues, fetchInventory, clearIssuesForMonth } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [status, setStatus] = useState<IssueStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [issues, setIssues] = useState<RationIssue[]>([]);
  const [inventory, setInventory] = useState<InventorySnapshot>(emptyInventory(month));
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filteredIssues = useMemo(() => {
    if (!search.trim()) return issues;
    return issues.filter(issue => issue.cardNo.includes(search.trim()));
  }, [issues, search]);

  const totals = useMemo(
    () => ({
      issuedRice: issues.reduce((sum, issue) => sum + issue.riceKg, 0),
      issuedRagi: issues.reduce((sum, issue) => sum + issue.ragiKg, 0),
      distributedCards: issues.filter(issue => issue.status === 'distributed').length,
      pendingCards: issues.filter(issue => issue.status === 'issued').length,
    }),
    [issues]
  );

  const loadReport = useCallback(async () => {
      setLoading(true);
      setError('');
      try {
        const [issueData, inventoryData] = await Promise.all([
          fetchIssues(month, status === 'all' ? undefined : status),
          fetchInventory(month),
        ]);
        setIssues(issueData);
        setInventory(inventoryData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load monthly report');
      } finally {
        setLoading(false);
      }
    }, [fetchInventory, fetchIssues, month, status]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const reportRows = filteredIssues.map(issue => ({
    'Card No': issue.cardNo,
    Status: issue.status,
    'Rice quantity': issue.riceKg,
    'Ragi quantity': issue.ragiKg,
    'Issued At': formatDateTime(issue.issuedAt),
    'Distributed At': formatDateTime(issue.distributedAt),
  }));

  const exportExcel = () => {
    exportToExcel(reportRows, `monthly_ration_report_${month}`, 'Monthly Report');
  };

  const exportPDF = () => {
    if (reportRows.length === 0) return;
    const doc = new jsPDF();
    doc.text(`Monthly Ration Report - ${month}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Card No', 'Status', 'Rice quantity', 'Ragi quantity', 'Issued', 'Distributed']],
      body: filteredIssues.map(issue => [
        issue.cardNo,
        issue.status,
        issue.riceKg,
        issue.ragiKg,
        formatDateTime(issue.issuedAt),
        formatDateTime(issue.distributedAt),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 99, 205] },
    });
    doc.save(`monthly_ration_report_${month}.pdf`);
  };

  const handleClearMonth = async () => {
    if (issues.length === 0) return;
    if (
      !window.confirm(
        `Delete all ${issues.length} issued/distributed record(s) for ${month}? Card holders and stock entries will remain.`
      )
    ) {
      return;
    }

    setClearing(true);
    setError('');
    setMessage('');
    try {
      const deletedCount = await clearIssuesForMonth(month);
      setMessage(`Cleared ${deletedCount} issue record(s) for ${month}.`);
      await loadReport();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear monthly issues');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Monthly Report</h2>
          <p>Review issued and distributed ration records for a selected month.</p>
        </div>
        <div className="report-actions">
          <button
            type="button"
            className="btn-danger"
            onClick={handleClearMonth}
            disabled={issues.length === 0 || clearing}
          >
            <Trash2 size={17} />
            {clearing ? 'Clearing...' : 'Clear Month'}
          </button>
          <button type="button" className="btn-secondary" onClick={exportPDF} disabled={reportRows.length === 0}>
            <Download size={17} />
            PDF
          </button>
          <button type="button" className="btn-primary" onClick={exportExcel} disabled={reportRows.length === 0}>
            <Download size={17} />
            Excel
          </button>
        </div>
      </header>

      <section className="metric-grid">
        <div className="metric-card rice">
          <span>Rice issued</span>
          <strong>{formatKg(totals.issuedRice)}</strong>
        </div>
        <div className="metric-card ragi">
          <span>Ragi issued</span>
          <strong>{formatKg(totals.issuedRagi)}</strong>
        </div>
        <div className="metric-card rice">
          <span>Rice remaining</span>
          <strong>{formatKg(inventory.riceRemainingKg)}</strong>
        </div>
        <div className="metric-card ragi">
          <span>Ragi remaining</span>
          <strong>{formatKg(inventory.ragiRemainingKg)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <div className="month-picker inline">
            <label>Month</label>
            <input type="month" value={month} onChange={event => setMonth(event.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={event => setStatus(event.target.value as IssueStatus | 'all')}>
              <option value="all">All</option>
              <option value="issued">Issued</option>
              <option value="distributed">Distributed</option>
            </select>
          </div>
          <div className="input-with-icon search-wide">
            <Search size={18} />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search card number"
            />
          </div>
        </div>

        <div className="summary-strip">
          <span>{totals.pendingCards} pending</span>
          <span>{totals.distributedCards} distributed</span>
          <span>{issues.length} total records</span>
        </div>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert danger">{error}</div>}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Card No</th>
                <th>Status</th>
                <th>Rice quantity</th>
                <th>Ragi quantity</th>
                <th>Issued</th>
                <th>Distributed</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {loading ? 'Loading report...' : 'No records found.'}
                  </td>
                </tr>
              ) : (
                filteredIssues.map(issue => (
                  <tr key={issue.id}>
                    <td>
                      <strong>{issue.cardNo}</strong>
                      <span className="muted block">{issue.cardType}</span>
                    </td>
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

export default MonthlyReport;
