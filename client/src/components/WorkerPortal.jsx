import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkerAuth } from "../context/WorkerAuthContext";
import { API_BASE_URL } from "../config/api";
import { toTitleCase } from "../utils/textUtils";
import "../styles/WorkerPortal.css";

const BUSINESS_UPI_ID   = "9359118747@ptsbi";
const BUSINESS_UPI_NAME = "Yash Enterprises";

function buildUpiUrl(amount, note) {
  return `upi://pay?pa=${BUSINESS_UPI_ID}&pn=${encodeURIComponent(BUSINESS_UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

function buildQr(upiUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiUrl)}`;
}

/* ── Payment collection modal ───────────────────────────── */
function PaymentModal({ assignment, onClose, onDone, workerId }) {
  const order    = assignment.orders;
  const customer = order?.customers;
  const totalDue = Number(order?.total_amount || 0);

  const [mode,      setMode]      = useState(""); // "cash" | "upi" | "pay_later"
  const [upiType,   setUpiType]   = useState(""); // "full" | "partial"
  const [amount,    setAmount]    = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState("");

  const effectiveAmount = upiType === "full" ? totalDue : Number(amount || 0);
  const upiUrl = mode === "upi" && effectiveAmount > 0
    ? buildUpiUrl(effectiveAmount, `Order #${order?.id} - ${customer?.customer_name}`)
    : null;
  const qrUrl = upiUrl ? buildQr(upiUrl) : null;

  const handleSubmit = async () => {
    if (mode === "pay_later") {
      setLoading(true);
      const res  = await fetch(`${API_BASE_URL}/deliveries/${assignment.id}/collect-payment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pay_later: true }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) onDone("Pay later recorded. Customer added to collection list.");
      else setMsg(`❌ ${data.error}`);
      return;
    }

    const amt = mode === "upi" && upiType === "full" ? totalDue : Number(amount);
    if (!amt || amt <= 0) { setMsg("❌ Enter a valid amount"); return; }
    if (mode === "upi" && !confirmed) { setMsg("❌ Confirm payment received before marking done"); return; }

    setLoading(true);
    const res  = await fetch(`${API_BASE_URL}/deliveries/${assignment.id}/collect-payment`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_mode: mode, amount: amt, worker_id: workerId }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onDone(data.message);
    else setMsg(`❌ ${data.error}`);
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal" onClick={e => e.stopPropagation()}>
        <div className="wp-modal__header">
          <div>
            <div className="wp-modal__customer">{toTitleCase(customer?.customer_name || "")}</div>
            <div className="wp-modal__due">Balance due: <strong>₹{totalDue.toFixed(2)}</strong></div>
          </div>
          <button className="wp-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Step 1 — choose mode */}
        {!mode && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">How is the customer paying?</p>
            <div className="wp-mode-btns">
              <button className="wp-mode-btn wp-mode-btn--cash"     onClick={() => setMode("cash")}>💵 Cash</button>
              <button className="wp-mode-btn wp-mode-btn--upi"      onClick={() => setMode("upi")}>📱 UPI</button>
              <button className="wp-mode-btn wp-mode-btn--later"    onClick={() => setMode("pay_later")}>🕐 Pay Later</button>
            </div>
          </div>
        )}

        {/* Cash flow */}
        {mode === "cash" && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">Enter cash amount received</p>
            <input className="wp-modal__input" type="number" step="0.01"
              placeholder={`Due: ₹${totalDue.toFixed(2)}`}
              value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            {Number(amount) > totalDue && (
              <p className="wp-modal__overpay">
                ₹{(Number(amount) - totalDue).toFixed(2)} excess will be credited to customer account
              </p>
            )}
            {Number(amount) > 0 && Number(amount) < totalDue && (
              <p className="wp-modal__partial">
                ₹{(totalDue - Number(amount)).toFixed(2)} will remain as pending balance
              </p>
            )}
            <div className="wp-modal__actions">
              <button className="wp-modal__back" onClick={() => setMode("")}>← Back</button>
              <button className="wp-modal__confirm wp-modal__confirm--green"
                onClick={handleSubmit} disabled={loading}>
                {loading ? "Processing…" : "Confirm Cash Collected"}
              </button>
            </div>
          </div>
        )}

        {/* UPI flow — step 2: full or partial */}
        {mode === "upi" && !upiType && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">Full or partial payment?</p>
            <div className="wp-mode-btns">
              <button className="wp-mode-btn wp-mode-btn--upi" onClick={() => setUpiType("full")}>
                Full — ₹{totalDue.toFixed(2)}
              </button>
              <button className="wp-mode-btn wp-mode-btn--cash" onClick={() => setUpiType("partial")}>
                Partial amount
              </button>
            </div>
            <button className="wp-modal__back" onClick={() => setMode("")}>← Back</button>
          </div>
        )}

        {/* UPI flow — partial amount input */}
        {mode === "upi" && upiType === "partial" && !qrUrl && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">Enter partial amount</p>
            <input className="wp-modal__input" type="number" step="0.01"
              placeholder="Enter amount" value={amount}
              onChange={e => setAmount(e.target.value)} autoFocus />
            {Number(amount) > 0 && Number(amount) < totalDue && (
              <p className="wp-modal__partial">
                ₹{(totalDue - Number(amount)).toFixed(2)} will remain as pending
              </p>
            )}
            <div className="wp-modal__actions">
              <button className="wp-modal__back" onClick={() => setUpiType("")}>← Back</button>
              <button className="wp-modal__confirm wp-modal__confirm--blue"
                onClick={() => { if (Number(amount) > 0) setUpiType("partial-qr"); }}>
                Generate QR →
              </button>
            </div>
          </div>
        )}

        {/* UPI QR display */}
        {mode === "upi" && qrUrl && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">Show QR to customer</p>
            <div className="wp-qr-wrap">
              <img src={qrUrl} alt="UPI QR" className="wp-qr" />
            </div>
            <p className="wp-qr-amount">₹{effectiveAmount.toFixed(2)} — {BUSINESS_UPI_NAME}</p>
            <p className="wp-qr-hint">Customer scans with any UPI app</p>

            <label className="wp-confirm-check">
              <input type="checkbox" checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)} />
              <span>I confirm the customer has made the payment</span>
            </label>

            <div className="wp-modal__actions">
              <button className="wp-modal__back" onClick={() => { setUpiType(""); setConfirmed(false); }}>← Back</button>
              <button className="wp-modal__confirm wp-modal__confirm--green"
                onClick={handleSubmit} disabled={loading || !confirmed}>
                {loading ? "Processing…" : "Mark Payment Done"}
              </button>
            </div>
          </div>
        )}

        {/* Pay later */}
        {mode === "pay_later" && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">Customer will pay later</p>
            <p className="wp-modal__sub">
              ₹{totalDue.toFixed(2)} will remain pending. This customer will stay in your
              collection list until payment is received.
            </p>
            <div className="wp-modal__actions">
              <button className="wp-modal__back" onClick={() => setMode("")}>← Back</button>
              <button className="wp-modal__confirm wp-modal__confirm--orange"
                onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving…" : "Confirm Pay Later"}
              </button>
            </div>
          </div>
        )}

        {msg && <p className="wp-modal__msg">{msg}</p>}
      </div>
    </div>
  );
}

/* ── Collection-list payment modal (pay_later customers) ─── */
function CollectionModal({ item, onClose, onDone, workerId }) {
  const customer = item.customers;
  const [mode,    setMode]    = useState("");
  const [amount,  setAmount]  = useState("");
  const [upiType, setUpiType] = useState("");
  const [confirmed,setConfirmed]=useState(false);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");

  const due = Number(item.amount_due || 0);
  const effectiveAmount = upiType === "full" ? due : Number(amount || 0);
  const upiUrl = mode === "upi" && effectiveAmount > 0
    ? buildUpiUrl(effectiveAmount, `Collection - ${customer?.customer_name}`) : null;
  const qrUrl = upiUrl ? buildQr(upiUrl) : null;

  const handleSubmit = async () => {
    const amt = mode === "upi" && upiType === "full" ? due : Number(amount);
    if (!amt || amt <= 0) { setMsg("❌ Enter a valid amount"); return; }
    if (mode === "upi" && !confirmed) { setMsg("❌ Confirm payment received"); return; }
    setLoading(true);
    const res = await fetch(`${API_BASE_URL}/deliveries/collection-list/${item.id}/collect`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_mode: mode, amount: amt, worker_id: workerId }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onDone(data.message);
    else setMsg(`❌ ${data.error}`);
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal" onClick={e => e.stopPropagation()}>
        <div className="wp-modal__header">
          <div>
            <div className="wp-modal__customer">{toTitleCase(customer?.customer_name || "")}</div>
            <div className="wp-modal__due">Pending: <strong>₹{due.toFixed(2)}</strong></div>
            <div className="wp-modal__sub">{customer?.contact_number}</div>
          </div>
          <button className="wp-modal__close" onClick={onClose}>✕</button>
        </div>

        {!mode && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">Payment mode</p>
            <div className="wp-mode-btns">
              <button className="wp-mode-btn wp-mode-btn--cash" onClick={() => setMode("cash")}>💵 Cash</button>
              <button className="wp-mode-btn wp-mode-btn--upi"  onClick={() => setMode("upi")}>📱 UPI</button>
            </div>
          </div>
        )}

        {mode === "cash" && (
          <div className="wp-modal__section">
            <p className="wp-modal__label">Cash amount received</p>
            <input className="wp-modal__input" type="number" step="0.01"
              placeholder={`Due: ₹${due.toFixed(2)}`} value={amount}
              onChange={e => setAmount(e.target.value)} autoFocus />
            {Number(amount) > due && (
              <p className="wp-modal__overpay">₹{(Number(amount)-due).toFixed(2)} excess will be credited</p>
            )}
            <div className="wp-modal__actions">
              <button className="wp-modal__back" onClick={() => setMode("")}>← Back</button>
              <button className="wp-modal__confirm wp-modal__confirm--green"
                onClick={handleSubmit} disabled={loading}>
                {loading ? "Processing…" : "Confirm Collected"}
              </button>
            </div>
          </div>
        )}

        {mode === "upi" && !upiType && (
          <div className="wp-modal__section">
            <div className="wp-mode-btns">
              <button className="wp-mode-btn wp-mode-btn--upi" onClick={() => setUpiType("full")}>Full — ₹{due.toFixed(2)}</button>
              <button className="wp-mode-btn wp-mode-btn--cash" onClick={() => setUpiType("partial")}>Partial</button>
            </div>
            <button className="wp-modal__back" onClick={() => setMode("")}>← Back</button>
          </div>
        )}

        {mode === "upi" && upiType === "partial" && !qrUrl && (
          <div className="wp-modal__section">
            <input className="wp-modal__input" type="number" step="0.01"
              placeholder="Enter amount" value={amount}
              onChange={e => setAmount(e.target.value)} autoFocus />
            <div className="wp-modal__actions">
              <button className="wp-modal__back" onClick={() => setUpiType("")}>← Back</button>
              <button className="wp-modal__confirm wp-modal__confirm--blue"
                onClick={() => { if (Number(amount) > 0) setUpiType("partial-qr"); }}>
                Generate QR →
              </button>
            </div>
          </div>
        )}

        {mode === "upi" && qrUrl && (
          <div className="wp-modal__section">
            <div className="wp-qr-wrap"><img src={qrUrl} alt="QR" className="wp-qr" /></div>
            <p className="wp-qr-amount">₹{effectiveAmount.toFixed(2)}</p>
            <label className="wp-confirm-check">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              <span>Payment received</span>
            </label>
            <div className="wp-modal__actions">
              <button className="wp-modal__back" onClick={() => { setUpiType(""); setConfirmed(false); }}>← Back</button>
              <button className="wp-modal__confirm wp-modal__confirm--green"
                onClick={handleSubmit} disabled={loading || !confirmed}>
                {loading ? "Processing…" : "Mark Collected"}
              </button>
            </div>
          </div>
        )}

        {msg && <p className="wp-modal__msg">{msg}</p>}
      </div>
    </div>
  );
}

/* ── Main Worker Portal ──────────────────────────────────── */
export default function WorkerPortal() {
  const navigate = useNavigate();
  const { worker, workerLogout } = useWorkerAuth();

  const [packagingList, setPackagingList] = useState([]);
  const [deliveryList,  setDeliveryList]  = useState([]);
  const [collectionList,setCollectionList]= useState([]);
  const [availableOrders,setAvailableOrders]=useState([]);
  const [activeTab,     setActiveTab]     = useState("packaging");
  const [loading,       setLoading]       = useState(true);
  const [packedItems,   setPackedItems]   = useState({}); // { assignmentId: Set of item ids }
  const [actionMsg,     setActionMsg]     = useState("");
  const [paymentModal,  setPaymentModal]  = useState(null); // assignment object
  const [collectionModal,setCollectionModal]=useState(null);

  useEffect(() => { if (!worker) navigate("/worker/login"); }, [worker]);

  const flash = (m) => { setActionMsg(m); setTimeout(() => setActionMsg(""), 4000); };

  const fetchAll = useCallback(async () => {
    if (!worker) return;
    setLoading(true);
    try {
      const [pkRes, dlRes, clRes, avRes] = await Promise.all([
        fetch(`${API_BASE_URL}/deliveries/worker/${worker.id}?stage=packaging`),
        fetch(`${API_BASE_URL}/deliveries/worker/${worker.id}?stage=delivery`),
        fetch(`${API_BASE_URL}/deliveries/collection-list/${worker.id}`),
        fetch(`${API_BASE_URL}/deliveries/unassigned`),
      ]);
      const [pk, dl, cl, av] = await Promise.all([pkRes.json(), dlRes.json(), clRes.json(), avRes.json()]);
      if (pk.success) setPackagingList(pk.data.filter(a => a.status !== "delivered"));
      if (dl.success) setDeliveryList(dl.data.filter(a => a.status !== "delivered"));
      if (cl.success) setCollectionList(cl.data);
      if (av.success) setAvailableOrders(av.data);
    } catch (e) {}
    setLoading(false);
  }, [worker]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* mark packaging item ticked */
  const togglePackItem = (assignId, itemId) => {
    setPackedItems(prev => {
      const set = new Set(prev[assignId] || []);
      set.has(itemId) ? set.delete(itemId) : set.add(itemId);
      return { ...prev, [assignId]: set };
    });
  };

  /* all items ticked → mark assignment as packed */
  const handleMarkPacked = async (assignment) => {
    const items = assignment.orders?.order_items || [];
    const ticked = packedItems[assignment.id] || new Set();
    if (ticked.size < items.length) { flash("❌ Tick all items before marking packed"); return; }
    const res  = await fetch(`${API_BASE_URL}/deliveries/${assignment.id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "delivered" }), // "delivered" in packaging stage = packed
    });
    const data = await res.json();
    if (data.success) { flash("✅ Order marked as packed!"); fetchAll(); }
    else flash(`❌ ${data.error}`);
  };

  /* mark delivery started */
  const handleStartDelivery = async (assignment) => {
    const res = await fetch(`${API_BASE_URL}/deliveries/${assignment.id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    const data = await res.json();
    if (data.success) { flash("✅ Delivery started"); fetchAll(); }
  };

  /* self-assign available order */
  const handleSelfAssign = async (orderId) => {
    const res = await fetch(`${API_BASE_URL}/deliveries/self-assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, worker_id: worker.id }),
    });
    const data = await res.json();
    if (data.success) { flash("✅ Order picked up!"); fetchAll(); }
    else flash(`❌ ${data.error}`);
  };

  /* open google maps directions */
  const openDirections = (lat, lng) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      "_blank"
    );
  };

  const tabs = [
    { key: "packaging",   label: `Pack (${packagingList.length})` },
    { key: "delivery",    label: `Deliver (${deliveryList.length})` },
    { key: "collection",  label: `Collect (${collectionList.length})` },
    { key: "available",   label: `Available (${availableOrders.length})` },
  ];

  return (
    <section className="worker-portal">
      {/* NAV */}
      <header className="worker-nav">
        <div className="worker-nav__brand">
          <span className="worker-nav__icon">🚚</span>
          <span className="worker-nav__title">Worker Portal</span>
        </div>
        <div className="worker-nav__right">
          <span className="worker-nav__name">{toTitleCase(worker?.worker_name || "")}</span>
          <span className="worker-nav__role">{worker?.role}</span>
          <button className="worker-nav__logout"
            onClick={() => { workerLogout(); navigate("/"); }}>Logout</button>
        </div>
      </header>

      {actionMsg && <div className="worker-action-msg">{actionMsg}</div>}

      {/* STATS */}
      <div className="worker-stats">
        <div className="worker-stat">
          <span className="worker-stat__num">{packagingList.length}</span>
          <span className="worker-stat__label">To Pack</span>
        </div>
        <div className="worker-stat">
          <span className="worker-stat__num">{deliveryList.length}</span>
          <span className="worker-stat__label">To Deliver</span>
        </div>
        <div className="worker-stat">
          <span className="worker-stat__num">{collectionList.length}</span>
          <span className="worker-stat__label">To Collect</span>
        </div>
        <div className="worker-stat">
          <span className="worker-stat__num">{availableOrders.length}</span>
          <span className="worker-stat__label">Available</span>
        </div>
      </div>

      {/* TABS */}
      <div className="worker-tabs">
        {tabs.map(t => (
          <button key={t.key}
            className={`worker-tab${activeTab === t.key ? " worker-tab--active" : ""}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="worker-list">
        {loading && <div className="worker-empty">Loading…</div>}

        {/* ── PACKAGING CHECKLIST ──────────────────────────── */}
        {!loading && activeTab === "packaging" && (
          packagingList.length === 0
            ? <div className="worker-empty">No orders to pack right now.</div>
            : packagingList.map(a => {
                const order    = a.orders;
                const customer = order?.customers;
                const items    = order?.order_items || [];
                const ticked   = packedItems[a.id] || new Set();
                const allDone  = ticked.size >= items.length;

                return (
                  <div key={a.id} className="worker-card worker-card--orange">
                    <div className="worker-card__header">
                      <div>
                        <span className="worker-card__order-id">Order #{order?.id}</span>
                        <span className="worker-card__customer">{toTitleCase(customer?.customer_name || "")}</span>
                      </div>
                      <span className="worker-card__pieces">{order?.total_pieces} pcs</span>
                    </div>

                    {/* Packing checklist */}
                    <div className="worker-checklist">
                      {items.map(item => (
                        <label key={item.id}
                          className={`worker-checklist__item${ticked.has(item.id) ? " worker-checklist__item--done" : ""}`}>
                          <input type="checkbox"
                            checked={ticked.has(item.id)}
                            onChange={() => togglePackItem(a.id, item.id)} />
                          <span className="worker-checklist__name">
                            {toTitleCase(item.products?.product_name || "")}
                          </span>
                          <span className="worker-checklist__qty">
                            {item.quantity_display} {item.unit_display} ({item.pieces} pcs)
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="worker-card__progress">
                      <div className="worker-progress-bar">
                        <div className="worker-progress-bar__fill"
                          style={{ width: `${(ticked.size / Math.max(items.length,1)) * 100}%` }} />
                      </div>
                      <span className="worker-progress-bar__label">{ticked.size}/{items.length} packed</span>
                    </div>

                    <button
                      className={`worker-card__action-btn${allDone ? " worker-card__action-btn--green" : " worker-card__action-btn--disabled"}`}
                      onClick={() => handleMarkPacked(a)}
                      disabled={!allDone}>
                      {allDone ? "✅ Mark as Packed" : `Tick all items first (${items.length - ticked.size} left)`}
                    </button>
                  </div>
                );
              })
        )}

        {/* ── DELIVERY LIST ─────────────────────────────────── */}
        {!loading && activeTab === "delivery" && (
          deliveryList.length === 0
            ? <div className="worker-empty">No deliveries assigned right now.</div>
            : deliveryList.map(a => {
                const order    = a.orders;
                const customer = order?.customers;

                return (
                  <div key={a.id} className={`worker-card worker-card--${a.status === "in_progress" ? "blue" : "orange"}`}>
                    <div className="worker-card__header">
                      <div>
                        <span className="worker-card__order-id">Order #{order?.id}</span>
                        <span className="worker-card__customer">{toTitleCase(customer?.customer_name || "")}</span>
                        <span className="worker-card__addr">📍 {customer?.street_address}, {customer?.city}</span>
                      </div>
                      <div className="worker-card__right">
                        <span className="worker-card__amount">₹{Number(order?.total_amount||0).toFixed(2)}</span>
                        {customer?.latitude && customer?.longitude && (
                          <button className="worker-card__maps-btn"
                            onClick={() => openDirections(customer.latitude, customer.longitude)}>
                            🗺 Directions
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="worker-card__phone">
                      📞 <a href={`tel:${customer?.contact_number}`}>{customer?.contact_number}</a>
                    </div>

                    {/* Packing list — read only for delivery */}
                    <div className="worker-packing-summary">
                      {(order?.order_items || []).map(item => (
                        <span key={item.id} className="worker-packing-tag">
                          {toTitleCase(item.products?.product_name || "")} × {item.quantity_display}{item.unit_display}
                        </span>
                      ))}
                    </div>

                    <div className="worker-delivery-actions">
                      {a.status === "assigned" && (
                        <button className="worker-card__action-btn worker-card__action-btn--blue"
                          onClick={() => handleStartDelivery(a)}>
                          🚚 Start Delivery
                        </button>
                      )}
                      <button className="worker-card__action-btn worker-card__action-btn--green"
                        onClick={() => setPaymentModal(a)}>
                        💰 Collect Payment & Deliver
                      </button>
                    </div>
                  </div>
                );
              })
        )}

        {/* ── COLLECTION LIST (pay_later) ───────────────────── */}
        {!loading && activeTab === "collection" && (
          collectionList.length === 0
            ? <div className="worker-empty">No pending collections.</div>
            : collectionList.map(item => {
                const customer = item.customers;
                return (
                  <div key={item.id} className="worker-card worker-card--orange">
                    <div className="worker-card__header">
                      <div>
                        <span className="worker-card__customer">{toTitleCase(customer?.customer_name || "")}</span>
                        <span className="worker-card__addr">📍 {customer?.street_address}, {customer?.city}</span>
                      </div>
                      <span className="worker-card__amount">₹{Number(item.amount_due||0).toFixed(2)}</span>
                    </div>
                    <div className="worker-card__phone">
                      📞 <a href={`tel:${customer?.contact_number}`}>{customer?.contact_number}</a>
                    </div>
                    {customer?.latitude && customer?.longitude && (
                      <button className="worker-card__maps-btn worker-card__maps-btn--inline"
                        onClick={() => openDirections(customer.latitude, customer.longitude)}>
                        🗺 Get Directions
                      </button>
                    )}
                    <button className="worker-card__action-btn worker-card__action-btn--green"
                      onClick={() => setCollectionModal(item)}>
                      💰 Collect Payment
                    </button>
                  </div>
                );
              })
        )}

        {/* ── AVAILABLE ORDERS (self-assign) ───────────────── */}
        {!loading && activeTab === "available" && (
          availableOrders.length === 0
            ? <div className="worker-empty">No unassigned orders available.</div>
            : availableOrders.map(order => (
                <div key={order.id} className="worker-card worker-card--purple">
                  <div className="worker-card__header">
                    <div>
                      <span className="worker-card__order-id">Order #{order.id}</span>
                      <span className="worker-card__customer">{toTitleCase(order.customers?.customer_name || "")}</span>
                      <span className="worker-card__addr">📍 {order.customers?.city}</span>
                    </div>
                    <div>
                      <span className="worker-card__amount">₹{Number(order.total_amount||0).toFixed(2)}</span>
                      <span className="worker-card__pieces">{order.total_pieces} pcs</span>
                    </div>
                  </div>
                  <button className="worker-card__action-btn worker-card__action-btn--purple"
                    onClick={() => handleSelfAssign(order.id)}>
                    Pick Up This Delivery
                  </button>
                </div>
              ))
        )}
      </div>

      {/* Payment modal */}
      {paymentModal && (
        <PaymentModal
          assignment={paymentModal}
          workerId={worker?.id}
          onClose={() => setPaymentModal(null)}
          onDone={(msg) => { setPaymentModal(null); flash(`✅ ${msg}`); fetchAll(); }}
        />
      )}

      {/* Collection modal */}
      {collectionModal && (
        <CollectionModal
          item={collectionModal}
          workerId={worker?.id}
          onClose={() => setCollectionModal(null)}
          onDone={(msg) => { setCollectionModal(null); flash(`✅ ${msg}`); fetchAll(); }}
        />
      )}
    </section>
  );
}
