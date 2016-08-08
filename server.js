var mongo=require("mongodb").MongoClient;
var mongourl= process.env.MONGODB_URI || 'mongodb://localhost:27017/url-shorten';
var db={};
var express=require("express");
var app=express();
app.set('json spaces', 10);
var base=require("./base62");
//const url=require("url");
var validUrl = require('valid-url');
//
mongo.connect(mongourl,function(err,database){
    if(err) throw err;
    db=database;
});
function increaseId(name,callback){
    db.collection('counter').findOneAndUpdate(
        
        {_id:name},
        {$inc:{seq:1}},
        {upsert:true,returnNewDocument:true},//assign a new document( {_id:count,seq:1} ) if not exist
        
        
        function(err,result){
            if(err) throw err;
            console.log("increaseId update to: "+JSON.stringify(result.value));
            callback(result.value.seq);
        }
        
    );
    //return ret.seq;
}
//access shorten url
app.get('/:adrs',function(req,res){  
    if(!/^[A-Za-z0-9]+$/.test(req.params.adrs)) {
            res.json({err:'invalid shorten url'});
            res.end();
    }
    else{
        //search for id(which can encode to short url, so short url can be decoded to id)
        db.collection('shorten-url').find(
            {_id:base.decode(req.params.adrs)}
            ).toArray(
            function(err,docs){
                if(err) throw err;
                console.log(docs);
                if(docs.length>0) {
                    res.redirect(docs[0].originUrl);
                    res.end();
                    console.log("redirect to origin url");
                }
                else{
                    res.json({err:'valid but not exist shorten url'});
                    res.end();
                }
            }
        );
    }
});
//add long url
app.get('/add/*',function(req,res){
    var parsedUrl=req.originalUrl.substring(5); //remove the first five characters /add/
    console.log("get the url after parse:"+parsedUrl);
    if(validUrl.isUri(parsedUrl)) { //req.params[0]
        //search for original url
        db.collection('shorten-url').find(
            {originUrl:parsedUrl}
        ).toArray(
            function (err,docs) {
                if(err) throw err;
                if(docs.length>0){
                    res.json(docs[0]);
                    res.end();
                    console.log("origin url already existed, return document from db");
                }
                else{
                
                    increaseId('count',function(id){
                        db.collection('shorten-url').insert(
                            {_id:id , originUrl:parsedUrl , shortenUrl:req.protocol + '://' +req.get('host')+'/'+base.encode(id)},
                            function(err,data){
                                if(err) throw err;
                                res.json(data.ops[0]);
                                res.end();
                                console.log("insert new url to db seccess");
                                //db.close();
                            }
                        );
                    });
                    
                    
                }
            }  
        );
    }
    else{
        console.log("invalid url");
        res.json({err: "invalid url"} );
        res.end();
    }
    
});

app.get("/",function(req,res){
    console.log("someone connect to host-url");
    res.send("<h1>URL SHORTEN SERVICE!</h1><p>Usage:</p><p>Add Shoten Url:  "+req.protocol + '://' +req.get('host')+"/add/https://Your-Long-Url</p><p>Then access the shorten url given by the json</p>");
    res.end();
});
app.listen(process.env.PORT ||8080,function(){
    console.log("listen to port : process.env.PORT ||8080");
});