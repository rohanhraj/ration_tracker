import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { useData } from '../store/DataContext';
import type { RationIssue } from '../store/DataContext';
import { formatDateTime, formatKg, getCurrentMonth } from '../utils/format';

const WorkerDistribution = () => {
  const { fetchIssues, distributeIssue } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState('');
  const [issues, setIssues] = useState<RationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredIssues = useMemo(() => {
    if (!search.trim()) return issues;
    return issues.filter(issue => issue.cardNo.includes(search.trim()));
  }, [issues, search]);

  const pendingTotals = useMemo(
    () => ({
      rice: issues.reduce((sum, issue) => sum + issue.riceKg, 0),
      ragi: issues.reduce((sum, issue) => sum + issue.ragiKg, 0),
    }),
    [issues]
  );

  const loadData = useCallback(async (activeMonth: string) => {
    setLoading(true);
    setError('');
    try {
      const issueData = await fetchIssues(activeMonth, 'issued');
      setIssues(issueData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load issued cards');
    } finally {
      setLoading(false);
    }
  }, [fetchIssues]);

  useEffect(() => {
    loadData(month);
  }, [loadData, month]);

  const handleApprove = async (issue: RationIssue) => {
    setApprovingId(issue.id);
    setMessage('');
    setError('');
    try {
      await distributeIssue(issue.id);
      setIssues(current => current.filter(item => item.id !== issue.id));
      setMessage(`Distribution approved for card ${issue.cardNo}.`);
    } catch (approvalError) {
      setError(
        approvalError instanceof Error ? approvalError.message : 'Unable to approve distribution'
      );
      await loadData(month);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Distribution</h2>
          <p>Approve issued ration cards after rice and ragi are distributed.</p>
        </div>
        <div className="month-picker">
          <label>Month</label>
          <input type="month" value={month} onChange={event => setMonth(event.target.value)} />
        </div>
      </header>

      <section className="metric-grid">
        <div className="metric-card rice">
          <span>Pending rice</span>
          <strong>{formatKg(pendingTotals.rice)}</strong>
        </div>
        <div className="metric-card ragi">
          <span>Pending ragi</span>
          <strong>{formatKg(pendingTotals.ragi)}</strong>
        </div>
        <div className="metric-card neutral">
          <span>Pending cards</span>
          <strong>{issues.length}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <div className="input-with-icon search-wide">
            <Search size={18} />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search card number"
            />
          </div>
          <button type="button" className="btn-secondary" onClick={() => loadData(month)}>
            Refresh
          </button>
        </div>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert danger">{error}</div>}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Card No</th>
                <th>Rice quantity</th>
                <th>Ragi quantity</th>
                <th>Issued</th>
                <th>Approve</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    {loading ? 'Loading issued cards...' : 'No issued cards pending distribution.'}
                  </td>
                </tr>
              ) : (
                filteredIssues.map(issue => (
                  <tr key={issue.id}>
                    <td>
                      <strong>{issue.cardNo}</strong>
                      <span className="muted block">{issue.cardType}</span>
                    </td>
                    <td>{formatKg(issue.riceKg)}</td>
                    <td>{formatKg(issue.ragiKg)}</td>
                    <td>{formatDateTime(issue.issuedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleApprove(issue)}
                        disabled={approvingId === issue.id}
                      >
                        <CheckCircle2 size={18} />
                        {approvingId === issue.id ? 'Approving...' : 'Approve'}
                      </button>
                    </td>
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

export default WorkerDistribution;
