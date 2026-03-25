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

function CustomersPage() {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ total_customers: 0, total_receivable: 0, total_payable: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("Most Recent");

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    initialBalance: 0,
    balanceType: 'receiveable',
    address: ''
  });

  const fetchData = async () => {
    try {
      const [resCust, resStats] = await Promise.all([
        api.get('/customers'),
        api.get('/customers/stats')
      ]);
      setCustomers(resCust.data.data);
      setStats(resStats.data.data);
    } catch (err) {
      toast.error("Failed to load customers");
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
        initialBalance: form.balanceType === 'payable' ? -Math.abs(form.initialBalance) : Math.abs(form.initialBalance)
      };
      await api.post('/customers', payload);
      toast.success("Customer added!");
      setOpen(false);
      setForm({ name: '', phone: '', email: '', initialBalance: 0, balanceType: 'receiveable', address: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save customer");
    }
  };

  const filtered = customers
    .filter(c => {
      const matchesSearch = (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
                            (c.phone || "").includes(search);
      const balanceNum = Number(c.balance);
      let matchesFilter = true;
      if (filterBy === "You'll Give") matchesFilter = balanceNum < 0;
      else if (filterBy === "You'll Get") matchesFilter = balanceNum > 0;
      else if (filterBy === "Settled") matchesFilter = balanceNum === 0;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "Most Recent") return b.id - a.id;
      if (sortBy === "Oldest") return a.id - b.id;
      if (sortBy === "By Name") return a.name.localeCompare(b.name);
      if (sortBy === "Highest Amount") return Math.abs(Number(b.balance)) - Math.abs(Number(a.balance));
      if (sortBy === "Least Amount") return Math.abs(Number(a.balance)) - Math.abs(Number(b.balance));
      return 0;
    });

  if (loading) return <div className="p-10 text-center">Loading customers...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#0F172A]">Customers</h2>
          <p className="text-slate-500 text-sm font-medium">Manage your relationships and credit history.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary" type="button">
          <Icon name="person_add" className="mr-2" />
          Add Customer
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-[2]">
          <span className="absolute left-4 top-3.5 material-symbols-outlined text-slate-400">search</span>
          <input 
            className="input !pl-12 !h-12 shadow-sm" 
            placeholder="Search customers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-1 gap-3">
          <div className="flex-1 relative">
            <label className="absolute -top-2 left-3 bg-[#F1F5F9] px-1 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10">Filter By</label>
            <div className="relative group">
               <Icon name="filter_list" className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <select 
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="input !pl-10 !h-12 !text-xs font-bold shadow-sm cursor-pointer appearance-none"
               >
                 <option value="All">All Status</option>
                 <option value="You'll Give">You'll Give</option>
                 <option value="You'll Get">You'll Get</option>
                 <option value="Settled">Settled</option>
               </select>
               <Icon name="expand_more" className="absolute right-3 top-3 text-slate-300 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 relative">
            <label className="absolute -top-2 left-3 bg-[#F1F5F9] px-1 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10">Sort By</label>
            <div className="relative group">
               <Icon name="swap_vert" className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input !pl-10 !h-12 !text-xs font-bold shadow-sm cursor-pointer appearance-none"
               >
                 <option value="Most Recent">Most Recent</option>
                 <option value="Highest Amount">Highest Amount</option>
                 <option value="Least Amount">Least Amount</option>
                 <option value="By Name">By Name</option>
                 <option value="Oldest">Oldest</option>
               </select>
               <Icon name="expand_more" className="absolute right-3 top-3 text-slate-300 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="premium-card p-6">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Total Customers</p>
          <p className="mt-2 text-3xl font-black text-[#0F172A]">{stats.total_customers}</p>
        </div>
        <div className="premium-card p-6 border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">To Receive</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{formatCurrency(stats.total_receivable)}</p>
        </div>
        <div className="premium-card p-6 border-l-4 border-l-rose-500">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">To Pay</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{formatCurrency(stats.total_payable)}</p>
        </div>
      </div>

      <div className="hidden md:block table-wrap">
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="table-cell">Customer</th>
              <th className="table-cell">Balance</th>
              <th className="table-cell">Registered</th>
              <th className="table-cell text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
               <tr><td colSpan="4" className="table-cell text-center text-slate-400 py-8">No customers found</td></tr>
            )}
            {filtered.map((c, idx) => (
              <tr key={c.id} className={idx % 2 ? "bg-slate-50" : "bg-white"}>
                <td className="table-cell">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.phone || 'No phone'}</p>
                </td>
                <td className="table-cell font-medium">
                  <span className={`status-badge ${c.balance >= 0 ? "bg-emerald-100/80 text-emerald-700" : "bg-rose-100/80 text-rose-700"}`}>
                    {Number(c.balance) >= 0 ? "To Receive" : "To Pay"} {formatCurrency(Math.abs(c.balance))}
                  </span>
                </td>
                <td className="table-cell text-slate-500">{formatDate(c.created_at)}</td>
                <td className="table-cell text-right">
                  <Link className="btn-secondary" to={`/customers/${c.id}`}>View Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((c) => (
          <article key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-slate-500">{c.phone}</p>
              </div>
              <span className={`status-badge ${c.balance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {Number(c.balance) >= 0 ? "To Receive" : "To Pay"}
              </span>
            </div>
            <p className="mt-2 text-lg font-bold">{formatCurrency(Math.abs(c.balance))}</p>
            <Link to={`/customers/${c.id}`} className="btn-secondary mt-3 block text-center">View Details</Link>
          </article>
        ))}
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[999] grid place-items-center bg-[#0F172A]/10 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setOpen(false)}>
          <div className="premium-card w-full max-w-md shadow-[0_40px_80px_-15px_rgba(0,0,0,0.25)] p-0 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b border-slate-100 p-8">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] ring-4 ring-indigo-500/5">
                    <Icon name="person_add" className="text-2xl" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tight text-[#0F172A]">Add New Customer</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Setup Ledger Profile</p>
                 </div>
               </div>
            </div>
            
            <form className="p-8 space-y-5" onSubmit={handleSave}>
              <div className="space-y-1.5">
                <label className="label">Full Name*</label>
                <input className="input" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Rahul Sharma" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Phone*</label>
                  <input className="input" name="phone" value={form.phone} onChange={handleChange} required placeholder="98XXX XXX00" />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Opening Balance</label>
                  <input className="input text-center" type="number" name="initialBalance" value={form.initialBalance} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Balance Type</label>
                <select className="input" name="balanceType" value={form.balanceType} onChange={handleChange}>
                  <option value="receiveable">Amount to Receive (+)</option>
                  <option value="payable">Amount to Pay (-)</option>
                </select>
              </div>

              <div className="space-y-1.5 flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setOpen(false)} className="btn h-12 !border-none text-slate-400 font-bold px-6 hover:text-slate-600 transition-colors">Discard</button>
                <button className="btn-primary !h-12 px-8 shadow-xl shadow-indigo-500/20" type="submit">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default CustomersPage;
