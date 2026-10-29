import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, UsersRound } from "lucide-react";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import { Field, Textarea } from "../ui/Field";
import Avatar from "../ui/Avatar";
import { listMyTeams, inviteToTeam } from "../../lib/api/teams";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../providers/ToastProvider";
import { track } from "../../lib/analytics";

export default function InviteDialog({ open, onOpenChange, teammate, teamId }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Invite ${teammate?.name || "a builder"}`}
      description="Pick the crew, name the role and leave a note. The invitation expires in seven days."
    >
      {open && (
        <InviteForm
          teammate={teammate}
          teamId={teamId}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function InviteForm({ teammate, teamId, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState(teamId || "");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const teams = useQuery({
    queryKey: queryKeys.myTeams,
    queryFn: ({ signal }) => listMyTeams({ signal }),
  });

  const ledTeams = useMemo(
    () =>
      (teams.data || []).filter(
        (team) =>
          team.leader === user?.id && team.status === "open" && team.openSlots > 0
      ),
    [teams.data, user?.id]
  );

  const activeTeam = ledTeams.find((team) => team.id === selectedTeam) || ledTeams[0];

  // "member" is a placeholder: show the first role the leader still needs so
  // the invitation reads specifically rather than generically.
  const roleValue =
    role === "member" && activeTeam?.rolesNeeded?.length
      ? activeTeam.rolesNeeded[0]
      : role;

  const mutation = useMutation({
    mutationFn: () =>
      inviteToTeam(activeTeam.id, {
        userId: teammate.id,
        role: roleValue.trim() || "member",
        message: message.trim(),
      }),
    onSuccess: () => {
      track("team_request_sent", { kind: "invite", teamId: activeTeam.id });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamInvitations(activeTeam.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myRequests({}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      toast.success("Invitation sent", `${teammate.name || "They"} will see it in their wire.`);
      onClose();
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!activeTeam) {
      setError("Choose a team with an open seat.");
      return;
    }
    mutation.mutate();
  }

  return (
    <form className="stack" id="invite-form" onSubmit={handleSubmit} style={{ gap: 20 }}>
      <div className="cluster">
        <Avatar name={teammate?.name} src={teammate?.avatarUrl} size="md" />
        <div className="stack" style={{ gap: 2 }}>
          <strong style={{ fontSize: "0.86rem" }}>{teammate?.name}</strong>
          <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>
            {teammate?.headline || "Builder"} · {teammate?.availability || "available"}
          </span>
        </div>
      </div>

      {teams.isLoading && (
        <div className="loading-block">
          <span className="spinner" aria-hidden="true" /> Loading your crews…
        </div>
      )}

      {!teams.isLoading && ledTeams.length === 0 && (
        <div className="alert alert--info">
          <UsersRound aria-hidden="true" />
          <div className="alert__body">
            <strong>No crew with an open seat.</strong>
            <p>
              Invitations are sent from a team you lead. Start one, and the person
              you picked will be waiting when you get back.
            </p>
            <Link
              to={`/teams?create=1&invite=${teammate?.id || ""}`}
              className="btn btn--primary btn--sm"
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    "hackhub:pendingInvite",
                    JSON.stringify({ id: teammate?.id, name: teammate?.name })
                  );
                } catch {
                  // The flow still works without the reminder.
                }
                onClose();
              }}
              style={{ marginTop: 6, width: "fit-content" }}
            >
              Create a team
            </Link>
          </div>
        </div>
      )}

      {ledTeams.length > 0 && (
        <>
          <div className="field">
            <span className="field__label">Your team</span>
            <div className="team-picker">
              {ledTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  className={`team-picker__option ${
                    activeTeam?.id === team.id ? "is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedTeam(team.id);
                    setRole("member");
                  }}
                >
                  <UsersRound size={16} aria-hidden="true" />
                  <span className="team-picker__body">
                    <strong>{team.name}</strong>
                    <span>{team.hackathonTitle || "Hackathon team"}</span>
                  </span>
                  <span className="team-picker__seats">
                    {team.openSlots} seat{team.openSlots === 1 ? "" : "s"} open
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Field label="Role on the team" htmlFor="invite-role" hint="What should they own?">
            <input
              id="invite-role"
              className="input"
              value={roleValue}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Frontend engineer"
              maxLength={60}
            />
          </Field>

          <Field
            label="Note"
            htmlFor="invite-message"
            optional
            hint={`${message.length}/500 characters`}
          >
            <Textarea
              id="invite-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 500))}
              placeholder="We are building an orbital debris tracker and need someone who can make the data feel alive."
              maxLength={500}
            />
          </Field>
        </>
      )}

      {error && (
        <div className="alert alert--danger" role="alert">
          <span className="alert__body">
            <strong>Invitation did not send.</strong>
            <p>{error}</p>
          </span>
        </div>
      )}

      <div className="dialog__footer" style={{ marginTop: 0 }}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          icon={<Send />}
          loading={mutation.isPending}
          disabled={!activeTeam}
        >
          Send invitation
        </Button>
      </div>
    </form>
  );
}
