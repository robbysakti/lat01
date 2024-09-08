const Post = require('../models/Post')


exports.viewCreateScreen = function(req,res){
    res.render('create-post')
}


exports.create = function(req,res){
const post = new Post(req.body, req.session.user._id)
post.create().then(function(newId){
req.flash("success", "selamat post berhasil dibuat")
req.session.save(()=> res.redirect(`/post/${newId}`))
}).catch(function(errors){
errors.forEach(error =>flash("errors",error))
req.session.save(()=> res.redirect("/create-post"))
})
}

exports.viewSingle = async function(req,res){
try{
    
 let post = await Post.findSingleById(req.params.id,req.visitorId)
 res.render('single-post-screen', {post : post, title : post.title})
}catch{
res.render('404')
}
}

exports.viewEditScreen = async function(req,res){
try{
    let post = await Post.findSingleById(req.params.id)
    if(post.authorId == req.visitorId){
        res.render('edit-post', {post : post})
    }else{
        req.flash("errors","kamu tidak memiliki hak untuk edit")
        req.session.save(()=>{res.redirect("/")})
    }
}catch{
    res.render('404')
}
}

exports.edit = function(req,res){
    let post = new Post(req.body,req.visitorId,req.params.id)
    post.update().then((status)=>{
        //data telah berhasil di update di database 
        // atau user memiliki hak untuk edit, namun data tidak valid
        if(status == "success"){
            //akan di update ke database 
            req.flash("success"," data berhasil diupdate. ")
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }else{
            post.errors.forEach(function(error){
                req.flash("error",error)
                })
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(() =>{
        // post harus permintaan menggunakan id
        //atau tolak jika bukan pemilik dari post
        req.flash("errors","kamu tidak memiiki hak akses")
        req.session.save(function(){
            res.redirect('/')
        })
    })
}

exports.delete = function(req,res){
Post.delete(req.params.id,req.visitorId).then(()=>{
req.flash('success'," data telah dihapus")
req.session.save(()=>res.redirect(`/profile/${req.session.user.username}`))

}).catch(()=>{
    req.flash('errors'," tidak memiliki hak akses")
    req.session.save(()=>res.redirect('/'))
    
})
}

exports.search = function(req,res){
 Post.search(req.body.searchTerm).then(posts=>{   //disini menjadi array kosong "posts"
   //console.log(posts)
 res.json(posts)
 }).catch(()=>{
 res.json([])
 })
}