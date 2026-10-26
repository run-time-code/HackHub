const { z } = require("zod");

const OPTIONAL_URL_MESSAGE = "must be empty or a valid http(s) URL";

function isOptionalHttpUrl(value) {
    if (value === "") {
        return true;
    }

    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

const optionalUrlSchema = z.string()
    .trim()
    .max(300)
    .refine(isOptionalHttpUrl, { message: OPTIONAL_URL_MESSAGE });

const linksSchema = z.object({
    github: optionalUrlSchema.optional(),
    linkedin: optionalUrlSchema.optional(),
    portfolio: optionalUrlSchema.optional()
}).strict();

const pastHackathonSchema = z.object({
    name: z.string().trim().max(120).optional(),
    year: z.string().trim().max(10).optional(),
    projectUrl: optionalUrlSchema.optional()
}).strict();

const proficiencyLevelSchema = z.enum([
    "beginner",
    "intermediate",
    "advanced",
    "expert"
]);

const updateProfileSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    bio: z.string().trim().max(500).optional(),
    college: z.string().trim().max(200).optional(),
    location: z.string().trim().max(100).optional(),
    headline: z.string().trim().max(120).optional(),
    year: z.string().trim().max(20).optional(),
    links: linksSchema.optional(),
    pastHackathons: z.array(pastHackathonSchema).max(10).optional(),
    skillProficiency: z.record(
        z.string().trim().min(1).max(50),
        proficiencyLevelSchema
    ).optional(),
    availability: z.enum(["available", "limited", "unavailable"]).optional(),
    lookingForTeam: z.boolean().optional(),
    discoverable: z.boolean().optional(),
    preferences: z.record(z.string(), z.any()).optional()
}).strict().refine(
    data => Object.keys(data).length > 0,
    {
        message: "At least one profile field is required"
    }
);

const updateSkillsSchema = z.object({
    skills: z.array(
        z.string().trim().min(1).max(50)
    ).max(10)
});

module.exports = {
    updateProfileSchema,
    updateSkillsSchema
};
