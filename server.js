const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const path = require('path');
const { name } = require('ejs');
const {ObjectId,MongoClient , ServerApiVersion}= require('mongodb')
const formidable 			= require('express-formidable')//formidable can handle the file in the request data, it is an advanced version of body-parser
const fsPromises 			= require('fs').promises;

//app.use(formidable()); //conflict with login InternelServerError
//db connect
const url = 'mongodb+srv://harry:Ab12345678@cluster0.ca3j8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(url, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


//user define -local
const users = new Array(
	{name: 'cs01', password: '123', type:'customerService', username :'Tommy'},
	{name: 'cs02', password: '123', type:'customerService', username :'Harry'},
	{name: 'cs03', password: '123', type:'customerService', username :'Vincent'},
	{name: 'cs04', password: '123', type:'customerService', username :'Dainel'}, 
	{name: 'cs05', password: '123', type:'customerService', username :'Jimmy'}    
);

const tesKey ="test";
const dbName = "S381F";
app.set('view engine','ejs');

app.use(express.static("public"));  // folder for static contents
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieSession({
	name: 'session',
	keys: [tesKey]
  }));
//find all function
async function finddb(collectionName){
    await client.connect();
    const db = await client.db(dbName);
    const result = db.collection(collectionName).find({}).toArray();
    return result;
}

//蛤
const findDocument = async (db, criteria) => {
    var collection = db.collection("shops");
    let results = await collection.find(criteria).toArray();
	console.log("find the documents:" + JSON.stringify(results));
    return results;
}

//find specify item/type search
async function finddb_para(collectionName,type,parameter){
    await client.connect();
    const db = await client.db(dbName);
    if (type == "_id"){
        const results = db.collection(collectionName).find(parameter).toArray();
        console.log("find the documents:" + JSON.stringify(results));
        return results ;
    }
	const command_str = {};
	command_str[type.toString()] = parameter;
	console.log(command_str);
    const results = db.collection(collectionName).find(command_str).toArray();
    //console.log(result);
    console.log("find the documents:" + JSON.stringify(results));
    return results;
}
//add data to db
async function addDB(collectionName,uploadItem){
    await client.connect();
    const db = await client.db(dbName);
    const results = db.collection(collectionName).insertOne(uploadItem);
    console.log("added one document:" + JSON.stringify(results));
    return results;
}
//update db data
async function updateDB (command_str,collectionName,obj) {
		await client.connect();
        const db = await client.db(dbName);
        let results = await db.collection(collectionName).updateOne(command_str,{$set: obj});
        console.log("update one document:" + JSON.stringify(results));
        return results;
}
//delete db data
async function deleteDB (collectionName,type,command_str) {
    await client.connect();
    console.log("Connected successfully to server");
    const db =  await client.db(dbName);
    const collection = db.collection(collectionName);
    if(type == "_id"){
        const DOCID = { '_id': ObjectId.createFromHexString(id) };
        const results= await collection.deleteOne(DOCID);
        console.log("delete one document: " + JSON.stringify(results));
        return results;
    }else{
        const results= await collection.deleteOne(command_str);
        return results;
    }
    
};

//function define
const loginCheck = (req,res,next) => {
    if(req.session.authenticated){
        return next();
    }
    res.redirect('/login');
}

function typeCheck(res,req){
	//console.log(req.session)
    if(req.session.usertype == "customerService") {
		res.redirect('/customerServices');
	}else{
        res.render('login',{error: true});
    }
}


app.get('/', (req,res) => {
   // assume the user are not log in
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.status(200).render('login',{error: null});
   });


app.post('/login', (req,res) => {
	for(let i = 0; i<users.length ;i++){
		if (users[i].name == req.body.name && users[i].password == req.body.password) {
			// correct user name + password
			// store the following name/value pairs in cookie session
			req.session.authenticated = true;        // 'authenticated': true
			req.session.username = users[i].username;	 // 'username': req.body.name		
            req.session.usertype = users[i].type;
        }
	};
	typeCheck(res,req); 
});

