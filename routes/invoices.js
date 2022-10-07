const express = require("express");
const ExpressError = require("../expressError")
const router = express.Router();
const db = require("../db");

// GET /invoices => {invoices: [{id, comp_code}, ...]}

router.get("/", async function (req, res, next) {
  try {
    const invoices = await db.query(
      `SELECT id, comp_code FROM invoices ORDER BY id`);
    return res.json({ "invoices": invoices.rows });
  }
  catch (err) {
    return next(err);
  }
});


// GET /invoices/[id]
// {invoice: {id, amt, paid, add_date, paid_date, company: { code, name, description }}}

router.get("/:id", async (req, res, next) => {
  try {
    
  } catch (e) {
    return next(e);
  }
})



module.exports = router;
