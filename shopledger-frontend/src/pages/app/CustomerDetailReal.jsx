import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import toast from "react-hot-toast";

function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function CustomerDetailReal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    type: 'cash_out', // cash_out (You Gave), cash_in (You Got)
    amount: '',
    category: 'Payment',
    note: '',
    txn_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      const [resCust, resTx] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get('/transactions')
      ]);
      setCustomer(resCust.data.data);
      const allTx = resTx.data.data || [];
      const filteredTx = allTx.filter(t => 
        (t.party_type === 'customer' && String(t.party_id) === String(id)) || 
        String(t.customer_id) === String(id)
      );
      setTransactions(filteredTx);
    } catch (err) {
      toast.error("Failed to load customer details");
      navigate('/customers');
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
        party_type: 'customer',
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
      setForm({ type: 'cash_out', amount: '', category: 'Payment', note: '', txn_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) {
      toast.error("Failed to save transaction");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This will delete the customer and all associated records.")) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer deleted");
      navigate('/customers');
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest opacity-50">Data Loading...</div>;
  if (!customer) return <div className="p-10 text-center text-rose-500 font-black tracking-tight">Customer Not Found.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link to="/customers" className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
            <Icon name="arrow_back" className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[#0F172A]">{customer.name}</h2>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest ring-4 ring-indigo-500/5">{customer.phone || 'No Contact'}</span>
               <span className="h-1 w-1 rounded-full bg-slate-300" />
               <button onClick={handleDelete} className="text-[10px] text-rose-400 hover:text-rose-600 font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                  <Icon name="delete" className="text-sm" /> Delete Customer
               </button>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setOpen(true)} 
          className="btn-primary !h-12 px-8" 
          type="button"
        >
          <Icon name="add_circle" className="mr-2" />
          Record Entry
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
         <div className="premium-card p-6 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Balance</p>
              <p className={`mt-2 text-4xl font-black ${Number(customer.balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(Math.abs(customer.balance))}
              </p>
            </div>
            <div className={`mt-6 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${Number(customer.balance) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
               <Icon name={Number(customer.balance) >= 0 ? 'verified' : 'error'} className="text-sm" />
               {Number(customer.balance) >= 0 ? "Customer Advance / Surplus" : "Amount Customer Owes You"}
            </div>
         </div>
         <div className="premium-card md:col-span-2 p-0 overflow-hidden">
            <div className="bg-slate-50/50 border-b border-slate-100 p-4">
               <h3 className="text-[10px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-2">
                  <Icon name="account_circle" className="text-xs" /> Customer Profile
               </h3>
            </div>
            <div className="p-6 grid gap-6 sm:grid-cols-2">
               <div className="space-y-1">
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email Address</p>
                 <p className="font-bold text-slate-700 text-sm">{customer.email || 'Not provided'}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Shop Address</p>
                 <p className="font-bold text-slate-700 text-sm">{customer.address || 'No address saved'}</p>
               </div>
            </div>
         </div>
      </div>

      <div className="premium-card overflow-hidden">
         <div className="bg-slate-50/50 border-b border-slate-100 p-4">
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
               <Icon name="history" className="text-indigo-500" /> Transaction Timeline
            </h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="table-head !bg-white">
                     <th className="table-cell">Date</th>
                     <th className="table-cell">Activity</th>
                     <th className="table-cell text-right">Amount</th>
                     <th className="table-cell text-right">Balance</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {transactions.length === 0 && (
                     <tr><td colSpan="4" className="table-cell text-center py-20 text-slate-400 font-medium italic">No ledger activity found for this customer.</td></tr>
                  )}
                  {(() => {
                    // Compute running balances
                    let current = Number(customer.balance);
                    const withBalances = [...transactions].reverse().map(tx => {
                      const entryBalance = current;
                      // Backtrack logic: cash_in (+) adds to balance, cash_out (-) subtracts.
                      // So previous = current - (delta).
                      const delta = tx.type === 'cash_in' ? tx.amount : -tx.amount;
                      current -= delta;
                      return { ...tx, runningBalance: entryBalance };
                    }).reverse();

                    return withBalances.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="table-cell text-slate-500 font-medium">{formatDate(tx.txn_date || tx.date)}</td>
                        <td className="table-cell">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tx.type === "cash_in" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                              {tx.type === 'cash_in' ? 'Money In (+)' : 'Money Out (-)'}
                           </span>
                        </td>
                        <td className={`table-cell text-right font-black text-sm ${tx.type === "cash_in" ? "text-emerald-600" : "text-rose-600"}`}>
                           {tx.type === "cash_in" ? "+" : "-"} {formatCurrency(tx.amount)}
                        </td>
                        <td className={`table-cell text-right font-black ${tx.runningBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {formatCurrency(tx.runningBalance)}
                        </td>
                      </tr>
                    ));
                  })()}
               </tbody>
            </table>
         </div>
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[999] grid place-items-center bg-[#0F172A]/10 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setOpen(false)}>
          <div className="premium-card w-full max-w-sm shadow-[0_40px_80px_-15px_rgba(0,0,0,0.25)] p-0 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className={`p-8 border-b border-slate-100 ${form.type === 'cash_out' ? 'bg-rose-50/30' : 'bg-emerald-50/30'}`}>
               <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ring-4 ${form.type === 'cash_out' ? 'bg-rose-50 text-rose-600 ring-rose-500/5' : 'bg-emerald-50 text-emerald-600 ring-emerald-500/5'}`}>
                     <Icon name={form.type === 'cash_out' ? 'upload' : 'download'} className="text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-[#0F172A]">{form.type === 'cash_out' ? 'Entry: You Gave' : 'Entry: You Got'}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Customer Ledger Update</p>
                  </div>
               </div>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleSaveTx}>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                 <button type="button" onClick={() => setForm(f => ({...f, type: 'cash_out'}))} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'cash_out' ? 'bg-white text-rose-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>You Gave</button>
                 <button type="button" onClick={() => setForm(f => ({...f, type: 'cash_in'}))} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'cash_in' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>You Got</button>
              </div>

              <div className="space-y-1.5">
                 <label className="label">Amount*</label>
                 <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-black text-xl">₹</span>
                    <input className="input !pl-10 text-3xl font-black text-slate-900 border-none bg-slate-50 focus:bg-white transition-colors" type="number" name="amount" value={form.amount} onChange={(e) => setForm(f => ({...f, amount: e.target.value}))} required placeholder="0.00" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="label">Category</label>
                    <input className="input !h-12 !text-sm" name="category" list="cat-list" value={form.category} onChange={(e) => setForm(f => ({...f, category: e.target.value}))} placeholder="Payment, Sale..." />
                    <datalist id="cat-list"><option value="Sale"/><option value="Advance"/><option value="Collection"/><option value="Adjustment"/></datalist>
                 </div>
                 <div className="space-y-1.5">
                    <label className="label">Date</label>
                    <input className="input !h-12 !text-sm" type="date" name="txn_date" value={form.txn_date} onChange={(e) => setForm(f => ({...f, txn_date: e.target.value}))} />
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Notes (Optional)</label>
                <textarea className="input min-h-[80px] py-3 text-sm" name="note" placeholder="Describe this entry..." value={form.note} onChange={(e) => setForm(f => ({...f, note: e.target.value}))} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn h-12 !border-none text-slate-400 font-bold px-6 hover:text-slate-600 transition-colors">Discard</button>
                <button className={`btn h-12 px-8 text-white font-black text-sm uppercase tracking-widest shadow-lg ${form.type === 'cash_out' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`} type="submit">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default CustomerDetailReal;
