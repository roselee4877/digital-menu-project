const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const { config } = require('process');

const app = express();

const USER_COOKIE_KEY = 'USER';
const USERS_JSON_FILENAME = path.join(__dirname, 'db', 'users.json');
const MENUS_FILENAME = path.join(__dirname, 'db', 'menu.json');
const saltRounds = 10;


app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    const reqCookie = req.cookies[USER_COOKIE_KEY];//쿠키 value(JSON)

    //쿠키가 존재하는 경우 : 서버 접속한적 있음
    if (reqCookie) {
        const reqCookie_obj = JSON.parse(reqCookie);//쿠키 value(object)
        const userData = await fetchUser(reqCookie_obj.ID);//db에 있는 object
        if (userData) {//메인 화면면
            res.status(200).send(`
                <a href="/logout">Log Out</a>
                <a href="/withdraw.html">Withdraw</a>
                <h1>id: ${userData.ID}, name: ${userData.name}, password: ${userData.password}</h1>
            `);
            return;
        }
    }

    // 쿠키가 존재하지 않는 경우 : 로그인 필요
    res.redirect('/login.html');
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
    const match = await bcrypt.compare(password, userData.password);
    if (!match) {
        res.write("<script charset='UTF-8'>alert('wrong password')</script>");
        res.write("<script>window.location=\"/login.html\"</script>");
        return;
    }

    res.cookie(USER_COOKIE_KEY, JSON.stringify(userData));
    res.redirect('/');
});

app.post('/withdraw', async (req, res) => {
    const {password} = req.body;
    const userCookie = req.cookies[USER_COOKIE_KEY];
    const userCookie_obj = JSON.parse(userCookie);

    // 비밀번호가 틀렸을 경우
    const match = await bcrypt.compare(password, userCookie_obj.password);
    if (!match) {
        res.write("<script charset='UTF-8'>alert('wrong password')</script>");
        res.write("<script>window.location=\"/withdraw.html\"</script>");
        return;
    }

    await removeUser(userCookie_obj.ID, userCookie_obj.password);
    res.clearCookie(USER_COOKIE_KEY);
    res.redirect('/');
});


app.get('/logout', (req, res) => {
    res.clearCookie(USER_COOKIE_KEY);
    res.redirect('/');
});

app.get('/edit', (req, res) => {
    
});

app.post('/edit', async (req, res) => {
    const { itemName, price } = req.body;
    
    const newMenu = {
        itemName,
        price
    };
    await createMenu(newMenu);

    res.redirect('/edit');
});



app.listen(7394, () => {
    console.log('server is running at 7394');
});






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
    const hashedPassword = await bcrypt.hash(newUser.password, saltRounds);
    const users = await fetchAllUsers();
    users.push({
        ...newUser,
        password: hashedPassword,
    });
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
}


async function removeUser(ID, password) {
    const userData = await fetchUser(ID);
    if (userData.password === password) {
        const users = await fetchAllUsers();
        const index = users.findIndex((u) => u.ID === ID);
        users.splice(index, 1);
        await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
    }
}





async function fetchAllMenus() {
    const data = await fs.readFile(MENUS_FILENAME);
    const menus = JSON.parse(data.toString());
    return menus;
}

async function fetchMenu(itemCode) {
    const users = await fetchAllUsers();
    const user = users.find((user) => user.ID === userid);
    return user;
}

async function createMenu(newUser) {
    const hashedPassword = await bcrypt.hash(newUser.password, saltRounds);
    const users = await fetchAllUsers();
    users.push({
        ...newUser,
        password: hashedPassword,
    });
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
}


async function removeMenu(ID, password) {
    const userData = await fetchUser(ID);
    if (userData.password === password) {
        const users = await fetchAllUsers();
        const index = users.findIndex((u) => u.ID === ID);
        users.splice(index, 1);
        await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
    }
}