const sqlite3 = require('sqlite3').verbose()
const {open} = require('sqlite')
const path = require('path')

let db

const initDB = async () => {
  db = await open({
    filename: path.join(__dirname, 'bank.db'),
    driver: sqlite3.Database,
  })

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    );
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      principal REAL,
      interest_rate REAL,
      period_years INTEGER,
      interest REAL,
      total_amount REAL,
      monthly_emi REAL,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER,
      payment_type TEXT, -- 'EMI' or 'LUMP_SUM'
      amount REAL,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
    );
  `)

  console.log(' Database initialized')
  return db
}

module.exports = (async () => {
  if (!db) {
    db = await initDB()
  }
  return db
})()
