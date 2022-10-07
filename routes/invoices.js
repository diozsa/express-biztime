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
    let id = req.params.id;
    let invoices = await db.query(
      `SELECT i.id, 
              i.comp_code, 
              i.amt, 
              i.paid, 
              i.add_date, 
              i.paid_date, 
              c.name, 
              c.description
        FROM invoices AS i
        INNER JOIN companies AS c
        ON (i.comp_code = c.code)
        WHERE id = $1`, [id]);
    if (invoices.rows.length === 0) 
      throw new ExpressError(`No invoice found with id of ${id}`, 404);
    let rsp = invoices.rows[0];
    let invoice = {
      id: rsp.id,
      amt: rsp.amt,
      paid: rsp.paid,
      add_date: rsp.add_date,
      paid_date: rsp.paid_date,
      company: {
        code: rsp.comp_code,
        name: rsp.name,
        description: rsp.description
      }
    };
    return res.json({"invoice": invoice})

  } catch (e) {
    return next(e);
  }
})


// POST /invoices
// {comp_code, amt} => {invoice: {id, comp_code, amt, paid, add_date, paid_date}}

router.post("/", async (req, res, next) => {
  try {
    let { comp_code, amt } = req.body;
    let companies = await db.query(`SELECT code FROM companies`);
    let codes = companies.rows.map(comp => comp.code);

// check comp_code and amt
    if (isNaN(amt))
      throw new ExpressError(`Amount needs to be a number`, 422);
    if (!codes.includes(comp_code))
      throw new ExpressError(`Company code not in DataBase`, 422);

    let result = await db.query(
      `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2)
       RETURNING id, comp_code, amt, paid, add_date, paid_date`, [comp_code, amt]);
    
    
    return res.status(201).json({ "invoices": result.rows[0] });

  } catch (e) {
    return next(e);
  }
})


/* PUT /invoices/[id]
 {amt, paid} => {invoice: {id, comp_code, amt, paid, add_date, paid_date}}

If paying unpaid invoice: sets paid_date to today
If un - paying: sets paid_date to null
Else: keep current paid_date
*/

router.put("/:id", async (req, res, next) => {
  try {
    let { amt, paid } = req.body;
    let { id } = req.params;
    let paidDate = null;

    let searchRes = await db.query(
      `SELECT paid FROM invoices WHERE id = $1`, [id]);
    
    if (searchRes.rows.length === 0) 
      throw new ExpressError(`No invoice found with id: ${id}`, 404);
    
    const currPaidDate = searchRes.rows[0].paid_date;
    if (!currPaidDate && paid)
      paidDate = new Date();
    else if (!paid) paidDate = null
    else paidDate = currPaidDate;
    
    const result = await db.query(
      `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3 WHERE id=$4
       RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [amt, paid, paidDate, id]);
    return res.json({"invoice": result.rows[0]})
  } catch (e) {
    return next(e);
  }
})


// DELETE /invoices/[id] => {status: "deleted"}

router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let response = await db.query(
      `DELETE FROM invoices WHERE id = $1 RETURNING id`, [id]);
    
    if (response.rows.length === 0)
      throw new ExpressError(`No invoice found with id: ${id}`, 404);
    
    return res.json({"status": "deleted"})
  } catch (e) {
    return next(e)
  }
})


module.exports = router;
