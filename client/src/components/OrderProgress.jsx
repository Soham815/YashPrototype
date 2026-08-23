import "../styles/OrderProgress.css";

const STEPS = [
  { key: "placed",              label: "Order Placed",       icon: "✅" },
  { key: "packaging_assigned",  label: "Preparing",          icon: "📦" },
  { key: "packed",              label: "Packed",             icon: "🎁" },
  { key: "out_for_delivery",    label: "Out for Delivery",   icon: "🚚" },
  { key: "delivered",           label: "Delivered",          icon: "🏠" },
];

export default function OrderProgress({ status }) {
  const currentIdx = STEPS.findIndex(s => s.key === status);
  const safeIdx    = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="order-progress">
      <div className="order-progress__track">
        {/* Fill line */}
        <div
          className="order-progress__fill"
          style={{ width: `${(safeIdx / (STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        {STEPS.map((step, idx) => {
          const done    = idx < safeIdx;
          const current = idx === safeIdx;
          return (
            <div key={step.key} className="order-progress__step">
              <div className={`order-progress__dot
                ${done    ? "order-progress__dot--done"    : ""}
                ${current ? "order-progress__dot--current" : ""}
              `}>
                {done ? "✓" : step.icon}
              </div>
              <span className={`order-progress__label
                ${done    ? "order-progress__label--done"    : ""}
                ${current ? "order-progress__label--current" : ""}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
