const bcrypt = require("bcryptjs")
const userCollection = require('../db').db().collection('users')
const validator = require("validator")
const md5 = require("md5")

let User = function(data,getAvatar){
this.data = data
this.errors = []
 if(getAvatar == undefined){getAvatar = false}
 if(getAvatar){this.getAvatar()}
}

User.prototype.cleanUp = function(){
    if(typeof(this.data.username) != "string"){this.data.username = ""}
    if(typeof(this.data.email) != "string"){this.data.email = ""}
    if(typeof(this.data.password) != "string"){this.data.password = ""}

//membersihkan data dari properti palsu
this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password
}}

User.prototype.login = function(){
    return new Promise((resolve,reject) =>{
        this.cleanUp()
        userCollection.findOne({username: this.data.username}).then((attemptedUser)=>{
            if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)){
                this.data = attemptedUser
                this.getAvatar()
                resolve('berhasil login')
            }else{
                reject('gagal login/password salah')
            }
        }).catch(function(){
            reject("ada kesalahan pada database")
        })
    }) 
}

User.prototype.validation = function(){
    return new Promise(async (resolve,reject) =>{
        if(this.data.username == ""){this.errors.push("username tidak boleh kosong")}
        if(this.data.username != "" && !validator.isAlphanumeric(this.data.username)){this.errors.push(" username yang diperbolehkan hanya huruf dan angka")}
        if(!validator.isEmail(this.data.email)){this.errors.push("email tidak boleh kosong")}
        if(this.data.password == ""){this.errors.push("password tidak boleh kosong")}
        if(this.data.password.length > 0 && this.data.password.length < 6){this.errors.push("password tidak boleh kurang dari 6 karakter")}
        if(this.data.password.length > 50){this.errors.push("password tidak boleh lebih dari 50 karakter")}
        if(this.data.username.length > 0 && this.data.username.length < 3){this.errors.push(" tidak boleh kurang dari 3 karakter")}
        if(this.data.username.length > 12){this.errors.push("username tidak boleh lebih dari 12 karakter")}
        
        // cek username apakah dimiliki atau tidak 
        if(this.data.username.length >2 && this.data.username.length <31 && validator.isAlphanumeric(this.data.username)){
            let usernameExists = await userCollection.findOne({username : this.data.username})
            if(usernameExists){this.errors.push(" username sudah dimiliki orang lain")}
        }
        // cek email apakah dimiliki atau tidak 
        if(validator.isEmail(this.data.email)){
            let emailExists = await userCollection.findOne({email : this.data.email})
            if(emailExists){this.errors.push(" email sudah dimiliki orang lain")}
        }
        resolve()
        })
}



User.prototype.register = function(){
   return new Promise(async (resolve,reject) =>{
    this.cleanUp()
        // 1  membuat validasi untuk user
    await this.validation()
        // 2 hanya jika user valid maka simpan database
    if(!this.errors.length){
        // hash password
        let salt = bcrypt.genSaltSync(10)
        this.data.password = bcrypt.hashSync(this.data.password, salt)
       await userCollection.insertOne(this.data)
       this.getAvatar()
       resolve()
    } else{
        reject(this.errors)
    }
    }) 
}

User.prototype.getAvatar =function(){
    this.avatar = `http://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username){
    return new Promise(function(resolve,reject){
        if(typeof(username)!= "string"){
            reject()
            return
}
    userCollection.findOne({username: username}).then(function(userDoc){
        if(userDoc){
          userDoc = new User(userDoc, true)
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar
          }
            resolve(userDoc)
        }else{
            reject()
        }
      }).catch(function(){
            reject()
      })
    })
}

User.doesEmailExist = function(email){
    return new Promise(async function(resolve,reject){
        if(typeof(email) !="string"){
            resolve(false)
            return
        }
        let user = await userCollection.findOne({email: email})
        if(user){
            resolve(true)
        }else{
            resolve(false)
        }
    })
}

module.exports = User