const postsCollection = require('../db').db().collection("posts")
const followsCollection = require('../db').db().collection("follows")
const ObjectID = require("mongodb").ObjectID
const { resolve } = require('mongodb/lib/core/topologies/read_preference')
const User = require("./User")
const { post } = require('../router')
const sanitizeHTML = require('sanitize-html')

let Post=function(data,userId,requestedPostId){
this.data = data
this.errors = []
this.userId = userId
this.requestedPostId = requestedPostId
}

Post.prototype.cleanUp = function(){
if(typeof(this.data.title) != "string"){this.data.title =""}
if(typeof(this.data.body) != "string"){this.data.body =""}

//membersihkan data dari property palsu
this.data ={
    title : sanitizeHTML(this.data.title.trim(),{allowedTags:[], allowedAttributes:{}}),
    body : sanitizeHTML(this.data.body.trim(),{allowedTags:[], allowedAttributes:{}}),
    createDate : new Date(),
    author : ObjectID(this.userId)

}

}

Post.prototype.validate = function(){
if(this.data.title == ""){this.errors.push("title tidak boleh kosong")}
if(this.data.body == ""){this.errors.push("body tidak boleh kosong")}
}

Post.prototype.create = function(){
return new Promise((resolve,reject)=>{
    this.cleanUp()
    this.validate()
    if(!this.errors.length){
        //save ke database
        postsCollection.insertOne(this.data).then((info)=>{
            resolve(info.ops[0]._id)
        }).catch(()=>{
            this.errors.push("coba lagi ya.")
            reject(this.errors)
        })
    }else{
        reject(this.errors)
    }
})
}

Post.prototype.update = function(){
    return new Promise(async(resolve,reject)=>{
        try{
            let post =await Post.findSingleById(this.requestedPostId,this.userId)
            if(post.isVisitorOwner){
                // maka update database
               let status = await this.actuallyUpdate()
               
                resolve(status)
            }else{
                reject()
            }
        }catch{
            reject()
        }
    })
}

Post.prototype.actuallyUpdate = function(){
    return new Promise(async(resolve,reject)=>{
        this.cleanUp()
        this.validate()
        if(!this.errors.length){
           await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)},{$set:{title: this.data.title, body:this.data.body}})
            resolve("success")
        }   else{
            resolve("failure")
        }
    })
}

Post.reusablePostQuery = function(uniqueOperations,visitorId,finalOperations = []){
    return new Promise (async function(resolve,reject){
        let aggOperations = uniqueOperations.concat([
            {$lookup : {from : "users", localField : "author", foreignField : "_id", as: "author"}},
            {$project : {
                title : 1,
                body : 1,
                createDate : 1,
                authorId :{$arrayElemAt: ["$author._id", 0]},
                author : {$arrayElemAt: ["$author", 0]}
            }}
        ]).concat(finalOperations)


        let posts = await postsCollection.aggregate(aggOperations).toArray()
        //clean author properti pada post object
        posts = posts.map(function(post){
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post 
        }) 
       resolve(posts)
    })
}

Post.findSingleById = function(id,visitorId){
    return new Promise (async function(resolve,reject){
        if(typeof(id) != "string" || !ObjectID.isValid(id)){
            reject()
            return
        }
       
        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectID(id)}}
        ], visitorId)

        if(posts.length){
           // console.log(posts[0])
            resolve(posts[0])
        }else{
            reject()
        }
    })
}

Post.findByAuthorId = function(authorId){
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createDate: -1}}
    ])
}


Post.delete = function(postIdToDelete,currentUserId){
    return new Promise(async(resolve,reject)=>{
        try{
            let post = await Post.findSingleById(postIdToDelete,currentUserId)
            if(post.isVisitorOwner){
              await postsCollection.deleteOne({_id: new ObjectID(postIdToDelete)})
              resolve()  
            }else{
                reject()
            }
        }catch{
            reject()
        }
    })
}

Post.search = function(searchTerm){   
 return new Promise(async(resolve,reject)=>{
    if(typeof(searchTerm)== "string"){
        let posts = await Post.reusablePostQuery([
            {$match: {$text :{$search :searchTerm}}}
        ],undefined,[{$sort:{score :{$meta:"textScore"}}}])
      //  console.log(searchTerm)
        resolve(posts)
    }else{
        reject(new Error("Invalid search term. Expected a string."))
    }
 })
}

Post.countPostsByAuthor = function(id){
return new Promise(async(resolve,reject)=>{
    let postCount = await postsCollection.countDocuments({author : id})
    resolve(postCount)
})
}

Post.getFeed = async function(id){
    //membuat array id yang difollow oleh pengguna saat ini
    let followedUsers =await followsCollection.find({authorId : new ObjectID(id)}).toArray()
    followedUsers = followedUsers.map(function(followDoc){
        return followDoc.followedId
    })

    // melihat posts author dimana yang telah difollow
    return Post.reusablePostQuery([
        {$match: {author: {$in: followedUsers}}},
        {$sort: {createDate: -1}}
    ])
}

module.exports = Post