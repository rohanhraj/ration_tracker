import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Edit2, Plus, Save, Search } from 'lucide-react';
import { useData } from '../store/DataContext';
import type { CardHolder, CardHolderInput } from '../store/DataContext';

const emptyCard: CardHolderInput = {
  cardNo: '',
  cardType: '',
  isActive: true,
};

const CardHolders = () => {
  const { fetchCardHolders, createCardHolder, updateCardHolder } = useData();
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<CardHolder[]>([]);
  const [form, setForm] = useState<CardHolderInput>(emptyCard);
  const [editingCardNo, setEditingCardNo] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCardHolders(search.trim(), includeInactive);
      setCards(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load card holders');
    } finally {
      setLoading(false);
    }
  }, [fetchCardHolders, includeInactive, search]);

  useEffect(() => {
    const timer = window.setTimeout(loadCards, 250);
    return () => window.clearTimeout(timer);
  }, [loadCards]);

  const startEdit = (card: CardHolder) => {
    setEditingCardNo(card.cardNo);
    setForm({
      cardNo: card.cardNo,
      cardType: card.cardType,
      isActive: card.isActive,
    });
    setMessage('');
    setError('');
  };

  const resetForm = () => {
    setEditingCardNo(null);
    setForm(emptyCard);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (editingCardNo) {
        await updateCardHolder(editingCardNo, form);
        setMessage('Card holder updated.');
      } else {
        await createCardHolder(form);
        setMessage('New card holder added.');
      }
      resetForm();
      await loadCards();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save card holder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Card Holders</h2>
          <p>Search the preloaded ration cards, add new cards, and keep card details current.</p>
        </div>
      </header>

      <section className="panel">
        <div className="section-title">
          <h3>{editingCardNo ? 'Edit Card Holder' : 'Add Card Holder'}</h3>
          <p>Seeded cards are preserved; owner edits are not overwritten during startup.</p>
        </div>

        <form className="form-grid card-form" onSubmit={handleSubmit}>
          <div>
            <label>Card number</label>
            <input
              type="text"
              value={form.cardNo}
              onChange={event => setForm(current => ({ ...current, cardNo: event.target.value }))}
              required
            />
          </div>
          <div>
            <label>Card type</label>
            <input
              type="text"
              value={form.cardType}
              onChange={event => setForm(current => ({ ...current, cardType: event.target.value }))}
              placeholder="PHH(NK) / NCS"
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))}
            />
            Active card
          </label>
          <div className="form-actions">
            {editingCardNo && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {editingCardNo ? <Save size={18} /> : <Plus size={18} />}
              {saving ? 'Saving...' : editingCardNo ? 'Save Changes' : 'Add Card'}
            </button>
          </div>
        </form>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert danger">{error}</div>}
      </section>

      <section className="panel">
        <div className="toolbar">
          <div className="input-with-icon search-wide">
            <Search size={18} />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search card number or card type"
            />
          </div>
          <label className="check-row slim">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={event => setIncludeInactive(event.target.checked)}
            />
            Show inactive
          </label>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Card No</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    {loading ? 'Loading cards...' : 'No cards found.'}
                  </td>
                </tr>
              ) : (
                cards.map(card => (
                  <tr key={card.cardNo}>
                    <td>
                      <strong>{card.cardNo}</strong>
                    </td>
                    <td>{card.cardType || '-'}</td>
                    <td>
                      <span className={`status-pill ${card.isActive ? 'active' : 'inactive'}`}>
                        {card.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button type="button" title="Edit card" onClick={() => startEdit(card)}>
                        <Edit2 size={16} />
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

export default CardHolders;
