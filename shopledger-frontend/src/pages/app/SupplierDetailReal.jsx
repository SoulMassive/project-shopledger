import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import toast from "react-hot-toast";

function SupplierDetailReal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    type: 'cash_in', // cash_in (Bill), cash_out (Payment)
    amount: '',
    category: 'Payment',
    note: '',
    txn_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      const [resSup, resTx] = await Promise.all([
        api.get(`/suppliers/${id}`),
        api.get('/transactions')
      ]);
      setSupplier(resSup.data.data);
      const allTx = resTx.data.data || [];
      const filteredTx = allTx.filter(t => String(t.supplier_id) === String(id) || (t.party_type === 'supplier' && String(t.party_id) === String(id)));
      setTransactions(filteredTx);
    } catch (err) {
      toast.error("Failed to load supplier details");
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSaveTx = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        party_type: 'supplier',
        party_id: id,
        type: form.type,
        amount: Number(form.amount),
        category: form.category,
        note: form.note,
        txn_date: form.txn_date
      };
      await api.post('/transactions', payload);
      toast.success("Transaction recorded!");
      setOpen(false);
      setForm({ type: 'cash_in', amount: '', category: 'Payment', note: '', txn_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) {
      toast.error("Failed to save transaction");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this supplier record?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted");
      navigate('/suppliers');
    } catch (err) {
      toast.error("Failed to delete supplier");
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest opacity-50">Data Loading...</div>;
  if (!supplier) return <div className="p-10 text-center text-rose-500 font-black tracking-tight">Supplier Not Found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/suppliers" className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0F172A] text-white hover:bg-slate-700 shadow-xl transition-all">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{supplier.name}</h2>
            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">{supplier.phone || 'No Contact'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={handleDelete} className="px-5 py-2 text-xs font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest" type="button">Remove</button>
           <button onClick={() => setOpen(true)} className="btn bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 px-6 shadow-xl shadow-slate-900/10" type="button">
             <span className="material-symbols-outlined text-[20px]">add_circle</span>
             Record Entry
           </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
         <div className="card shadow-2xl shadow-slate-200 border-none bg-blue-600 text-white md:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Current Liability</p>
            <p className="mt-2 text-4xl font-black">{formatCurrency(Math.abs(supplier.balance))}</p>
            <p className="mt-2 text-xs font-bold text-blue-100 opacity-80 uppercase tracking-tighter">
               {Number(supplier.balance) >= 0 ? "Amount you owe" : "Advance you paid"}
            </p>
         </div>
         <div className="card shadow-md border-none bg-white md:col-span-2">
            <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">Supplier Profile</h3>
            <div className="grid gap-6 sm:grid-cols-2">
               <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email Address</p><p className="font-bold text-slate-700">{supplier.email || '-'}</p></div>
               <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Office Address</p><p className="font-bold text-slate-700 truncate">{supplier.address || '-'}</p></div>
            </div>
         </div>
      </div>

      <div className="card shadow-lg border-slate-100">
         <h3 className="text-xl font-black text-slate-800 tracking-tight mb-6">Payment Timeline</h3>
         <div className="table-wrap">
            <table className="w-full text-sm">
               <thead>
                  <tr className="bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px]">
                     <th className="table-cell">Date</th>
                     <th className="table-cell">Activity</th>
                     <th className="table-cell">Reason</th>
                     <th className="table-cell text-right">Amount</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 italic">
                  {transactions.length === 0 && (
                     <tr><td colSpan="4" className="table-cell text-center py-16 text-slate-300 font-bold uppercase tracking-widest">No activity found.</td></tr>
                  )}
                  {transactions.map((tx) => (
                     <tr key={tx.id}>
                        <td className="table-cell text-slate-500 font-bold not-italic">{formatDate(tx.txn_date || tx.date)}</td>
                        <td className="table-cell">
                           <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${tx.type === "cash_in" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {tx.type === "cash_in" ? "Purchase/Bill" : "Payment Made"}
                           </span>
                        </td>
                        <td className="table-cell font-bold text-slate-700 not-italic">{tx.category || 'General'}</td>
                        <td className={`table-cell text-right font-black text-base not-italic ${tx.type === "cash_in" ? "text-rose-600" : "text-emerald-600"}`}>
                           {formatCurrency(tx.amount)}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md shadow-2xl p-0 overflow-hidden border-none" onClick={(e) => e.stopPropagation()}>
            <div className={`p-8 text-white ${form.type === 'cash_in' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
               <h3 className="text-3xl font-black tracking-tight">{form.type === 'cash_in' ? 'Record Bill' : 'Record Payment'}</h3>
               <p className="text-white/80 text-sm font-bold mt-1 opacity-90 uppercase tracking-widest font-mono">Supplier: {supplier.name}</p>
            </div>
            <form className="p-8 space-y-6" onSubmit={handleSaveTx}>
              <div className="grid grid-cols-2 gap-4 bg-slate-100 p-2 rounded-2xl">
                 <button type="button" onClick={() => setForm(f => ({...f, type: 'cash_in', category: 'Purchase'}))} className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'cash_in' ? 'bg-white text-rose-600 shadow-md transform scale-105' : 'text-slate-500'}`}>Purchase/Bill</button>
                 <button type="button" onClick={() => setForm(f => ({...f, type: 'cash_out', category: 'Payment'}))} className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'cash_out' ? 'bg-white text-emerald-600 shadow-md transform scale-105' : 'text-slate-500'}`}>Payment</button>
              </div>
              <div className="relative">
                 <label className="text-[10px] font-black uppercase text-slate-400 absolute left-3 top-3.5 z-10">Total Amount*</label>
                 <span className="absolute left-3 bottom-3 text-slate-300 font-black text-3xl">₹</span>
                 <input className="input pl-10 pt-10 pb-4 text-4xl font-black text-slate-900 border-none focus:ring-0 bg-slate-50 rounded-2xl" type="number" name="amount" value={form.amount} onChange={(e) => setForm(f => ({...f, amount: e.target.value}))} required placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-3 top-2.5 z-10">Category</label>
                    <input className="input pt-7" name="category" list="cat-list" value={form.category} onChange={(e) => setForm(f => ({...f, category: e.target.value}))} />
                    <datalist id="cat-list"><option value="Product Purchase"/><option value="Advance Payment"/><option value="Return"/><option value="Misc"/></datalist>
                 </div>
                  <div className="relative">
                     <label className="text-[10px] font-black uppercase text-slate-400 absolute left-3 top-2.5 z-10">Transaction Date</label>
                     <input className="input pt-7" type="date" name="txn_date" value={form.txn_date} onChange={(e) => setForm(f => ({...f, txn_date: e.target.value}))} />
                  </div>
               </div>
               <textarea className="input min-h-[90px] pt-4" name="note" placeholder="Optional internal notes..." value={form.note} onChange={(e) => setForm(f => ({...f, note: e.target.value}))} />
               <div className="flex justify-end gap-3 pt-4 items-center">
                 <button type="button" onClick={() => setOpen(false)} className="px-6 py-2 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Dismiss</button>
                 <button className={`btn h-14 px-12 text-white font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${form.type === 'cash_in' ? 'bg-rose-600 shadow-rose-600/30' : 'bg-emerald-600 shadow-emerald-600/30'}`} type="submit">Complete Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplierDetailReal;
