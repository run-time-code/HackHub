import { describe, expect, it } from "vitest";
import {
  initialFinderSkills,
  prepareTeammates,
  toggleFinderSkill,
} from "./discovery";

describe("finder filters", () => {
  it("seeds at most five unique skills from the signed-in card", () => {
    expect(
      initialFinderSkills({
        skills: ["React", "Node.js", "React", "CSS", "SQL", "Python", "Go"],
      })
    ).toEqual(["React", "Node.js", "CSS", "SQL", "Python"]);
    expect(initialFinderSkills(null)).toEqual([]);
    expect(initialFinderSkills({ skills: ["React", null, 42] })).toEqual(["React"]);
  });

  it("adds, removes and caps selected skills", () => {
    expect(toggleFinderSkill(["React"], "CSS")).toEqual(["React", "CSS"]);
    expect(toggleFinderSkill(["React", "CSS"], "React")).toEqual(["CSS"]);
    expect(toggleFinderSkill(["React"], "", 3)).toEqual(["React"]);
    expect(toggleFinderSkill(["a", "b", "c"], "d", 3)).toEqual(["a", "b", "c"]);
  });

  it("never renders the signed-in builder, even if the API returns them", () => {
    const people = prepareTeammates(
      [
        { id: "me", name: "Asha" },
        { id: "one", name: "Maya", matchScore: 52 },
        { id: "two", name: "Dev", matchScore: 58 },
      ],
      { currentUserId: "me", sort: "match" }
    );
    expect(people.map((person) => person.id)).toEqual(["two", "one"]);
  });

  it("sorts by match, name and recency", () => {
    const people = [
      { id: "1", name: "Zoya", matchScore: 60, updatedAt: "2026-10-20T00:00:00Z" },
      { id: "2", name: "Dev", matchScore: 58, updatedAt: "2026-10-26T00:00:00Z" },
      { id: "3", name: "Asha", matchScore: 58, updatedAt: "2026-10-24T00:00:00Z" },
    ];
    expect(prepareTeammates(people, { sort: "match" }).map((person) => person.name)).toEqual([
      "Zoya",
      "Asha",
      "Dev",
    ]);
    expect(prepareTeammates(people, { sort: "name" }).map((person) => person.name)).toEqual([
      "Asha",
      "Dev",
      "Zoya",
    ]);
    expect(prepareTeammates(people, { sort: "recent" }).map((person) => person.name)).toEqual([
      "Dev",
      "Asha",
      "Zoya",
    ]);
  });
});
