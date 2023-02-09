
var router = require('express').Router();

function loginRequired(req, res, next){
    if(req.user){ 
        console.log(req.user);
        next(); 
    } else {
        res.send('로그인이 필요합니다.'); 
    }
}

router.use(loginRequired);

router.use('/shirts', loginRequired)

router.get('/shirts', function(req, res){
    res.send('셔츠 파는 페이지입니다.');
});

router.get('/pants', function(req, res){
    res.send('바지 파는 페이지입니다.');
});

module.exports = router;