const skillTaxonomy = require("../utils/skillTaxonomy");
const getSkillTaxonomy = (req, res) => {
    console.log("Skill taxonomy retrieved");

    return res.status(200).json({
        message: "Skill taxonomy retrieved successfully",
        skills: skillTaxonomy
    });
};

module.exports = {
    getSkillTaxonomy
};