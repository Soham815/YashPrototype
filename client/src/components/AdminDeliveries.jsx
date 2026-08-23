import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import { toTitleCase } from "../utils/textUtils";
import Breadcrumb from "./Breadcrumb";
import "../styles/AdminDeliveries.css";

export default function AdminDeliveries() {
  const [unassigned,   setUnassigned]   = useState([]);
  const [packaged,     setPackaged]     = useState([]);
  const [assignments,  setAssignments]  = useState([]);
  const [workers,      setWorkers]      = useState([]);
  const [activeTab,    setActiveTab]    = useState("unassigned");
  const [loading,      setLoading]      = useState(true);
  const [msg,          setMsg]          = useState("");

  // Selection state
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedStage,  setSelectedStage]  = useState("packaging");
  const [routeName,      setRouteName]      = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [unRes, pkRes, asRes, wkRes] = await Promise.all([
        fetch(`${API_BASE_URL}/deliveries/unassigned`),
        fetch(`${API_BASE_URL}/deliveries/packaged`),
        fetch(`${API_BASE_URL}/deliveries`),
        fetch(`${API_BASE_URL}/workers`),
      ]);
      const [un, pk, as, wk] = await Promise.all([
        unRes.json(), pkRes.json(), asRes.json(), wkRes.json()
      ]);
      if (un.success) setUnassigned(un.data);
      if (pk.success) setPackaged(pk.data);
      if (as.success) setAssignments(as.data);
      if (wk.success) setWorkers(wk.data.filter(w => w.is_active));
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleOrder = (id) =>
    setSelectedOrders(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const selectAll = (list) =>
    setSelectedOrders(list.map(o => o.id));

  const clearSelection = () => {
    setSelectedOrders([]);
    setSelectedWorker("");
    setRouteName("");
  };

  const handleAssign = async () => {
    if (!selectedOrders.length) { flash("❌ Select at least one order"); return; }
    if (!selectedWorker)        { flash("❌ Select a worker"); return; }

    const res  = await fetch(`${API_BASE_URL}/deliveries/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_ids:   selectedOrders,
        worker_id:   selectedWorker,
        stage:       selectedStage,
        route_name:  routeName || null,
      }),
    });
    const data = await res.json();
    if (!data.success) { flash(`❌ ${data.error}`); return; }
    flash(`✅ ${selectedOrders.length} order(s) assigned for ${selectedStage}`);
    clearSelection();
    fetchAll();
  };

  const handleUnassign = async (id) => {
    if (!window.confirm("Remove this assignment?")) return;
    await fetch(`${API_BASE_URL}/deliveries/${id}`, { method: "DELETE" });
    flash("✅ Assignment removed");
    fetchAll();
  };

  const activeAssignments = assignments.filter(a => a.status !== "delivered");
  const doneAssignments   = assignments.filter(a => a.status === "delivered");

  const statusColor = {
    assigned:    "orange",
    in_progress: "blue",
    delivered:   "green",
    failed:      "red",
  };

  const tabs = [
    { key: "unassigned", label: `Unassigned (${unassigned.length})` },
    { key: "packaged",   label: `Ready to Deliver (${packaged.length})` },
    { key: "active",     label: `Active (${activeAssignments.length})` },
    { key: "done",       label: `Done (${doneAssignments.length})` },
  ];

  // Current list for selection
  const currentOrderList = activeTab === "unassigned" ? unassigned
    : activeTab === "packaged" ? packaged : [];
  const isSelectable = activeTab === "unassigned" || activeTab === "packaged";

  return (
    <section className="admin-deliveries">
      <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Deliveries" }]} />

      <div className="admin-deliveries__header">
        <div>
          <h1 className="admin-deliveries__title">Delivery Management</h1>
          <p className="admin-deliveries__subtitle">
            {unassigned.length} unassigned · {packaged.length} ready · {activeAssignments.length} active
          </p>
        </div>
      </div>

      {msg && <div className="admin-deliveries__msg">{msg}</div>}

      {/* ── ASSIGNMENT PANEL (shows when items selected) ── */}
      {selectedOrders.length > 0 && (
        <div className="ad-assign-panel">
          <div className="ad-assign-panel__info">
            <strong>{selectedOrders.length}</strong> order(s) selected
          </div>
          <div className="ad-assign-panel__controls">
            <input className="ad-assign-panel__route"
              placeholder="Route name (optional)"
              value={routeName}
              onChange={e => setRouteName(e.target.value)} />
            <select className="ad-assign-panel__stage"
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}>
              <option value="packaging">For Packaging</option>
              <option value="delivery">For Delivery</option>
            </select>
            <select className="ad-assign-panel__worker"
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value)}>
              <option value="">Assign to worker…</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>
                  {toTitleCase(w.worker_name)} ({w.role})
                </option>
              ))}
            </select>
            <button className="ad-assign-panel__btn" onClick={handleAssign}>
              Assign Orders
            </button>
            <button className="ad-assign-panel__clear" onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="admin-deliveries__tabs">
        {tabs.map(t => (
          <button key={t.key}
            className={`ad-tab${activeTab === t.key ? " ad-tab--active" : ""}`}
            onClick={() => { setActiveTab(t.key); clearSelection(); }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="admin-deliveries__loading">Loading…</div>}

      {/* ── SELECTABLE ORDER LISTS (unassigned + packaged) ── */}
      {!loading && isSelectable && (
        <div className="ad-list">
          {currentOrderList.length === 0 ? (
            <div className="ad-empty">
              {activeTab === "unassigned" ? "All orders are assigned 🎉" : "No orders ready for delivery yet."}
            </div>
          ) : (
            <>
              <div className="ad-list__bulk-actions">
                <button className="ad-list__select-all"
                  onClick={() => selectAll(currentOrderList)}>
                  Select All ({currentOrderList.length})
                </button>
                {selectedOrders.length > 0 && (
                  <button className="ad-list__deselect" onClick={clearSelection}>
                    Deselect All
                  </button>
                )}
              </div>

              {currentOrderList.map(order => (
                <div key={order.id}
                  className={`ad-card${selectedOrders.includes(order.id) ? " ad-card--selected" : ""}`}
                  onClick={() => toggleOrder(order.id)}>
                  <div className="ad-card__checkbox-wrap">
                    <input type="checkbox" className="ad-card__checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleOrder(order.id)}
                      onClick={e => e.stopPropagation()} />
                  </div>
                  <div className="ad-card__body">
                    <div className="ad-card__top-row">
                      <span className="ad-card__id">Order #{order.id}</span>
                      <span className="ad-card__amount">₹{Number(order.total_amount).toFixed(2)}</span>
                    </div>
                    <span className="ad-card__customer">
                      {toTitleCase(order.customers?.customer_name || "")}
                    </span>
                    <span className="ad-card__addr">
                      📍 {order.customers?.street_address}, {order.customers?.city}
                    </span>
                    <div className="ad-card__meta-row">
                      <span>📞 {order.customers?.contact_number}</span>
                      <span>{order.total_pieces} pcs</span>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── ACTIVE ASSIGNMENTS ── */}
      {!loading && activeTab === "active" && (
        <div className="ad-list">
          {activeAssignments.length === 0
            ? <div className="ad-empty">No active assignments.</div>
            : activeAssignments.map(a => (
              <div key={a.id} className={`ad-card ad-card--${statusColor[a.status]}`}>
                <div className="ad-card__body">
                  <div className="ad-card__top-row">
                    <span className="ad-card__id">Order #{a.orders?.id}</span>
                    <span className={`ad-status ad-status--${statusColor[a.status]}`}>
                      {a.status.replace("_"," ")}
                    </span>
                  </div>
                  <span className="ad-card__customer">
                    {toTitleCase(a.orders?.customers?.customer_name || "")}
                  </span>
                  <div className="ad-card__meta-row">
                    <span>👷 {toTitleCase(a.workers?.worker_name || "")}</span>
                    <span>📦 {a.stage}</span>
                    <span>₹{Number(a.orders?.total_amount||0).toFixed(2)}</span>
                    {a.delivery_routes && <span>🗺 {a.delivery_routes.route_name}</span>}
                  </div>
                </div>
                <button className="ad-card__unassign-btn" onClick={() => handleUnassign(a.id)}>
                  Unassign
                </button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── DONE ── */}
      {!loading && activeTab === "done" && (
        <div className="ad-list">
          {doneAssignments.length === 0
            ? <div className="ad-empty">No completed deliveries yet.</div>
            : doneAssignments.map(a => (
              <div key={a.id} className="ad-card ad-card--green">
                <div className="ad-card__body">
                  <div className="ad-card__top-row">
                    <span className="ad-card__id">Order #{a.orders?.id}</span>
                    <span className="ad-card__amount">
                      ₹{Number(a.cash_collected||0).toFixed(2)} collected
                    </span>
                  </div>
                  <span className="ad-card__customer">
                    {toTitleCase(a.orders?.customers?.customer_name || "")}
                  </span>
                  <div className="ad-card__meta-row">
                    <span>👷 {toTitleCase(a.workers?.worker_name || "")}</span>
                    <span>✅ {new Date(a.delivered_at).toLocaleString()}</span>
                  </div>
                  {a.delivery_notes && (
                    <p className="ad-card__notes">📝 {a.delivery_notes}</p>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </section>
  );
}