app.get('/customerServices',loginCheck,async (req, res) => {
	const result = await finddb('newsTitleData');
    res.status(200).render('NewsPage',{name:req.session.username,news_obj_array:result});
   });

//shop page - redirect
app.get('/shop',loginCheck,async (req, res) => {
    const result = await finddb('shops');
    res.status(200).render('Shop', {name:req.session.username,shop_obj_array:result});
});
//shop page - post
app.post('/shop',async (req,res) => {
	const type = "shop_no";
	const result = await finddb_para('shops',type,req.body.search_input);
    //console.log(result);
    res.status(200).render('Shop', {name:req.session.username,shop_obj_array:result});
});
//report lost page - redirect
app.get('/shopUpload',loginCheck,(req,res) => {
    res.status(200).render('ShopUpload', {name:req.session.username});
});
//report lost page - post 
app.post('/shopUpload',async (req,res) => {
	const shop_obj = {"shop_no" : req.body.shop_no, "name" : req.body.name, "type": req.body.type, "address": req.body.address,
                    "open_time":req.body.open_time, "close_time": req.body.close_time,"status": req.body.status,"phone": req.body.phone};
	await addDB('shops',shop_obj);
    const message = "Item upload is finished!";
	res.status(200).render('message_showing', {name:req.session.username,message:message});
});
//claim page - redirect
app.get('/claim',loginCheck,async (req, res) => {
	const result = await finddb('claimData');
    res.status(200).render('Claim', {name:req.session.username,claim_obj_array:result});
});
//claim page - post
app.post('/claim',async (req,res) => {
	const type = "item";
	const result = await finddb_para('claimData',type,req.body.search_input);
    res.status(200).render('Claim', {name:req.session.username,claim_obj_array:result});
});

//report lost page - redirect
app.get('/reportLost',loginCheck,(req,res) => {
    res.status(200).render('Reportlost', {name:req.session.username});
});

//report lost page - post 
app.post('/reportLost',async (req,res) => {
	const lost_item_obj = {"customer_name" : req.body.customer_name, "contact_info" : req.body.contact_info, "item": req.body.item, 
                         "lost_time": req.body.lost_time,"lost_place":req.body.lost_place, "item_details": req.body.item_details};
    const result = await addDB('lostItemData',lost_item_obj);
    const message = "Item upload is finished!";
	res.status(200).render('message_showing', {name:req.session.username,message:message});
});

//lostlist page - redirect
app.get('/lostlist',loginCheck,async (req, res) => {
    const result = await finddb('lostItemData');
    res.status(200).render('LostList', {name:req.session.username,lost_obj_array:result});
});

//lostlist page - post
app.post('/lostlist',async (req,res) => {
	const type = "item";
	const result = await finddb_para('lostItemData',type,req.body.search_input);
    res.status(200).render('LostList', {name:req.session.username,lost_obj_array:result});
});

// update
app.get('/updateForm', async (req, res) => {
    const DOCID = { '_id': ObjectId.createFromHexString(req.query._id) };
    const id_obj = await finddb_para('lostItemData','_id',DOCID);
    //console.log(id_obj);
    res.status(200).render('Update', {name:req.session.username,obj:id_obj,id:DOCID});
});

app.post('/updateForm', async (req, res) => {
    const id_obj = {"customer_name" : req.body.customer_name, "contact_info" : req.body.contact_info, "item": req.body.item, 
        "lost_time": req.body.lost_time,"lost_place":req.body.lost_place, "item_details": req.body.item_details};
    const DOCID = { '_id': ObjectId.createFromHexString(req.body._id) };
    const result = await updateDB(DOCID,'lostItemData',id_obj);
    const message = "Item update is finished!";
    res.status(200).render('message_showing', {name:req.session.username,message:message});
});

//app.get("/updateConfirm",loginCheck,(req,res) =>{
//    const message = "Do you want to update this data?" ;
//    const action = "update";
//    res.status(200).render("message_confirm",{name:req.session.username,message:message, action:action, id:req.query._id})
//});

