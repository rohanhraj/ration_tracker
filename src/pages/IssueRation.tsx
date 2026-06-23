import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Edit2, PlusCircle, Search, Trash2 } from 'lucide-react';
import { useData } from '../store/DataContext';
import type { CardHolder, IssueInput, RationIssue } from '../store/DataContext';
import { formatDateTime, formatKg, getCurrentMonth } from '../utils/format';
import { ISSUE_QUANTITY_FIELDS } from '../utils/rationRules';

const emptyIssueInput = (month: string): IssueInput => ({
  cardNo: '',
  month,
  riceKg: 0,
  ragiKg: 0,
});

const IssueRation = () => {
  const { fetchCardHolders, fetchIssues, createIssue, updateIssue, deleteIssue, clearIssuesForMonth } =
    useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<CardHolder[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardHolder | null>(null);
  const [issues, setIssues] = useState<RationIssue[]>([]);
  const [form, setForm] = useState<IssueInput>(emptyIssueInput(month));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sameMonthIssues = useMemo(
    () => issues.filter(issue => issue.cardNo === form.cardNo && issue.id !== editingId),
    [editingId, form.cardNo, issues]
  );

  const loadIssues = useCallback(async (activeMonth: string) => {
    const data = await fetchIssues(activeMonth);
    setIssues(data);
  }, [fetchIssues]);

  useEffect(() => {
    setForm(current => ({ ...current, month }));
    loadIssues(month).catch(loadError =>
      setError(loadError instanceof Error ? loadError.message : 'Unable to load issue records')
    );
  }, [loadIssues, month]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setCards([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingCards(true);
      try {
        const data = await fetchCardHolders(search.trim());
        setCards(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to search cards');
      } finally {
        setLoadingCards(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [fetchCardHolders, search]);

  const selectCard = (card: CardHolder) => {
    setSelectedCard(card);
    setSearch(card.cardNo);
    setCards([]);
    setForm(current => ({ ...current, cardNo: card.cardNo }));
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedCard(null);
    setSearch('');
    setForm(emptyIssueInput(month));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = editingId
        ? await updateIssue(editingId, form)
        : await createIssue(form);

      setMessage(
        response.duplicateWarning
          ? 'Saved. Warning: this card already has an issue record for this month.'
          : 'Issue record saved.'
      );
      await loadIssues(month);
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save issue');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (issue: RationIssue) => {
    setEditingId(issue.id);
    setSelectedCard(null);
    setSearch(issue.cardNo);
    setForm({
      cardNo: issue.cardNo,
      month: issue.month,
      riceKg: issue.riceKg,
      ragiKg: issue.ragiKg,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (issue: RationIssue) => {
    if (!window.confirm(`Delete issued record for card ${issue.cardNo}?`)) return;
    setError('');
    setMessage('');
    try {
      await deleteIssue(issue.id);
      setMessage('Issued record deleted.');
      await loadIssues(month);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete issue');
    }
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
      resetForm();
      await loadIssues(month);
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
          <h2>Issue Ration</h2>
          <p>Issue monthly ration for a card holder. Worker approval confirms distribution.</p>
        </div>
        <div className="month-picker">
          <label>Month</label>
          <input type="month" value={month} onChange={event => setMonth(event.target.value)} />
        </div>
      </header>

      <section className="panel">
        <div className="section-title">
          <h3>{editingId ? 'Edit Issued Card' : 'New Issue'}</h3>
          <p>Enter rice and ragi quantities for this card.</p>
        </div>

        <form onSubmit={handleSubmit} className="issue-layout">
          <div className="card-search">
            <label>Card number</label>
            <div className="input-with-icon">
              <Search size={18} />
              <input
                type="text"
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setForm(current => ({ ...current, cardNo: event.target.value.trim() }));
                  setSelectedCard(null);
                }}
                placeholder="Search or enter card no"
                required
              />
            </div>
            {cards.length > 0 && (
              <div className="search-results">
                {cards.map(card => (
                  <button type="button" key={card.cardNo} onClick={() => selectCard(card)}>
                    <strong>{card.cardNo}</strong>
                    <span>{card.cardType || 'No card type'}</span>
                  </button>
                ))}
              </div>
            )}
            {loadingCards && <span className="field-note">Searching cards...</span>}
          </div>

          {ISSUE_QUANTITY_FIELDS.map(field => (
            <div key={field.key}>
              <label>{field.label}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form[field.key]}
                onChange={event =>
                  setForm(current => ({ ...current, [field.key]: Number(event.target.value) }))
                }
                required
              />
            </div>
          ))}

          <div className="form-actions">
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              <PlusCircle size={18} />
              {saving ? 'Saving...' : editingId ? 'Update Issue' : 'Issue Ration'}
            </button>
          </div>
        </form>

        {selectedCard && (
          <div className="card-summary">
            <div>
              <span>Card type</span>
              <strong>{selectedCard.cardType || '-'}</strong>
            </div>
          </div>
        )}

        {sameMonthIssues.length > 0 && (
          <div className="alert warning">
            <AlertCircle size={17} />
            This card already has {sameMonthIssues.length} issue record(s) for {month}. Saving is
            still allowed.
          </div>
        )}
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert danger">{error}</div>}
      </section>

      <section className="panel">
        <div className="section-title section-title-row">
          <div>
            <h3>Issued Cards For {month}</h3>
            <p>{issues.length} records</p>
          </div>
          <button
            type="button"
            className="btn-danger"
            onClick={handleClearMonth}
            disabled={issues.length === 0 || clearing}
          >
            <Trash2 size={17} />
            {clearing ? 'Clearing...' : 'Clear Month'}
          </button>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Card No</th>
                <th>Status</th>
                <th>Rice quantity</th>
                <th>Ragi quantity</th>
                <th>Issued</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    No ration issued for this month yet.
                  </td>
                </tr>
              ) : (
                issues.map(issue => (
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
                    <td className="table-actions">
                      {issue.status === 'issued' && (
                        <>
                          <button type="button" title="Edit" onClick={() => startEdit(issue)}>
                            <Edit2 size={16} />
                          </button>
                          <button type="button" title="Delete" onClick={() => handleDelete(issue)}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
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

export default IssueRation;
