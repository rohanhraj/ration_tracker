import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { PackageCheck, Save, Scale, Wheat } from 'lucide-react';
import { useData } from '../store/DataContext';
import type { InventoryInput, InventorySnapshot } from '../store/DataContext';
import { formatKg, getCurrentMonth } from '../utils/format';

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

const InventoryDashboard = () => {
  const { fetchInventory, saveInventory } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [inventory, setInventory] = useState<InventorySnapshot>(emptyInventory(month));
  const [form, setForm] = useState<InventoryInput>({
    riceAmount: 0,
    riceMeasure: 'kg',
    ragiAmount: 0,
    ragiMeasure: 'kg',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchInventory(month);
        setInventory(data);
        setForm({
          riceAmount: data.riceTotalKg,
          riceMeasure: 'kg',
          ragiAmount: data.ragiTotalKg,
          ragiMeasure: 'kg',
        });
      } catch (loadError) {
        setInventory(emptyInventory(month));
        setError(loadError instanceof Error ? loadError.message : 'Unable to load stock');
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, [fetchInventory, month]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await saveInventory(month, form);
      setInventory(updated);
      setForm({
        riceAmount: updated.riceTotalKg,
        riceMeasure: 'kg',
        ragiAmount: updated.ragiTotalKg,
        ragiMeasure: 'kg',
      });
      setMessage('Monthly stock saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Inventory Dashboard</h2>
          <p>Enter monthly stock and track remaining rice and ragi after worker approval.</p>
        </div>
        <div className="month-picker">
          <label>Month</label>
          <input type="month" value={month} onChange={event => setMonth(event.target.value)} />
        </div>
      </header>

      <section className="metric-grid">
        <div className="metric-card rice">
          <Scale size={22} />
          <span>Total Rice</span>
          <strong>{formatKg(inventory.riceTotalKg)}</strong>
        </div>
        <div className="metric-card rice">
          <PackageCheck size={22} />
          <span>Rice Remaining</span>
          <strong>{formatKg(inventory.riceRemainingKg)}</strong>
        </div>
        <div className="metric-card ragi">
          <Wheat size={22} />
          <span>Total Ragi</span>
          <strong>{formatKg(inventory.ragiTotalKg)}</strong>
        </div>
        <div className="metric-card ragi">
          <PackageCheck size={22} />
          <span>Ragi Remaining</span>
          <strong>{formatKg(inventory.ragiRemainingKg)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h3>Monthly Stock Entry</h3>
          <p>{loading ? 'Loading stock...' : `${inventory.distributedCount} cards distributed this month.`}</p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid stock-form">
          <div>
            <label>Rice quantity</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.riceAmount}
              onChange={event =>
                setForm(current => ({ ...current, riceAmount: Number(event.target.value) }))
              }
              required
            />
          </div>
          <div>
            <label>Rice measure</label>
            <select
              value={form.riceMeasure}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  riceMeasure: event.target.value as InventoryInput['riceMeasure'],
                }))
              }
            >
              <option value="kg">kg</option>
              <option value="quintal">quintal</option>
            </select>
          </div>
          <div>
            <label>Ragi quantity</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.ragiAmount}
              onChange={event =>
                setForm(current => ({ ...current, ragiAmount: Number(event.target.value) }))
              }
              required
            />
          </div>
          <div>
            <label>Ragi measure</label>
            <select
              value={form.ragiMeasure}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  ragiMeasure: event.target.value as InventoryInput['ragiMeasure'],
                }))
              }
            >
              <option value="kg">kg</option>
              <option value="quintal">quintal</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Stock'}
            </button>
          </div>
        </form>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert danger">{error}</div>}
      </section>

      <section className="panel compact-panel">
        <div className="stock-breakdown">
          <div>
            <span>Rice distributed</span>
            <strong>{formatKg(inventory.riceDistributedKg)}</strong>
          </div>
          <div>
            <span>Ragi distributed</span>
            <strong>{formatKg(inventory.ragiDistributedKg)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InventoryDashboard;