//delete 
app.get("/deleteConfirm",loginCheck,(req,res) =>{
    const message = "Do you want to delete this data?" ;
    const action = "delete";
    res.status(200).render("message_confirm",{name:req.session.username,message:message, action:action, id:req.query._id, db:req.query.db})
});
app.get("/delete", async (req, res) => {
    const result = await deleteDB(req.query.db,"_id",req.query._id);
    const message = "Item delete is finished!";
    res.status(200).render('message_showing', {name:req.session.username,message:message});
});
//log out 
app.get('/logout', (req,res)=>{
	if(req.session.authenticated){
        req.session = null;
		res.redirect('/login');
    }else{
    res.redirect('/login');}	
});

//call check page , if login, redirect to the logon page
app.get('/check',loginCheck,(req, res) => {
    res.redirect('/customerServices');
});

// all other page - redirect to login



//shop API 
//create API for shop
//curl -X POST -F "shop_no=321" -F "name=Trinkey Trove" -F "type=shop" -F "address=119" -F "open_time=08:00" -F "close_time=23:00" -F "status=closed" -F "phone=44444444" localhost:3000/api/shops/321
app.post('/api/shops/:shop_no', async (req,res) => {
    if (req.params.shop_no) {
        console.log(req.body);
        await client.connect();
        console.log("Connected successfully to server");
        const collectionName = "shops";
        const newObj = {
    
            shop_no     : req.fields.shop_no,
            name        : req.fields.name,
            type        : req.fields.type,
            address     : req.fields.address,
            open_time   : req.fields.open_time,
            close_time  : req.fields.close_time,
            status      : req.fields.status,
            phone       : req.fields.phone
        };
        await addDB(collectionName, newObj);
        res.status(200).json({"Successfully inserted":newObj}).end();
    } else {
        res.status(500).json({"error": "missing Shop No"});
    }
});
//read api for shop 
//curl -X GET http://localhost:3000/api/shops/321
/*
app.get('/api/shops/:shop_no', async (req,res) => {
    if (req.params.shop_no){
        console.log(req.body);
        const type = "shop_no";
        const collectionName = "shops"
        const command_str = {};
        command_str[type] = req.params.shop_no;
        await client.connect();
        console.log("Connect succesfully to server");
        //const detail = await finddb_para(collectionName,type,command_str);//蛤
        const db = client.db("shops");
        const detail = await findDocument(db, {"shop_no": req.fields.shop_no});
        res.status(200).json(detail).end();
            
    } else {
        res.status(500).json({"error": "missing shop_no"});
    }
});
*/

app.get('/api/shops/:shop_no', async (req,res) => {
    if (req.params.shop_no){
        console.log(req.body)
        let criteria = {};
        criteria['shop_no'] = req.params.shop_no;
        
            await client.connect();
            console.log("Connect succesfully to server");
            const db = client.db(dbName);
            const detail = await findDocument(db, criteria);
            res.status(200).json(detail);
            
    } else {
        res.status(500).json({"error": "missing shop_no"}).end();
    }
});

//update api for shop
//curl -X PUT -F "phone=99999999" localhost:3000/api/shops/321
app.put('/api/shops/:shop_no', async (req,res) => {
    if (req.params.shop_no) {
        console.log(req.body)
        const type = "shop_no";
        const collectionName = "shops"
        const command_str = {};
        command_str[type] = req.params.shop_no;
		await client.connect();
		console.log("Connected successfully to server");
		let updateObj = {
            shop_no     : req.fields.shop_no || req.params.shop_no,
            name        : req.fields.name,
            type        : req.fields.type,
            address     : req.fields.address,
            open_time   : req.fields.open_time,
            close_time  : req.fields.close_time,
            status      : req.fields.status,
            phone       : req.fields.phone
		};
		const results = await updateDB(command_str, collectionName, updateObj);
		res.status(200).json(results).end();
    } else {
        res.status(500).json({"error": "missing shop_no"});
    }
})

