const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

const db = new Map();
const USER_COOKIE_KEY = 'USER';

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    const user = req.cookies[USER_COOKIE_KEY];//쿠키 value(JSON)
    
    //쿠키가 존재하는 경우 : 서버 접속한적 있음음
    if (user) {
        const userData = JSON.parse(user);//쿠키 value(object)
        if (db.get(userData.ID)) {
            res.status(200).send(`
                <a href="/logout">Log Out</a>
                <h1>id: ${userData.ID}, name: ${userData.name}, password: ${userData.password}</h1>
            `);
            return;
        }
    }

    // 쿠키가 존재하지 않는 경우 : 로그인 필요
    res.status(200).send(`
        <h1>로그인이 필요합니다</h1>
        <a href="/login.html">Log In</a>
        <a href="/signup.html">Sign Up</a>
    `);
});


app.post('/signup', (req, res) => {
    const { name, ID, password } = req.body;
    const exists = db.get(ID);

    // 이미 존재하는 ID면 회원 가입 실패
    if (exists) {
        res.write("<script>alert('duplicated ID')</script>");
        res.write("<script>window.location=\"/signup.html\"</script>");
        return;
    }

    // 새로운 ID면 db에 저장
    const newUser = {
        name,
        ID,
        password,
    };
    db.set(ID, newUser);//key, value

    res.cookie(USER_COOKIE_KEY, JSON.stringify(newUser));
    res.redirect('/');
});


app.post('/login', (req, res) => {
    const { ID, password } = req.body;
    const user = db.get(ID);//db에 저장된 namd, ID, password 데이터(object)

    //존재하지 않는 ID인 경우
    if (!user) {
        res.write("<script charset='UTF-8'>alert('unexsisted ID')</script>");
        res.write("<script>window.location=\"/login.html\"</script>");
        return;
    }
    // 비밀번호가 틀렸을 경우
    if (password !== user.password) {
        res.write("<script charset='UTF-8'>alert('wrong password')</script>");
        res.write("<script>window.location=\"/login.html\"</script>");
        return;
    }

    res.cookie(USER_COOKIE_KEY, JSON.stringify(user));
    res.redirect('/');
});




app.listen(7394, () => {
    console.log('server is running at 7394');
});