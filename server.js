const express = require('express')
const app = express()
const bodyParser= require('body-parser')
const MongoClient = require('mongodb').MongoClient;



var db;

MongoClient.connect('mongodb+srv://space2577:ghkdwjdtn@csm.jifgqtn.mongodb.net/test', { useUnifiedTopology: true }, function (error, client) {
	if (error) return console.log(error)
	db = client.db('todoapp');

  //   db.collection('post').insertOne({이름 : 'Johdn', 나이 : 00},
  //     function(error, result){
	//     console.log('저장완료'); 
	// });


});

app.use(bodyParser.urlencoded({extended: true}))

app.listen(8080, function () {
  console.log('listening on 8080')
});

app.get('/', function(req, res) { 
    res.sendFile(__dirname +'/index.html')
})

app.get('/write', function(req, res) { 
    res.sendFile(__dirname +'/write.html')
});

app.post('/add', function(req, res){
  res.send("전송완료, db 저장 시작")

    db.collection('post').insertOne({제목: req.body.title, 날짜:req.body.date}, function(error, result){
        console.log('저장완료')
  })
})














app.post('/add', function(req, res){
  res.send('전송완료');
  db.collection('post').insertOne( { 제목 : 요청.body.title, 날짜 : 요청.body.date } , function(){
    console.log('저장완료')
  });
}); 