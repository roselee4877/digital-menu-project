const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;

const app = express();

const USER_COOKIE_KEY = 'USER';
const USERS_JSON_FILENAME = path.join(__dirname, 'users.json');


async function fetchAllUsers() {
    const data = await fs.readFile(USERS_JSON_FILENAME);
    const users = JSON.parse(data.toString());
    return users;
}

async function fetchUser(userid) {
    const users = await fetchAllUsers();
    const user = users.find((user) => user.ID === userid);
    return user;
}

async function createUser(newUser) {
    const users = await fetchAllUsers();
    users.push(newUser);
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
}





app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    const reqCookie = req.cookies[USER_COOKIE_KEY];//쿠키 value(JSON)
    console.log(__dirname);
    console.log(__filename);

    //쿠키가 존재하는 경우 : 서버 접속한적 있음음
    if (reqCookie) {
        const reqCookie_obj = JSON.parse(reqCookie);//쿠키 value(object)
        const userData = await fetchUser(reqCookie_obj.ID);//db에 있는 object
        if (userData) {
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


app.post('/signup', async (req, res) => {
    const { name, ID, password } = req.body;
    const userData = await fetchUser(ID);

    // 이미 존재하는 ID면 회원 가입 실패
    if (userData) {
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
    await createUser(newUser);

    res.cookie(USER_COOKIE_KEY, JSON.stringify(newUser));
    res.redirect('/');
});


app.post('/login', async (req, res) => {
    const { ID, password } = req.body;
    const userData = await fetchUser(ID);//db에 저장된 namd, ID, password 데이터(object)

    //존재하지 않는 ID인 경우
    if (!userData) {
        res.write("<script charset='UTF-8'>alert('unexsisted ID')</script>");
        res.write("<script>window.location=\"/login.html\"</script>");
        return;
    }
    // 비밀번호가 틀렸을 경우
    if (password !== userData.password) {
        res.write("<script charset='UTF-8'>alert('wrong password')</script>");
        res.write("<script>window.location=\"/login.html\"</script>");
        return;
    }

    res.cookie(USER_COOKIE_KEY, JSON.stringify(userData));
    res.redirect('/');
});


app.get('/logout', (req, res) => {
    res.clearCookie(USER_COOKIE_KEY);
    res.redirect('/');
});




app.listen(7394, () => {
    console.log('server is running at 7394');
});