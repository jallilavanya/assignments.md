const express = require('express')
const bodyParser = require('body-parser')
const loanRoutes = require('./routes/loanRoutes')

const app = express()
app.use(bodyParser.json())
app.use('/api/v1', loanRoutes)

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000')
})
