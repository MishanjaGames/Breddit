const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const passport = require('passport')
const morgan = require('morgan')
const cors = require('cors');

const keys = require('./config/keys')

const app = express()

// Настройки CORS для разрешения запросов с клиента
app.use(cors({
  origin: 'http://localhost:3000', // адрес фронтенда
  credentials: true                // разрешение кросс-доменных cookie
}));

mongoose.connect(keys.mongoUrl, { dbName: 'Breddit' })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err))

app.use(morgan('dev'))

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Подключаем passport и его JWT-стратегию
// app.use(passport.initialize())
// require('./middleware/passport')(passport)

// Роуты
app.use('/api/auth', require('./routes/auth'))
app.use('/api/posts', require('./routes/posts'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/comments', require('./routes/comments'))

app.get('/', function (req, res) {
    res.send('Hello World')
})

app.listen(4000, () => console.log('Server started on 4000'))