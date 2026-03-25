import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import toast from "react-hot-toast";

function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function SuppliersPage() {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({ total_suppliers: 0, total_payable: 0, total_receivable: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    initialBalance: 0,
    balanceType: 'payable',
    address: ''
  });

  const fetchData = async () => {
    try {
      const [resSup, resStats] = await Promise.all([
        api.get('/suppliers'),
        api.get('/suppliers/stats')
      ]);
      setSuppliers(resSup.data.data);
      setStats(resStats.data.data);
    } catch (err) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        initialBalance: form.balanceType === 'receivable' ? -Math.abs(form.initialBalance) : Math.abs(form.initialBalance)
      };
      await api.post('/suppliers', payload);
      toast.success("Supplier added!");
      setOpen(false);
      setForm({ name: '', phone: '', email: '', initialBalance: 0, balanceType: 'payable', address: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save supplier");
    }
  };

  const filtered = suppliers.filter(s => 
    (s.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (s.phone || "").includes(search)
  );

  if (loading) return <div className="p-10 text-center text-slate-500">Loading suppliers...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#0F172A]">Suppliers</h2>
          <p className="text-slate-500 text-sm font-medium">Track your inventory sources and procurement costs.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary" type="button">
          <Icon name="local_shipping" className="mr-2" />
          Add Supplier
        </button>
      </div>
      
      <div className="flex gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-3.5 material-symbols-outlined text-slate-400">search</span>
          <input 
            className="input !pl-12" 
            placeholder="Search suppliers by name or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="premium-card p-6">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Total Suppliers</p>
          <p className="mt-2 text-3xl font-black text-[#0F172A]">{stats.total_suppliers}</p>
        </div>
        <div className="premium-card p-6 border-l-4 border-l-rose-500">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">To Pay (Payable)</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{formatCurrency(stats.total_payable)}</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="table-cell">Supplier</th>
              <th className="table-cell">Balance</th>
              <th className="table-cell">Registered</th>
              <th className="table-cell text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="4" className="table-cell text-center text-slate-400 py-10">No suppliers found. Add your first supplier to get started!</td></tr>
            )}
            {filtered.map((s, idx) => (
              <tr key={s.id} className={idx % 2 ? "bg-slate-50" : "bg-white"}>
                <td className="table-cell">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.phone || 'No phone'}</p>
                </td>
                <td className="table-cell font-medium">
                  <span className={`status-badge ${s.balance >= 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {Number(s.balance) >= 0 ? "To Pay" : "Advance Paid"} {formatCurrency(Math.abs(s.balance))}
                  </span>
                </td>
                <td className="table-cell text-slate-500">{formatDate(s.created_at)}</td>
                <td className="table-cell text-right">
                  <Link className="btn-secondary" to={`/suppliers/${s.id}`}>View Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[999] grid place-items-center bg-[#0F172A]/10 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setOpen(false)}>
          <div className="premium-card w-full max-w-md shadow-[0_40px_80px_-15px_rgba(0,0,0,0.25)] p-0 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b border-slate-100 p-8">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] ring-4 ring-indigo-500/5">
                    <Icon name="local_shipping" className="text-2xl" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tight text-[#0F172A]">Add New Supplier</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Setup Trade Profile</p>
                 </div>
               </div>
            </div>

            <form className="p-8 space-y-5" onSubmit={handleSave}>
              <div className="space-y-1.5">
                <label className="label">Supplier Name*</label>
                <input className="input" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. ABC Wholesalers" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Phone*</label>
                  <input className="input" name="phone" value={form.phone} onChange={handleChange} required placeholder="99XXX XXX11" />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Opening Balance</label>
                  <input className="input text-center" type="number" name="initialBalance" value={form.initialBalance} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Balance Type</label>
                <select className="input" name="balanceType" value={form.balanceType} onChange={handleChange}>
                  <option value="payable">I owe them (To Pay)</option>
                  <option value="receivable">I paid in advance (Advance)</option>
                </select>
              </div>

              <div className="space-y-1.5 flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setOpen(false)} className="btn h-12 !border-none text-slate-400 font-bold px-6 hover:text-slate-600 transition-colors">Discard</button>
                <button className="btn-primary !h-12 px-8 shadow-xl shadow-indigo-500/20" type="submit">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default SuppliersPage;
