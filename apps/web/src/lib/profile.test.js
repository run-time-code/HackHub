import { describe, expect, it } from "vitest";
import { profileChecklist, profileLinkEntries, profileMeta } from "./profile";

const complete = {
  name: "Asha Raman",
  headline: "Full-stack builder turning messy data into calm interfaces.",
  bio: "I build the unglamorous middle of a product: APIs that make sense.",
  skills: ["React", "Node.js", "CSS"],
  links: { github: "https://github.com/asha", linkedin: "", portfolio: "" },
  pastHackathons: [{ name: "Floodline", year: "2025", projectUrl: "" }],
  discoverable: true,
};

describe("profile completion", () => {
  it("starts empty", () => {
    expect(profileChecklist(null)).toMatchObject({ done: 0, total: 6, percent: 0 });
  });

  it("reaches one hundred when all six marks are made", () => {
    const result = profileChecklist(complete);
    expect(result.done).toBe(6);
    expect(result.percent).toBe(100);
    expect(result.items.every((item) => item.done)).toBe(true);
  });

  it("counts only real biography text and three skills", () => {
    const nearly = profileChecklist({
      ...complete,
      bio: "   too short   ",
      skills: ["React", "CSS"],
      discoverable: false,
    });
    expect(nearly.done).toBe(3);
    expect(nearly.percent).toBe(50);
    expect(nearly.items.find((item) => item.key === "story")?.done).toBe(false);
    expect(nearly.items.find((item) => item.key === "skills")?.done).toBe(false);
    expect(nearly.items.find((item) => item.key === "visibility")?.done).toBe(false);
  });

  it("trims the bio before applying the forty-character threshold", () => {
    const forty = "1234567890123456789012345678901234567890";
    const result = profileChecklist({
      ...complete,
      bio: `  ${forty}  `,
    });
    expect(result.items.find((item) => item.key === "story")?.done).toBe(true);
  });

  it("surfaces only filled links and readable metadata", () => {
    expect(profileLinkEntries(complete).map((entry) => entry.key)).toEqual(["github"]);
    expect(
      profileMeta({
        college: "NID Ahmedabad",
        year: "2027",
        location: "Ahmedabad, India",
      })
    ).toEqual(["NID Ahmedabad", "Class of 2027", "Ahmedabad, India"]);
  });
});
