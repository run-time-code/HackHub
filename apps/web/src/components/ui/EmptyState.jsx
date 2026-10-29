import clsx from "clsx";

export default function EmptyState({ icon, title, copy, actions, className }) {
  return (
    <div className={clsx("empty", className)}>
      {icon && (
        <span className="empty__art" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className="empty__title">{title}</h3>
      {copy && <p className="empty__copy">{copy}</p>}
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}
