const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');


const app = express();

const USER_COOKIE_KEY = 'USER';
const USERS_JSON_FILENAME = path.join(__dirname, 'db', 'users.json');
const MENUS_FILENAME = path.join(__dirname, 'db', 'menu.json');
const saltRounds = 10;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use((req,res,next) => {
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString();

    console.log(`${formattedTime} [${req.method}] : ${req.path}`);
    next();
});
app.use(async (req,res,next) => {
    const cookie = req.cookies[USER_COOKIE_KEY];
    //쿠키 있으면 전역변수로 지정
    if(cookie){
        res.locals.cookie = 1;
        res.locals.cookie_json = cookie;
        res.locals.cookie_obj = JSON.parse(cookie);

        res.locals.userId = res.locals.cookie_obj.userId;
        res.locals.userData = await fetchUser(res.locals.userId);
        res.locals.shopId = res.locals.userData.shopId;
    }
    next();
});


app.get('/', async (req, res) => {
    //쿠키 존재하지 않음 : 로그인으로
    if(!res.locals.cookie){
        return res.redirect('/login');
    }

    const userData = await fetchUser(res.locals.cookie_obj.userId);//db에 있는 obj
    //쿠키는 있는데 회원에 없음 : 로그인으로
    if (!userData) {
        return res.redirect('/login');
    }

    const items = await fetchItems(res.locals.shopId);
    res.render('menu', { items });
});

app.get('/signup', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.post('/signup', async (req, res) => {
    const { name, userId, password } = req.body;
    const userData = await fetchUser(userId);

    // 이미 존재하는 ID면 회원 가입 실패
    if (userData) {
        res.write("<script>alert('duplicated ID')</script>");
        res.write("<script>window.location=\"/signup\"</script>");
        return;
    }

    // 새로운 ID면 db에 저장
    const newUser = {
        name,
        userId,
        password,
    };
    await createUser(newUser);

    res.cookie(USER_COOKIE_KEY, JSON.stringify(newUser));
    res.redirect('/');
});




app.get('/login', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const { userId, password } = req.body;
    const userData = await fetchUser(userId);//db에 저장된 namd, ID, password 데이터(object)
    
    //존재하지 않는 ID인 경우
    if (!userData) {
        res.write("<script charset='UTF-8'>alert('unexsisted ID')</script>");
        res.write("<script>window.location=\"/login\"</script>");
        return;
    }
    // 비밀번호가 틀렸을 경우
    const match = await bcrypt.compare(password, userData.password);
    if (!match) {
        res.write("<script charset='UTF-8'>alert('wrong password')</script>");
        res.write("<script>window.location=\"/login\"</script>");
        return;
    }

    res.cookie(USER_COOKIE_KEY, JSON.stringify(userData));
    res.redirect('/');
});



app.get('/withdraw', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'withdraw.html'));
});

app.post('/withdraw', async (req, res) => {
    const {password} = req.body;
    const userCookie = req.cookies[USER_COOKIE_KEY];
    const userCookie_obj = JSON.parse(userCookie);
    const userData = await fetchUser(userCookie_obj.userId);

    // 비밀번호가 틀렸을 경우
    const match = await bcrypt.compare(password, userData.password);
    if (!match) {
        res.write("<script charset='UTF-8'>alert('wrong password')</script>");
        res.write("<script>window.location=\"/withdraw.html\"</script>");
        return;
    }

    await removeUser(userCookie_obj.userId, userCookie_obj.password);
    res.clearCookie(USER_COOKIE_KEY);
    res.redirect('/');
});


app.get('/logout', (req, res) => {
    res.clearCookie(USER_COOKIE_KEY);
    res.redirect('/');
});

app.get('/edit', async (req, res) => {

    
    const userData = await fetchUser(res.locals.cookie_obj.userId);
    const items = await fetchItems(userData.shopId);
    res.render('edit-menu', { items });
});

app.post('/edit', async (req, res) => {
    const { itemName, price } = req.body;
    
    const newItem = {
        itemName,
        price
    };
    await createItem(res.locals.shopId, newItem);
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

async function fetchUser(_userId) {
    const users = await fetchAllUsers();
    const user = users.find((u) => u.userId === _userId);
    return user;
}

async function createUser(newUser) {
    const hashedPassword = await bcrypt.hash(newUser.password, saltRounds);
    const _shopId = uuidv4();
    const users = await fetchAllUsers();
    users.push({
        ...newUser,
        password: hashedPassword,
        shopId : _shopId
    });
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
    await createShop(_shopId);
}

async function removeUser(_userId, _password) {
    const user = await fetchUser(_userId);
    await removeShop(user.shopId);

    const users = await fetchAllUsers();
    const index = users.findIndex((u) => u.userId === _userId);
    users.splice(index, 1);
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
}







async function fetchAllShops() {
    const data = await fs.readFile(MENUS_FILENAME);
    const allshops = JSON.parse(data.toString());
    return allshops;
}

async function fetchShop(_shopId) {
    const allshops = await fetchAllShops();
    const shop = allshops.find((menu) => menu.shopId === _shopId);
    return shop;
}

async function fetchItems(_shopId){
    const shop = await fetchShop(_shopId);
    const items = shop['items'];
    return items;
}

async function findShopIdx(_shopId) {
    const shopArr = await fetchAllShops();
    const shopIdx = shopArr.findIndex((shop) => shop.shopId === _shopId);
    return shopIdx;
}

async function findItemIdx(_shopId, _itemCode) {
    const shop = await fetchShop();
    const itemArr = shop.items;
    const itemIdx = itemArr.findIndex((i) => i.itemCode === _itemCode);
    return itemIdx;
}

async function createShop(_shopId){
    const shopArr = await fetchAllShops();
    shopArr.push({
        shopId : _shopId,
        items : []
    });
    await fs.writeFile(MENUS_FILENAME, JSON.stringify(shopArr));
}

async function removeShop(_shopId) {
    const shopArr = await fetchAllShops();
    const index = findShopIdx(_shopId);
    shopArr.splice(index, 1);
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(shopArr));

}

async function createItem(_shopId, newItem) {
    const shopArr = await fetchAllShops();
    const shopIdx = await findShopIdx(_shopId);
    if(shopIdx == -1) return;

    const cnt = shopArr[shopIdx]['items'].length + 1;
    shopArr[shopIdx].items.push({
        ...newItem,
        itemCode : cnt
    });
    await fs.writeFile(MENUS_FILENAME, JSON.stringify(shopArr));
}

async function removeItem(shopId, itemCode) {
    const shopArr = await fetchAllShops(shopId);
    const shopIdx = await findShopIdx(shopId);
    const itemIdx = await findItemIdx(shopId, itemCode);

    shopArr[shopIdx].items.splice(itemIdx, 1);
    await fs.writeFile(MENUS_FILENAME, JSON.stringify(shopArr));
}