import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCircle2,
  Mail,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationStreamUrl,
} from "../../lib/api/notifications";
import { queryKeys } from "../../lib/queryClient";
import { DEMO_MODE } from "../../lib/demo";
import { useToast } from "../../providers/ToastProvider";

const ICONS = {
  join_request: UserPlus,
  team_invitation: Mail,
  request_accepted: CheckCircle2,
  invitation_accepted: CheckCircle2,
  request_declined: XCircle,
  invitation_declined: XCircle,
  team_full: Users,
  leader_changed: Users,
  member_removed: Users,
  member_left: Users,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const notifications = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => listNotifications({ limit: 8 }, { signal }),
    refetchInterval: 60_000,
  });

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    let source;
    try {
      source = new EventSource(notificationStreamUrl(), { withCredentials: true });
    } catch {
      return undefined;
    }

    function handleNotification(event) {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      try {
        const payload = JSON.parse(event.data);
        if (payload?.title) {
          toast.info(payload.title, payload.message);
        }
      } catch {
        // The cache invalidation above is enough if the payload is malformed.
      }
    }

    source.addEventListener("notification", handleNotification);
    return () => {
      source.removeEventListener("notification", handleNotification);
      source.close();
    };
  }, [queryClient, toast]);

  const unread = notifications.data?.unread || 0;
  const items = notifications.data?.items || [];

  function openNotification(notification) {
    if (!notification.read) markOne.mutate(notification.id);
    setOpen(false);
    const teamId = notification.data?.teamId;
    if (notification.type === "join_request" || notification.type.includes("invitation")) {
      navigate("/requests");
    } else if (teamId) {
      navigate(`/teams/${teamId}`);
    } else {
      navigate("/requests");
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="bell-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <Bell aria-hidden="true" />
        {unread > 0 && (
          <span className="bell-button__badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="popover notifications-popover" sideOffset={10} align="end">
          <div className="notifications-popover__head">
            <span className="notifications-popover__title">
              <Bell size={15} aria-hidden="true" />
              The wire
            </span>
            {unread > 0 && (
              <button
                type="button"
                className="btn btn--link"
                style={{ fontSize: "0.7rem" }}
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notifications-popover__list">
            {notifications.isLoading && (
              <div className="loading-block">
                <span className="spinner" aria-hidden="true" /> Checking the wire…
              </div>
            )}

            {!notifications.isLoading && items.length === 0 && (
              <div className="notifications-popover__empty">
                <Check />
                <strong>All quiet</strong>
                <p>Invitations and request updates land here.</p>
              </div>
            )}

            {items.map((notification) => {
              const Icon = ICONS[notification.type] || Bell;
              return (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-item ${notification.read ? "" : "notification-item--unread"}`}
                  onClick={() => openNotification(notification)}
                >
                  <span className="notification-item__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="notification-item__body">
                    <span className="notification-item__title">{notification.title}</span>
                    <span className="notification-item__message">{notification.message}</span>
                    <span className="notification-item__time">
                      {notification.createdAt
                        ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                        : "Just now"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="notifications-popover__foot">
            <Link to="/requests" className="btn btn--link" style={{ fontSize: "0.72rem" }} onClick={() => setOpen(false)}>
              View all requests
            </Link>
            <span className="notification-item__time">{unread ? `${unread} unread` : "Up to date"}</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
