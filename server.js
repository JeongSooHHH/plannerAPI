const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended : true}));

const MongoClient = require('mongodb').MongoClient;

app.set('view engine', 'ejs');

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

const http = require('http').createServer(app);
const {Server} = require('socket.io');
const io = new Server(http);

require('dotenv').config();

app.use('/public', express.static('public'));

var db;
MongoClient.connect(process.env.DB_URL, function(error, client){
    if(error) return console.log(error)     
        db = client.db('todoapp');
        http.listen(process.env.PORT, function(){ 
        console.log('listening on 8080')
    });
})


app.get('/write', function(req, res){
    res.render('write.ejs', { error : ''});
});

app.get('/', function(req, res){
    res.render('index.ejs');

});


/** 실제 db에 저장된 데이터들로 예쁘게 꾸며진 HTML보여줌 */
app.get('/list', function(req, res){
    //db에 저장된 post라는 collection의 모든 데이터를 꺼내기
    db.collection('post').find().toArray(function(error, result){
        console.log(result);
        //list.ejs  안에 result를 출력
        res.render('list.ejs', { posts : result });
    });
});

app.get('/search', (req, res) => {
    console.log(req.query); // url 쿼리에 담은 값
    var 검색조건 = [
        {
            $search: {
                index: 'search',
                text: {
                    query: req.query.value,
                    path: '제목' 
                }
            }
        },
    ];
    db.collection('post').aggregate(검색조건).toArray((error, result) => { 
        console.log(result);
        res.render('search.ejs', { posts : result });
    })
    
})

app.get('/detail/:id', function(req, res){ 
    req.params.id = parseInt(req.params.id);
    db.collection('post').findOne({_id : req.params.id}, function(error, result){ 
        console.log(result);
        res.render('detail.ejs', { data: result });
    })
    
})

app.get('/edit/:id', function(req, res){
    req.params.id = parseInt(req.params.id);
    db.collection('post').findOne({_id : req.params.id}, function(error, result){ 
        console.log(result);
        res.render('edit.ejs', { data: result});
    
})
})
  
app.put('/edit', function(req, res){
    console.log(req.body.id);
    db.collection('post').updateOne({_id : parseInt(req.body.id)}, { $set : {제목 : req.body.title, 날짜 : req.body.date}}, function(){
        console.log('수정완료');
        res.redirect('/list');
    });
});

app.get('/login', function(req, res){
    res.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/fail'
}), function(req, res){
    res.redirect('/');
});

app.get('/fail', function(req, res){
    res.render('fail.ejs');
});

app.get('/mypage', loginRequired, function(req, res){
    console.log(req.user.id);
    res.render('mypage.ejs', {사용자 : req.user});
});

function loginRequired(req, res, next){
    if(req.user){ 
        console.log(req.user);
        next();
    } else {
        res.send('로그인이 필요합니다.'); 
    }
}


passport.use(new LocalStrategy({
    usernameField: 'id', 
    passwordField: 'pw', 
    session: true, 
    passReqToCallback: false, 
}, function(입력한아이디, 입력한비번, done){
    console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디}, function(error, result){
        
        if(error) return done(error)
        if(!result) return done(null, false, {messafe: '존재하지 않는 아이디요'}) 
        if(입력한비번 == result.pw){ 
            return done(null, result) 
        } else {
            return done(null, false, {message: '비번틀렸어요'})
        }
    })
})); 


passport.serializeUser(function(user, done){ 
    done(null, user.id) 
});

passport.deserializeUser(function(아이디, done){ // 아이디는 user.id
    db.collection('login').findOne({id: 아이디}, function(error, result){// 디비에서 위에있는 user.id로 유저를 찾은 뒤에 유저 정보를 넣음
        done(null, result)
    })
});


app.post('/register', function(req, res){
    db.collection('login').insertOne({ id : req.body.id, pw : req.body.pw}, function(error, result){
        res.redirect('/');
    })
})


 app.post('/add',function(req, res){
    if(req.user){

    if(req.body.title){
        if(req.body.date){
            db.collection('counter').findOne({name : '게시물개수'}, function(error, result){
                console.log(result);
                var 총게시물개수 = result.totalPost;
                var 저장할거 = {_id : 총게시물개수 + 1, 제목 : req.body.title, 날짜 : req.body.date, 작성자 : req.user.id}

                db.collection('post').insertOne(저장할거, function(error, result){ 
                    console.log('저장완료');

                    db.collection('counter').updateOne({name : '게시물개수'}, {$inc : {totalPost : 1}}, function(error, result){})
                        if(error){return console.log(error)}
                });
                res.render('write.ejs', { error : '오늘의 할 일이 작성되었습니다!'});
            }); 
        } else {
            res.render('write.ejs', { error : '날짜를 입력해 주세요'});
        }
    } else {
        res.render('write.ejs', { error : '할 일과 날짜를 입력해 주세요'});
    }
}else{
    res.render('login.ejs');
}   
});

