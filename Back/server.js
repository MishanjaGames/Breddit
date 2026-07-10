const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const passport = require('passport')
const morgan = require('morgan')
const cors = require('cors')

const keys = require('./config/keys')

const app = express()

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))

mongoose.connect(keys.mongoUrl, { dbName: 'Breddit' })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err))

app.use(morgan('dev'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(passport.initialize())
require('./middleware/passport')(passport)

app.use('/api/auth', require('./routes/auth'))
app.use('/api/posts', require('./routes/posts'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/comments', require('./routes/comments'))
app.use('/api/search', require('./routes/search'))
app.use('/api/votes', require('./routes/votes'))
app.use('/api/users', require('./routes/users'))
app.use('/api/notifications', require('./routes/notification'))

app.get('/', function (req, res) {
    res.send('Breddit backend is running')
})

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' })
})

app.use((err, req, res, next) => {
    console.error(err)
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Server error'
    })
})

if (require.main === module) {
    app.listen(4000, () => console.log('Server started on 4000'))
}

module.exports = app