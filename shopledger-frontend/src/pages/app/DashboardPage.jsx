import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import toast from "react-hot-toast";

const toneClass = {
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700"
};

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [resCustStats, resCashStats, resTx, resCust] = await Promise.all([
        api.get('/customers/stats'),
        api.get('/cashbook/stats'),
        api.get('/transactions'),
        api.get('/customers')
      ]);

      setStats({
        receivable: resCustStats.data.data.total_receivable,
        payable: resCustStats.data.data.total_payable,
        cashIn: resCashStats.data.data.total_in,
        cashBalance: resCashStats.data.data.balance
      });

      setRecentTx(resTx.data.data.slice(0, 5));
      setTopCustomers(resCust.data.data.sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 3));

    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Loading your shop stats...</div>;

  const dashboardCards = [
    { label: "Total Receivable", value: stats.receivable, icon: "account_balance", tone: "emerald" },
    { label: "Total Payable", value: stats.payable, icon: "payments", tone: "rose" },
    { label: "Cash In Hand", value: stats.cashBalance, icon: "account_balance_wallet", tone: "blue" },
    { label: "Total Customers", value: topCustomers.length, icon: "group", tone: "violet", isCount: true }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((item) => (
          <article key={item.label} className="card shadow-sm border-slate-100 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass[item.tone]}`}>
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
               {item.isCount ? item.value : formatCurrency(item.value)}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Recent Transactions</h2>
            <Link to="/transactions" className="text-sm font-semibold text-[#1A6BFF] hover:underline">View All</Link>
          </div>
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Party Name</th>
                  <th className="table-cell">Type</th>
                  <th className="table-cell text-right">Amount</th>
                  <th className="table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.length === 0 && (
                   <tr><td colSpan="4" className="table-cell text-center py-8 text-slate-400">No transactions recorded yet.</td></tr>
                )}
                {recentTx.map((tx, idx) => (
                  <tr key={tx.id} className={idx % 2 ? "bg-slate-50/50" : "bg-white"}>
                    <td className="table-cell font-medium text-slate-700">{tx.customer_name || tx.supplier_name || 'Walk-in'}</td>
                    <td className="table-cell"><span className={`status-badge ${tx.type === "cash_in" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{tx.type === "cash_in" ? "Money In" : "Money Out"}</span></td>
                    <td className={`table-cell text-right font-bold ${tx.type === "cash_in" ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(tx.amount)}</td>
                    <td className="table-cell text-slate-500">{formatDate(tx.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-5">High Balance Customers</h2>
          <div className="space-y-4">
            {topCustomers.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No customers added yet.</p>}
            {topCustomers.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 bg-slate-50/30 hover:bg-slate-50 transition">
                <div>
                  <p className="font-bold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.phone || 'No phone'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-base font-black ${Number(c.balance) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatCurrency(Math.abs(c.balance))}
                  </p>
                  <Link className="text-[11px] font-bold uppercase tracking-wider text-[#1A6BFF] hover:underline" to={`/customers/${c.id}`}>Details</Link>
                </div>
              </div>
            ))}
          </div>
          {topCustomers.length > 0 && (
            <Link to="/customers" className="mt-5 block text-center text-sm font-bold text-slate-500 hover:text-slate-800">
               View All Customers
            </Link>
          )}
        </div>
      </section>

      <section className="card shadow-sm border-l-4 border-l-[#1A6BFF]">
        <h2 className="text-xl font-bold text-slate-800">Quick Actions</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/customers" className="btn-primary shadow-lg shadow-blue-500/20">+ Add Customer</Link>
          <Link to="/suppliers" className="btn-secondary">+ Add Supplier</Link>
          <Link to="/cashbook" className="btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">+ Record Cash In</Link>
          <Link to="/cashbook" className="btn bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">+ Record Cash Out</Link>
          <Link to="/transactions" className="btn-secondary">+ Add Transaction</Link>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
