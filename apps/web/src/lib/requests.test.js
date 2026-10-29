import { describe, expect, it } from "vitest";
import {
  filterRequests,
  isIncomingRequest,
  isOutgoingRequest,
  requestCopy,
  requestCounts,
  requestDirection,
} from "./requests";

const ME = "user-asha";
const LED = ["team-paper"];

const joinRequest = {
  id: "req-join",
  type: "request",
  status: "pending",
  initiatedBy: "user-rohan",
  user: { id: "user-rohan", name: "Rohan Iyer" },
  team: { id: "team-paper", name: "Paper Kites", leader: "user-asha" },
};

const invitation = {
  id: "req-invite",
  type: "invite",
  status: "pending",
  initiatedBy: "user-maya",
  user: { id: "user-asha", name: "Asha Raman" },
  team: { id: "team-atlas", name: "Atlas of Small Things", leader: "user-maya" },
};

const outgoing = {
  id: "req-out",
  type: "request",
  status: "pending",
  initiatedBy: "user-asha",
  user: { id: "user-asha", name: "Asha Raman" },
  team: { id: "team-north", name: "Northstar", leader: "user-kabir" },
};

const declined = {
  ...outgoing,
  id: "req-declined",
  status: "declined",
  team: { id: "team-loom", name: "Loom & Ledger", leader: "user-tara" },
};

describe("request classification", () => {
  it("treats join requests to a led team as incoming", () => {
    expect(isIncomingRequest(joinRequest, ME, LED)).toBe(true);
    expect(requestDirection(joinRequest, ME, LED)).toBe("incoming");
    expect(isOutgoingRequest(joinRequest, ME, LED)).toBe(false);
  });

  it("treats invitations addressed to the current user as incoming", () => {
    expect(isIncomingRequest(invitation, ME)).toBe(true);
    expect(requestDirection(invitation, ME)).toBe("incoming");
  });

  it("keeps the viewer's own sent rows outgoing", () => {
    expect(isIncomingRequest(outgoing, ME)).toBe(false);
    expect(isOutgoingRequest(outgoing, ME)).toBe(true);
    expect(requestDirection(outgoing, ME)).toBe("outgoing");
  });

  it("does not claim another builder's request", () => {
    const stranger = {
      ...outgoing,
      initiatedBy: "user-noor",
      user: { id: "user-noor", name: "Noor Fatima" },
    };
    expect(requestDirection(stranger, ME)).toBe("other");
  });

  it("counts pending and resolved work separately", () => {
    const counts = requestCounts(
      [joinRequest, invitation, outgoing, declined],
      ME,
      LED
    );
    expect(counts).toMatchObject({
      incoming: 2,
      outgoing: 1,
      history: 1,
      pendingIncoming: 2,
      pendingOutgoing: 1,
      requests: 3,
      invites: 1,
    });
  });

  it("filters by tab and request type", () => {
    const all = [joinRequest, invitation, outgoing, declined];
    expect(
      filterRequests(all, { tab: "incoming", currentUserId: ME, ledTeamIds: LED })
    ).toHaveLength(2);
    expect(
      filterRequests(all, {
        tab: "incoming",
        type: "invite",
        currentUserId: ME,
        ledTeamIds: LED,
      })
    ).toEqual([invitation]);
    expect(
      filterRequests(all, {
        tab: "history",
        type: "request",
        currentUserId: ME,
        ledTeamIds: LED,
      })
    ).toEqual([declined]);
  });

  it("writes direction-aware copy for each side of the wire", () => {
    expect(requestCopy(joinRequest, ME, LED).title).toMatch(/wants to join/);
    expect(requestCopy(invitation, ME, LED).title).toMatch(/invited you/);
    expect(requestCopy(outgoing, ME, LED).title).toMatch(/Request to join/);
    expect(requestCopy(declined, ME, LED).title).toMatch(/Request to join/);
  });
});