app.delete('/delete', function(req, res){
    console.log(req.body);

    req.body._id = parseInt(req.body._id);
    console.log(req.body);

    var 삭제할데이터 = { _id : req.body._id, 작성자 : req.user.id}
    db.collection('post').deleteOne(삭제할데이터, function(error, result){
        console.log('삭제완료');
        if(error) console.log(error)
        res.status(200).send({message : '성공했습니다'});
    });
});

app.use('/shop', require('./routes/shop.js'));
app.use('/board/sub', require('./routes/board.js'));

let multer = require('multer');
const { render } = require('ejs');
var storage = multer.diskStorage({ // 어디에 저장? 하드, 램
    destination : function(req, file, cb){// 이미지를 어떤 경로에 저장할지
        cb(null, './public/image')
    },
    filename: function(req, file, cb){// 파일명 설정
        cb(null, file.originalname) // 오리지널 이름
    }
});
var upload = multer({
    storage : storage,
    fileFilter: function(req, file, callback){// 확장자 거르기 
        var ext = path.extname(file.originalname);// path는 node.js 기본 내장 라이브러리 변수, 파일의 경로, 이름, 확장자 등 알아낼 때
        if(ext != '.jpg' && ext != '.png' && ext != '.jpeg'){
            return callback(new Error('PNG, JPG만 업로드 하세요'))
        }
        callback(null, true)
    }, 
    limits: {// 파일 사이즈 제한
        fileSize: 1024 * 1024 // 1MB
    }
});//미들웨어처럼 불러 쓸 수 있음 

app.get('/upload', function(req, res){
    res.render('upload.ejs');
})

app.post('/upload', upload.single('profile'), function(req, res){
    res.send('업로드완료');
});

app.get('/image/:imageName', function(req3, res){
    res.sendFile(__dirname + '/public/image' + req.params.imageName);
})


app.post('/chatroom', loginRequired, function(req, res){
    console.log(req.body);
    var 만들데이터 = {
        member : [req.body.작성자, req.user.id],
        date : new Date(),
        title : req.body.작성자 + ' 님 안녕하세요! ' + req.user.id + ' 입니다.'
    };
    db.collection('chatroom').insertOne(만들데이터).then((result)=>{ //콜백함수 대신.then도 사용 가능
        
    })
    
})

app.get('/chat', loginRequired, function(req, res){
    db.collection('chatroom').find({member : req.user.id}).toArray().then((result)=>{
        res.render('chat.ejs', {data : result});
    })
})

app.post('/message', loginRequired, function(req, res){
    
    var 저장할거 = {
        parent : req.body.parent,
        content : req.body.content,
        userid : req.user.id,
        date : new Date()
    }
    db.collection('message').insertOne(저장할거).then(()=>{
        console.log('DB저장성공');
        res.send('DB저장성공');

    })
})

app.get('/message/:id', loginRequired, function(req, res){

    res.writeHead(200, {
        "Connection": "Keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
    });

    db.collection('message').find({parent : req.params.id}).toArray()
    .then((result)=>{
        //req 한 번에 res 여러번 받을 수 있음
        res.write('event: test\n');
        res.write('data: ' + JSON.stringify(result) + '\n\n'); //JSON은 문자 취급 받음, 따옴표 붙이기
    })
    
    const pipeline = [
        { $match: {'fullDocument.parent' : req.params.id}} //컬렉션 안의 원하는 document만 감시하고 싶으면
    ];
    const collection = db.collection('message');
    const changeStream = collection.watch(pipeline); //실시간 감시해줌
    changeStream.on('change', (result)=>{//해당 컬렉션애 변동 생기면 해당 함수 실행
        console.log(result.fullDocument);
        res.write('event: test\n');
        res.write('data: ' + JSON.stringify([result.fullDocument]) + '\n\n');//[]는 규격 통일
    });

});

/** socket 채팅방 접속 */
app.get('/socket', function(req, res){
    res.render('socket.ejs');
})

/** WebSocket 양방향 실시간 소통 */
io.on('connection', function(socket){
    console.log('유저접속됨');
    //채팅방 만들기
    socket.on('joinroom', function(data){
        socket.join('room1')
    })

    //채팅방 안의 유저들에게만 전송, room1-send로 메세지 보내면 room1에만 broadcast 전송
    socket.on('room1-send', function(data){
        io.to('room1').emit('broadcast', data)
    })
    
    //socket.emit한 메세지를 서버가 수신
    socket.on('user-send', function(data){
        console.log('유저 : ' +  data);
        //서버 > 유저 메세지 전송 (모든 유저에게)
        io.emit('broadcast', data)
        //서버 > 유저 1명간 소통
        io.to(socket.id).emit('broadcast', data)
    })
})


exports.module = { MongoClient}