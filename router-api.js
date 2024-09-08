const apiRouter = require('express').Router()
const userController = require('./contollers/userController')
const postController = require('./contollers/postController')
const followController = require('./contollers/followController')

// apiRouter.post('/login',function(req,res){
// res.json(" jalan di postman")
// })
apiRouter.post('/login', userController.apiLogin)

module.exports = apiRouter