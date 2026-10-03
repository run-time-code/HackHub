const updateProfileSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    bio: z.string().trim().max(500).optional(),
    college: z.string().trim().max(200).optional(),
    location: z.string().trim().max(100).optional(),
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