//delete api for shop
//curl -X DELETE localhost:3000/api/shops/321
app.delete('/api/shops/:shop_no', async (req,res) => {
    if (req.params.shop_no) {
		console.log(req.body)
        const type = "shop_no";
        const collectionName = "shops"
        const command_str = {};
        command_str[type] = req.params.shop_no;
		await client.connect();
		console.log("Connected successfully to server");
		const results = await deleteDB(collectionName,type,command_str);
        console.log(results)
		res.status(200).json(results).end();
    } else {
        res.status(500).json({"error": "missing shop_no"});       
    }
})
//End of shop API


//claim API
//create API for claim
/*curl -X POST -F "claimId=321" -F "item=Phone" -F "color=White" -F "date=10/05/2024" -F "pickUpPlace=G21" -F "status=Claimed" 
 -F "picture="https://github.com/tommywkc/photo/blob/main/phone1.jpg?raw=true"" localhost:3000/api/claim/321  */
app.post('/api/claim/:claimId', async (req,res) => {
    if (req.params.claimId) {
        console.log(req.body)
        await client.connect();
        console.log("Connected successfully to server");
        const collectionName = "claimData"
        const newObj = {
    
            claimId     : req.fields.claimId,
            item        : req.fields.item,
            color       : req.fields.color,
            address     : req.fields.address,
            date        : req.fields.date,
            pickUpPlace : req.fields.pickUpPlace,
            status      : req.fields.status,
            picture     : req.fields.picture
        };
        await addDB(collectionName, newobj);
        res.status(200).json({"Successfully inserted":newObj}).end();
    } else {
        res.status(500).json({"error": "missing Shop No"});
    }
});
//read api for claim
//curl -X GET http://localhost:3000/api/claim/321
app.get('/api/claim/:claimId', async (req,res) => {
    if (req.params.claimId){
        console.log(req.body)
        const type = "claimId";
        const collectionName = "claimData"
        const command_str = {};
        command_str[type] = req.params.claimId;
        await client.connect();
        console.log("Connect succesfully to server");
        const detail = await finddb_para(collectionName,type,command_str);
        res.status(200).json(detail).end();
            
    } else {
        res.status(500).json({"error": "missing shop_no"});
    }
});

//update api for claim
//curl -X PUT -F "phone=99999999" localhost:3000/api/claim/321
app.put('/api/claim/:claimId', async (req,res) => {
    if (req.params.claimId) {
        console.log(req.body)
        const type = "claimId";
        const collectionName = "claimData"
        const command_str = {};
        command_str[type] = req.params.claimId;
		await client.connect();
		console.log("Connected successfully to server");
		let updateObj = {
            claimId     : req.fields.claimId || req.params.claimId,
            item        : req.fields.item,
            color       : req.fields.color,
            address     : req.fields.address,
            date        : req.fields.date,
            pickUpPlace : req.fields.pickUpPlace,
            status      : req.fields.status,
            picture     : req.fields.picture
		};
		const results = await updateDB(command_str, collectionName, updateObj);
		res.status(200).json(results).end();
    } else {
        res.status(500).json({"error": "missing shop_no"});
    }
})

//delete api for claim
//curl -X DELETE localhost:3000/api/claim/321
app.delete('/api/claim/:claimId', async (req,res) => {
    if (req.params.shop_no) {
		console.log(req.body)
        const type = "claimId";
        const collectionName = "claimData"
        const command_str = {};
        command_str[type] = req.params.claimId;
		await client.connect();
		console.log("Connected successfully to server");
		const results = await deleteDB(collectionName,type,command_str);
        console.log(results)
		res.status(200).json(results).end();
    } else {
        res.status(500).json({"error": "missing shop_no"});       
    }
})


app.get('/*',(req,res) =>{
	res.redirect('/login');
})

//End of claim API

app.use(formidable());
const server = app.listen(process.env.PORT || 3000, () => { 
    const port = server.address().port;
    console.log(`localhost:${port}`); 
});