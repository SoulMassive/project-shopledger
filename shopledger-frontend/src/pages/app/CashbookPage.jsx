import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import toast from "react-hot-toast";

function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function CashbookPage() {
  const [tab, setTab] = useState("All"); // Kept internally for backward compatibility if needed
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ total_in: 0, total_out: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [modalType, setModalType] = useState("cash_in"); 

  const getLocalDate = (dateObj = new Date()) => {
    const d = dateObj;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const [form, setForm] = useState({
    amount: '',
    category: '',
    paymentMode: 'Cash',
    note: '',
    entry_date: getLocalDate()
  });

  const [filters, setFilters] = useState({
    date: '',
    paymentMode: 'All'
  });

  const fetchData = async () => {
    try {
      const [resEntries, resStats] = await Promise.all([
        api.get('/cashbook'),
        api.get('/cashbook/stats')
      ]);
      setEntries(resEntries.data.data);
      setStats(resStats.data.data);
    } catch (err) {
      toast.error("Failed to load cashbook data");
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
      await api.post('/cashbook', { ...form, type: modalType });
      toast.success(`${modalType === 'cash_in' ? 'Cash In' : 'Cash Out'} recorded!`);
      setOpen(false);
      setForm({ amount: '', category: '', note: '', entry_date: getLocalDate() });
      fetchData();
    } catch (err) {
      toast.error("Failed to save entry");
    }
  };

  const filtered = entries.filter(e => {
    const rawDate = e.entry_date || e.date || '';
    const dateStr = String(rawDate);
    const entryDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const matchesDate = !filters.date || entryDate === filters.date;
    
    let matchesMode = true;
    if (filters.paymentMode === "Cash In") matchesMode = e.type === "cash_in";
    else if (filters.paymentMode === "Cash Out") matchesMode = e.type === "cash_out";
    else if (filters.paymentMode !== "All") matchesMode = e.paymentMode === filters.paymentMode;
    
    return matchesDate && matchesMode;
  });

  if (loading) return <div className="p-10 text-center text-slate-500">Loading cashbook...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#0F172A]">Cashbook</h2>
          <p className="text-slate-500 text-sm font-medium">Manage your daily physical cash flow and expenses.</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn h-12 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 px-6" 
            onClick={() => { setModalType("cash_in"); setOpen(true); }}
            type="button"
          >
            <Icon name="add_circle" className="mr-2" />
            Cash In
          </button>
          <button 
            className="btn h-12 bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20 px-6" 
            onClick={() => { setModalType("cash_out"); setOpen(true); }}
            type="button"
          >
            <Icon name="remove_circle" className="mr-2" />
            Cash Out
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="premium-card p-6 border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Cash In Total</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{formatCurrency(stats.total_in)}</p>
        </div>
        <div className="premium-card p-6 border-l-4 border-l-rose-500">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Cash Out Total</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{formatCurrency(stats.total_out)}</p>
        </div>
        <div className="premium-card p-6 bg-[#0F172A] text-white">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Net Cash Balance</p>
          <p className={`mt-2 text-3xl font-black ${stats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(stats.balance)}
          </p>
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="flex flex-col md:flex-row bg-slate-50 border-b border-slate-100 p-4 gap-6">
          <div className="flex flex-1 gap-6 items-center">
            <div className="flex-1 max-w-[200px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Record Date</label>
              <input 
                type="date" 
                value={filters.date} 
                onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-[#0F172A] focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="hidden md:block w-px h-8 bg-slate-200" />

            <div className="flex-1 max-w-[200px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Payment Mode</label>
              <select 
                value={filters.paymentMode} 
                onChange={(e) => setFilters(f => ({ ...f, paymentMode: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-[#0F172A] focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="All">All</option>
                <option value="Cash In">Cash In</option>
                <option value="Cash Out">Cash Out</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-head !bg-white">
              <tr>
                <th className="table-cell">Date</th>
                <th className="table-cell">Category</th>
                <th className="table-cell">Notes</th>
                <th className="table-cell text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan="4" className="table-cell text-center py-10 text-slate-400">No records found for this period.</td></tr>
              )}
              {filtered.map((e, idx) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="table-cell text-slate-500 font-medium">{formatDate(e.entry_date || e.date)}</td>
                  <td className="table-cell">
                    <div className="flex flex-col gap-1">
                      <span className="px-3 py-1 rounded-full bg-slate-100/80 text-slate-600 text-[10px] font-black uppercase tracking-tight w-fit">
                        {e.category || 'General'}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ml-1 ${e.paymentMode === 'Online' ? 'text-indigo-500' : e.paymentMode === 'UPI' ? 'text-emerald-500 font-black' : 'text-slate-400'}`}>
                        {e.paymentMode || 'Cash'}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-400 text-xs italic max-w-[200px] truncate">{e.note || e.notes || '—'}</td>
                  <td className={`table-cell text-right font-black text-base ${e.type === "cash_in" ? "text-emerald-600" : "text-rose-600"}`}>
                    {e.type === "cash_in" ? "+" : "-"} {formatCurrency(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[999] grid place-items-center bg-[#0F172A]/10 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setOpen(false)}>
          <div className="premium-card w-full max-w-sm shadow-[0_40px_80px_-15px_rgba(0,0,0,0.25)] p-0 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className={`border-b border-slate-100 p-8 ${modalType === 'cash_in' ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
               <div className="flex items-center gap-3">
                 <div className={`h-10 w-10 rounded-xl flex items-center justify-center ring-4 ${modalType === 'cash_in' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/5' : 'bg-rose-50 text-rose-600 ring-rose-500/5'}`}>
                    <Icon name={modalType === 'cash_in' ? 'add_circle' : 'remove_circle'} className="text-2xl" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tight text-[#0F172A]">Cash {modalType === 'cash_in' ? 'In' : 'Out'}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Physical Cash Record</p>
                 </div>
               </div>
            </div>

            <form className="p-8 space-y-5" onSubmit={handleSave}>
              <div className="space-y-1.5">
                <label className="label">Amount*</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-bold">₹</span>
                  <input className="input !pl-10 text-2xl font-black text-slate-800" type="number" name="amount" value={form.amount} onChange={handleChange} required placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Mode</label>
                  <select className="input !h-12 !text-sm cursor-pointer" name="paymentMode" value={form.paymentMode} onChange={handleChange}>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="label">Date</label>
                  <input className="input !h-12 !text-sm" type="date" name="entry_date" value={form.entry_date} onChange={handleChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Category</label>
                  <input className="input !h-12 !text-sm" list="categories" name="category" value={form.category} onChange={handleChange} placeholder="Sales, Rent..." />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Notes (Optional)</label>
                <textarea className="input min-h-[80px] py-3 !text-sm leading-relaxed" name="note" value={form.note} onChange={handleChange} placeholder="Describe the transaction..." />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="btn h-12 !border-none text-slate-400 font-bold px-6 hover:text-slate-600 transition-colors">Discard</button>
                <button 
                  className={`btn h-12 px-8 text-white font-bold rounded-xl shadow-lg ${modalType === 'cash_in' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`} 
                  type="submit"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default CashbookPage;
