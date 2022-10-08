const express = require("express");
const ExpressError = require("../expressError")
const router = express.Router();
const db = require("../db");
const slugify = require("slugify");

// GET /companies --> list of companies
// => {companies: [{code, name}, ...]}

router.get("/", async (req, res, next) => {
  try {
    const results = await db.query(`SELECT code, name FROM companies ORDER BY name`);
    return res.json({"companies": results.rows})
  } catch(e) {
      return next(e); 
  }
})

/* GET /comapanies/[code] => 
{company: {
  code, name, description, 
  invoices: [id, ...],
  industries: [technology, ...]
}}

 */
router.get("/:code", async (req, res, next) => {
  try {
    let { code } = req.params;
    
    let respCompany = await db.query(
      `SELECT code, name, description FROM companies WHERE code = $1`, [code]);
    let respInvoices = await db.query(
      `SELECT id FROM invoices WHERE comp_code = $1`, [code]);
    let respIndustries = await db.query(
      `SELECT i.industry
          FROM industries AS i
          LEFT JOIN companies_industries AS ci
          ON i.code = ci.ind_code
          LEFT JOIN companies AS c
          ON ci.comp_code = c.code
          WHERE c.code = $1`, [code]);
    
    if (respCompany.rows.length === 0) {
      throw new ExpressError(`No company found with code ${code}`, 404);
    }
    let company = respCompany.rows[0];
    let invoices = respInvoices.rows;
    let industries = respIndustries.rows;

    company.invoices = invoices.map(invoice => invoice.id);
    company.industries = industries.map(ind => ind.industry);
    
    return res.json({ "company": company });

  } catch (e) {
    return next(e);
  }
});

// POST  => add new company. Use slugify to add company code
// {name, descrip}  =>  {company: {code, name, descrip}}

router.post("/", async (req, res, next) => {
  try {
    let { name, description } = req.body;
    let code = slugify(name, { lower: true });

    const company = await db.query(
      `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3)
      RETURNING code, name, description`, [code, name, description]);
    
    return res.status(201).json({ "company": company.rows[0] });

  } catch (e)
  {
    return next(e);    
  }
});

// PUT /[code] - input {name, descrip}  =>  {company: {code, name, descrip}}

router.put("/:code", async (req, res, next) => {
  try {
    let { name, description } = req.body;
    let code = req.params.code;

    let result = await db.query(
      `UPDATE companies SET name=$1, description=$2 WHERE code = $3
      RETURNING code, name, description`, [name, description, code]);
    
    if (result.rows.length === 0) {
      throw new ExpressError(`No company found with code ${code}`, 404);
    } else {
      return res.json({ "company": result.rows[0] });
    }
  } catch(e) {
    return next(e);
  }
})

// DELETE /[code] = > {status: "deleted"}

router.delete("/:code", async (req, res, next) => {
  try {
    let { code } = req.params;
    let company = await db.query(
      `DELETE FROM companies WHERE code=$1 RETURNING code`, [code])
    if (company.rows.length === 0) {
      throw new ExpressError(`No company found with code ${code}`, 404);
    } else {
      return res.json({ "status": "deleted" });
    }
  } catch (e) {
    return next(e)
  }
})


module.exports = router;
