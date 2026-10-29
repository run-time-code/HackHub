import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Sparkles, UsersRound, X } from "lucide-react";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import Avatar from "../ui/Avatar";
import { createTeam, updateTeam } from "../../lib/api/teams";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useToast } from "../../providers/ToastProvider";
import { track } from "../../lib/analytics";

function initialForm(team = null) {
  return {
    hackathonId: team?.hackathon || "",
    name: team?.name || "",
    description: team?.description || "",
    rolesNeeded: team?.rolesNeeded || [],
    maxTeamSize: team?.maxTeamSize || 4,
    status: team?.status || "open",
  };
}

export default function TeamDialog({
  open,
  onOpenChange,
  mode = "create",
  team = null,
  hackathons = [],
  defaultHackathonId = "",
  onCreated,
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit the crew" : "Start a crew"}
      description={
        mode === "edit"
          ? "Change the brief, the roles you still need or the number of seats."
          : "A name, a hackathon and a one-line mission are enough to begin."
      }
      size="lg"
    >
      {open && (
        <TeamForm
          mode={mode}
          team={team}
          hackathons={hackathons}
          defaultHackathonId={defaultHackathonId}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </Dialog>
  );
}

function TeamForm({ mode, team, hackathons, defaultHackathonId, onClose, onCreated }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const start = useMemo(() => {
    const value = initialForm(team);
    if (!value.hackathonId) value.hackathonId = defaultHackathonId || hackathons[0]?.id || "";
    return value;
  }, [team, defaultHackathonId, hackathons]);

  const [form, setForm] = useState(start);
  const [roleDraft, setRoleDraft] = useState("");
  const [error, setError] = useState("");
  const minimumSize = mode === "edit" ? Math.max(2, team?.size || 2) : 2;

  const activeHackathon = hackathons.find((entry) => entry.id === form.hackathonId);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        rolesNeeded: form.rolesNeeded,
        maxTeamSize: form.maxTeamSize,
      };
      if (mode === "edit") return updateTeam(team.id, { ...payload, status: form.status });
      return createTeam({ ...payload, hackathonId: form.hackathonId });
    },
    onSuccess: (savedTeam) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTeams });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(savedTeam.id) });
      if (mode === "create") {
        track("team_created", { teamId: savedTeam.id, hackathonId: savedTeam.hackathon });
        toast.success("Crew created", "You are the leader. Invite the first builder.");
      } else {
        track("team_updated", { teamId: savedTeam.id });
        toast.success("Crew updated", "The card is up to date.");
      }
      onCreated?.(savedTeam);
      onClose();
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addRole() {
    const next = roleDraft.trim();
    if (!next) return;
    if (form.rolesNeeded.length >= 10) {
      setError("A crew can list at most ten roles.");
      return;
    }
    if (form.rolesNeeded.some((role) => role.toLowerCase() === next.toLowerCase())) {
      setRoleDraft("");
      return;
    }
    set("rolesNeeded", [...form.rolesNeeded, next]);
    setRoleDraft("");
    setError("");
  }

  function removeRole(role) {
    set(
      "rolesNeeded",
      form.rolesNeeded.filter((entry) => entry !== role)
    );
  }

  function submit(event) {
    event.preventDefault();
    setError("");
    if (form.name.trim().length < 3) {
      setError("Give the crew a name of at least three characters.");
      return;
    }
    if (form.name.trim().length > 80) {
      setError("Keep the name under eighty characters.");
      return;
    }
    if (mode === "create" && !form.hackathonId) {
      setError("Choose the hackathon this crew is building for.");
      return;
    }
    if (form.maxTeamSize < minimumSize) {
      setError(`This crew already has ${team?.size || minimumSize} builders. Raise the seat count.`);
      return;
    }
    mutation.mutate();
  }

  return (
    <form className="team-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Hackathon" htmlFor="team-hackathon" className="form-grid--full">
          <select
            id="team-hackathon"
            className="select"
            value={form.hackathonId}
            onChange={(event) => set("hackathonId", event.target.value)}
            disabled={mode === "edit"}
          >
            <option value="">Choose a hackathon</option>
            {hackathons.map((hackathon) => (
              <option key={hackathon.id} value={hackathon.id}>
                {hackathon.title}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Crew name"
          htmlFor="team-name"
          hint="Short enough to fit on a badge."
          className="form-grid--full"
        >
          <Input
            id="team-name"
            value={form.name}
            onChange={(event) => set("name", event.target.value.slice(0, 80))}
            placeholder="Orbital Drift"
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label="Mission"
          htmlFor="team-mission"
          optional
          hint={`${form.description.length}/500 characters`}
          className="form-grid--full"
        >
          <Textarea
            id="team-mission"
            value={form.description}
            onChange={(event) => set("description", event.target.value.slice(0, 500))}
            placeholder="We are building an orbital debris tracker that makes the sky legible to the rest of us."
            maxLength={500}
          />
        </Field>

        <Field
          label="Roles needed"
          htmlFor="team-role"
          hint="Press Enter after each role. Ten at most."
          className="form-grid--full"
        >
          <div className="skill-input">
            {form.rolesNeeded.map((role) => (
              <span className="chip" key={role}>
                {role}
                <button
                  type="button"
                  aria-label={`Remove ${role}`}
                  onClick={() => removeRole(role)}
                  style={{ border: 0, background: "transparent", color: "inherit", display: "grid" }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              id="team-role"
              value={roleDraft}
              onChange={(event) => setRoleDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addRole();
                }
              }}
              onBlur={addRole}
              placeholder={form.rolesNeeded.length ? "Add another role" : "ML engineer"}
              maxLength={60}
            />
          </div>
        </Field>

        <Field
          label="Team size"
          htmlFor="team-size"
          hint={
            mode === "edit"
              ? "Includes the leader and everyone already in the crew."
              : "Includes you. You can change this later."
          }
          className="form-grid--full"
        >
          <div className="cluster" style={{ gap: 12 }}>
            <div className="stepper">
              <button
                type="button"
                onClick={() => set("maxTeamSize", Math.max(minimumSize, form.maxTeamSize - 1))}
                disabled={form.maxTeamSize <= minimumSize}
                aria-label="Decrease team size"
              >
                <Minus />
              </button>
              <span id="team-size" aria-live="polite">
                {form.maxTeamSize}
              </span>
              <button
                type="button"
                onClick={() => set("maxTeamSize", Math.min(10, form.maxTeamSize + 1))}
                disabled={form.maxTeamSize >= 10}
                aria-label="Increase team size"
              >
                <Plus />
              </button>
            </div>
            <span className="team-card__size">
              {form.maxTeamSize - (team?.size || 1)}{" "}
              {form.maxTeamSize - (team?.size || 1) === 1 ? "seat" : "seats"} open
            </span>
          </div>
        </Field>

        {mode === "edit" && (
          <Field
            label="Recruiting"
            htmlFor="team-status"
            hint="Closing a team withdraws everyone still waiting."
            className="form-grid--full"
          >
            <select
              id="team-status"
              className="select"
              value={form.status}
              onChange={(event) => set("status", event.target.value)}
            >
              <option value="open">Open to requests</option>
              <option value="closed">Closed — full or not recruiting</option>
            </select>
          </Field>
        )}
      </div>

      <div className="team-form__preview">
        <div className="team-form__preview-label">Live preview</div>
        <div className="cluster" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="team-form__preview-name">{form.name.trim() || "Untitled crew"}</div>
            <div className="team-form__preview-meta">
              <span>{activeHackathon?.title || "Choose a hackathon"}</span>
              <span>
                <UsersRound size={11} aria-hidden="true" /> {form.maxTeamSize} seats
              </span>
            </div>
          </div>
          <Avatar name={form.name || "Team"} size="md" />
        </div>
        {form.rolesNeeded.length > 0 && (
          <div className="team-card__roles" style={{ marginTop: 12 }}>
            {form.rolesNeeded.map((role) => (
              <span className="chip" key={role}>
                {role}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert--danger" role="alert">
          <Sparkles aria-hidden="true" />
          <div className="alert__body">
            <strong>The crew did not save.</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="dialog__footer" style={{ marginTop: 0 }}>
        <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={mutation.isPending}>
          {mode === "edit" ? "Save crew" : "Create crew"}
        </Button>
      </div>
    </form>
  );
}
