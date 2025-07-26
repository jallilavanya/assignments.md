const express = require('express')
const router = express.Router()
const controller = require('../controllers/loanController')

router.post('/loans', controller.lendLoan)
router.post('/loans/:loanId/payments', controller.makePayment)
router.get('/loans/:loanId/ledger', controller.getLedger)
router.get('/customers/:customerId/overview', controller.getAccountOverview)

module.exports = router
