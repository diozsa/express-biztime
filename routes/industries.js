const express = require("express");
const ExpressError = require("../expressError")
const router = express.Router();
const db = require("../db");

router.get("/", async function (req, res, next) {
    try {
        const respIndustries = await db.query(
            `SELECT i.industry
            --, ci.comp_code
            FROM industries AS i
            --JOIN companies_industries AS ci
            --ON i.code = ci.ind_code
            ORDER BY i.industry`);

        let industries = respIndustries.rows.map(ind => ind.industry);
        return res.json({ "industries": industries });
    }
    catch (err) {
        return next(err);
    }
});

// add an industry to the industry table
router.post("/", async (req, res, next) => {
    try {
        let { code, industry } = req.body;

        const result = await db.query(
            `INSERT INTO industries (code, industry) VALUES ($1, $2)
      RETURNING code, industry`, [code, industry]);

        return res.status(201).json({ "industry": result.rows[0] });

    } catch (e) {
        return next(e);
    }
});

module.exports = router;