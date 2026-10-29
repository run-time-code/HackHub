import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  UserPlus,
  XCircle,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { formatRelative, expiryLabel, titleCase } from "../../lib/format";
import { requestCopy } from "../../lib/requests";

const STATUS_VARIANT = {
  pending: "signal",
  accepted: "moss",
  declined: "danger",
  cancelled: "outline",
  expired: "outline",
};

const STATUS_ICON = {
  accepted: CheckCircle2,
  declined: XCircle,
  cancelled: XCircle,
  expired: Clock3,
};

export default function RequestCard({
  request,
  currentUserId,
  ledTeamIds = [],
  busy = false,
  onAccept,
  onDecline,
  onCancel,
}) {
  const copy = requestCopy(request, currentUserId, ledTeamIds);
  const pending = request.status === "pending";
  const incoming = copy.direction === "incoming";
  const Icon = request.type === "invite" ? Mail : UserPlus;
  const DirectionIcon = incoming ? ArrowDownLeft : ArrowUpRight;
  const StatusIcon = STATUS_ICON[request.status];
  const showPerson = Boolean(request.user?.id && request.user.id !== currentUserId);
  const person = request.user?.name;

  return (
    <article className={`request-card ${pending ? "" : "request-card--resolved"}`}>
      <span
        className={`request-card__direction ${
          incoming ? "request-card__direction--incoming" : "request-card__direction--outgoing"
        }`}
        aria-hidden="true"
      >
        <DirectionIcon />
      </span>

      <div className="request-card__body">
        <div className="request-card__eyebrow">
          <span className="cluster" style={{ gap: 5 }}>
            <Icon size={12} aria-hidden="true" />
            {copy.eyebrow}
          </span>
          <span aria-hidden="true">·</span>
          <span>{request.role || "member"}</span>
          <Badge variant={STATUS_VARIANT[request.status] || "outline"} dot={pending}>
            {StatusIcon && <StatusIcon size={10} aria-hidden="true" />}
            {titleCase(request.status)}
          </Badge>
        </div>

        <h3 className="request-card__title">
          <Link to={request.team?.id ? `/teams/${request.team.id}` : "/teams"}>
            {copy.title}
          </Link>
        </h3>

        {request.message && <p className="request-card__message">“{request.message}”</p>}

        <div className="request-card__meta">
          {person && showPerson ? (
            <span>
              <Avatar name={person} size="xs" /> {person}
            </span>
          ) : null}
          <span>
            <CalendarClock aria-hidden="true" />
            Sent {formatRelative(request.createdAt)}
          </span>
          {pending && request.expiresAt && (
            <span>
              <Clock3 aria-hidden="true" />
              {expiryLabel(request.expiresAt)}
            </span>
          )}
        </div>
      </div>

      {pending && (
        <div className="request-card__actions">
          {incoming ? (
            <>
              <Button
                size="sm"
                variant="primary"
                loading={busy}
                onClick={() => onAccept?.(request)}
              >
                {request.type === "invite" ? "Accept invite" : "Accept"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onDecline?.(request)}
              >
                Decline
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onCancel?.(request)}>
              {request.type === "invite" ? "Withdraw invite" : "Cancel request"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
