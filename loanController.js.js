const db = require('../db')
exports.lendLoan = (req, res) => {
  console.log('✅ [lendLoan] Controller accessed')
  const {customer_id, principal, interest_rate, period_years} = req.body

  if (
    !customer_id ||
    typeof principal !== 'number' ||
    typeof interest_rate !== 'number' ||
    typeof period_years !== 'number'
  ) {
    console.warn('⚠️ Invalid input')
    return res
      .status(400)
      .json({error: 'All fields are required with correct data types.'})
  }

  const interest = principal * (interest_rate / 100) * period_years
  const totalAmount = principal + interest
  const monthlyEmi = parseFloat((totalAmount / (period_years * 12)).toFixed(2))

  const query = `
    INSERT INTO loans (
      customer_id, principal, interest_rate, period_years,
      interest, total_amount, monthly_emi
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  const values = [
    customer_id,
    principal,
    interest_rate,
    period_years,
    interest,
    totalAmount,
    monthlyEmi,
  ]

  db.run(query, values, function (err) {
    console.log('🗃️ DB Callback Fired:', err, this?.lastID)
    if (err) return res.status(500).json({error: err.message})

    res.status(201).json({
      loan_id: this.lastID,
      customer_id,
      total_amount_payable: parseFloat(totalAmount.toFixed(2)),
      monthly_emi: monthlyEmi,
    })
  })
}

// 💳 Record a Payment for a Loan
exports.makePayment = (req, res) => {
  const {loanId} = req.params
  const {amount, payment_type} = req.body

  if (!amount || !payment_type) {
    return res
      .status(400)
      .json({error: 'Payment amount and type are required.'})
  }

  const query = `
    INSERT INTO payments (loan_id, payment_type, amount)
    VALUES (?, ?, ?)
  `

  db.run(query, [loanId, payment_type, amount], function (err) {
    if (err) return res.status(500).json({error: err.message})

    db.all(
      `SELECT SUM(amount) AS totalPaid FROM payments WHERE loan_id = ?`,
      [loanId],
      (err, rows) => {
        if (err) return res.status(500).json({error: err.message})

        const totalPaid = rows[0]?.totalPaid || 0

        db.get(
          `SELECT * FROM loans WHERE loan_id = ?`,
          [loanId],
          (err, loan) => {
            if (err || !loan)
              return res.status(404).json({error: 'Loan not found.'})

            const balance = parseFloat(
              (loan.total_amount - totalPaid).toFixed(2),
            )
            const emisLeft = Math.ceil(balance / loan.monthly_emi)

            res.json({
              payment_id: this.lastID,
              loan_id: loanId,
              message: 'Payment recorded successfully.',
              remaining_balance: balance,
              emis_left: emisLeft,
            })
          },
        )
      },
    )
  })
}

// 📒 Get Ledger Details for a Loan
exports.getLedger = (req, res) => {
  const {loanId} = req.params

  db.get(`SELECT * FROM loans WHERE loan_id = ?`, [loanId], (err, loan) => {
    if (err || !loan) return res.status(404).json({error: 'Loan not found.'})

    db.all(
      `SELECT * FROM payments WHERE loan_id = ?`,
      [loanId],
      (err, payments) => {
        if (err) return res.status(500).json({error: err.message})

        const amount_paid = payments.reduce((sum, p) => sum + p.amount, 0)
        const balance = parseFloat((loan.total_amount - amount_paid).toFixed(2))
        const emisLeft = Math.ceil(balance / loan.monthly_emi)

        res.json({
          loan_id: loan.loan_id,
          customer_id: loan.customer_id,
          principal: loan.principal,
          total_amount: loan.total_amount,
          monthly_emi: loan.monthly_emi,
          amount_paid,
          balance_amount: balance,
          emis_left: emisLeft,
          transactions: payments.map(p => ({
            transaction_id: p.payment_id,
            date: p.date,
            amount: p.amount,
            type: p.payment_type,
          })),
        })
      },
    )
  })
}

// 📊 Get Account Overview by Customer
exports.getAccountOverview = (req, res) => {
  const {customerId} = req.params

  db.all(
    `SELECT * FROM loans WHERE customer_id = ?`,
    [customerId],
    (err, loans) => {
      if (err) return res.status(500).json({error: err.message})
      if (!loans.length)
        return res
          .status(404)
          .json({error: 'No loans found for this customer.'})

      let overview = []
      let count = 0

      loans.forEach(loan => {
        db.all(
          `SELECT * FROM payments WHERE loan_id = ?`,
          [loan.loan_id],
          (err, payments) => {
            const paid = payments.reduce((sum, p) => sum + p.amount, 0)
            const emisLeft = Math.ceil(
              (loan.total_amount - paid) / loan.monthly_emi,
            )

            overview.push({
              loan_id: loan.loan_id,
              principal: loan.principal,
              total_amount: loan.total_amount,
              total_interest: loan.interest,
              emi_amount: loan.monthly_emi,
              amount_paid: paid,
              emis_left: emisLeft,
            })

            count++
            if (count === loans.length) {
              res.json({
                customer_id: customerId,
                total_loans: loans.length,
                loans: overview,
              })
            }
          },
        )
      })
    },
  )
}
