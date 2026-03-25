import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import toast from "react-hot-toast";
 
// ✅ Proper npm imports — no CDN, no caching issues
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
 
function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [range, setRange] = useState({
    from: new Date().toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
 
  const fetchData = async () => {
    try {
      const res = await api.get("/reports/summary");
      setData(res.data.data);
    } catch (err) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchData();
  }, []);
 
  const triggerDownload = async () => {
    if (!range.from || !range.to) return toast.error("Please select dates");
    const loadToast = toast.loading("Fetching data...");
 
    try {
      const res = await api.get(`/reports/data?from=${range.from}&to=${range.to}`);
      const r = res.data.data;
      toast.dismiss(loadToast);
 
      // ✅ Direct instantiation — no window.jsPDF needed
      const doc = new jsPDF();
 
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42);
      doc.text(r.shopName, 105, 20, { align: "center" });
 
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text("Financial Summary Report", 105, 30, { align: "center" });
 
      doc.setFontSize(10);
      doc.text(`Period: ${range.from} to ${range.to}`, 105, 38, { align: "center" });
 
      // Summary Table
      autoTable(doc, {
        startY: 50,
        head: [["FINANCIAL SUMMARY", "AMOUNT (Rs.)"]],
        body: [
          ["Total Cash In (Cashbook)", Number(r.summary.cash.total_in).toLocaleString()],
          ["Total Cash Out (Cashbook)", Number(r.summary.cash.total_out).toLocaleString()],
          ["Ledger Collections", Number(r.summary.ledger.total_in).toLocaleString()],
          ["Ledger Payments", Number(r.summary.ledger.total_out).toLocaleString()],
          ["NET CASH FLOW", Number(r.summary.net).toLocaleString()],
        ],
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      });
 
      // Activity Table
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Detailed Transaction Timeline", 14, doc.lastAutoTable.finalY + 15);
 
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [["DATE", "SOURCE", "TYPE", "AMOUNT", "NOTES"]],
        body: r.activity.map((row) => [
          new Date(row.date).toLocaleDateString(),
          row.source.toUpperCase(),
          row.type,
          `Rs. ${Number(row.amount).toLocaleString()}`,
          row.note || "-",
        ]),
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 },
      });
 
      doc.save(`ShopLedger_Report_${range.from}_to_${range.to}.pdf`);
      toast.success("Report generated!");
      setShowModal(false);
    } catch (err) {
      toast.dismiss(loadToast);
      console.error("PDF Gen Error:", err);
      toast.error(err.response?.data?.error || "Failed to generate report");
    }
  };
 
  if (loading)
    return <div className="p-10 text-center text-slate-500">Generating report...</div>;
  if (!data)
    return (
      <div className="p-10 text-center text-rose-500 font-bold">Failed to load data.</div>
    );
 
  const { ledger, cash, recent } = data;
 
  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Financial Summary
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download PDF
        </button>
      </div>
 
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card shadow-sm hover:shadow-md transition">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Ledger Metrics
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-slate-500">Total Receivable</p>
              <p className="text-2xl font-black text-emerald-600">
                {formatCurrency(ledger.receivable)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Payable</p>
              <p className="text-2xl font-black text-rose-600">
                {formatCurrency(ledger.payable)}
              </p>
            </div>
          </div>
        </div>
 
        <div className="card shadow-sm hover:shadow-md transition">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Cashbook Metrics
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-slate-500">Total Cash In</p>
              <p className="text-2xl font-black text-emerald-600">
                {formatCurrency(cash.total_in)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Cash Out</p>
              <p className="text-2xl font-black text-rose-600">
                {formatCurrency(cash.total_out)}
              </p>
            </div>
          </div>
        </div>
 
        <div className="card shadow-sm hover:shadow-md transition bg-gradient-to-br from-slate-50 to-blue-50">
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            Profit & Loss (Est.)
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-slate-500">Gross Result</p>
              <p
                className={`text-4xl font-black ${
                  cash.total_in - cash.total_out >= 0
                    ? "text-indigo-600"
                    : "text-rose-600"
                }`}
              >
                {formatCurrency(cash.total_in - cash.total_out)}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Based on Cashbook In/Out
            </p>
          </div>
        </div>
      </div>
 
      <div className="card shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-5">
          Recent All-Module Activity
        </h2>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="table-cell">Date</th>
                <th className="table-cell">Source</th>
                <th className="table-cell">Activity</th>
                <th className="table-cell text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item, idx) => (
                <tr
                  key={`${item.source}-${idx}`}
                  className={idx % 2 ? "bg-slate-50/50" : "bg-white"}
                >
                  <td className="table-cell text-slate-600">
                    {formatDate(item.date)}
                  </td>
                  <td className="table-cell uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                    [{item.source}]
                  </td>
                  <td className="table-cell font-medium text-slate-700">
                    {item.type}
                  </td>
                  <td
                    className={`table-cell text-right font-black ${
                      item.type === "cash_in" || item.type === "Credit"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
 
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <div
              className="card w-full max-w-sm p-8 space-y-6 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  Generate PDF Report
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  Select a custom date range
                </p>
              </div>
 
              <div className="space-y-4">
                <div>
                  <label className="label">From Date</label>
                  <input
                    type="date"
                    className="input"
                    value={range.from}
                    onChange={(e) =>
                      setRange((r) => ({ ...r, from: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">To Date</label>
                  <input
                    type="date"
                    className="input"
                    value={range.to}
                    onChange={(e) =>
                      setRange((r) => ({ ...r, to: e.target.value }))
                    }
                  />
                </div>
              </div>
 
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button onClick={triggerDownload} className="btn-primary flex-1">
                  Download
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
 
export default ReportsPage;
