const request = require('supertest');
const app = require('../service');

let admin, testUser;
const { Role, DB } = require('../database/database.js');


async function createTestUser() {
  let user = { password: 'otherSecretPassword', roles: [{ role: Role.Diner }] }
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@tester.com';

  await DB.addUser(user);

  user.password = 'otherSecretPassword';
  return user;
}
async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

async function logout(token){
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
  return logoutRes.body.message;
}

async function login(user){
  const loginRes = await request(app).put('/api/auth').send({name: user.name, email: user.email, password: user.password});
  if (user.roles[0].role == Role.Admin){
    adminToken = loginRes.body.token;
  }
    return loginRes;
}

beforeAll(async () => {
    admin = await createAdminUser();
    testUser = await createTestUser();
});

test("get pizza menu", async () =>{
    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
    expect(menuRes.body[0]).toHaveProperty('id');
    expect(menuRes.body[0]).toHaveProperty('title');
    expect(menuRes.body[0]).toHaveProperty('image');
});

//bad test
test("add something to menu", async () =>{
  const loginRes = await login(admin);
  const menuItem = {"title":"Onion bagel", "description": "Onion powder. Onion shavings. Diced onion. On an onion bagel.", "image":"pizza9.png", "price": 0.0010 }
  const updateRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${loginRes.body.token}`).send(menuItem);
  expect(updateRes.status).toBe(200);
  expect(await logout(loginRes.body.token))
});

test("add something to menu not authorized", async () =>{
  const loginRes = await login(testUser);
  const menuItem = {"title":"Gross bagel", "description": "Onion powder. Garlic Powder. Talcum Powder. On an onion bagel.", "image":"pizza9.png", "price": 0.0050 }
  const updateRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${loginRes.body.token}`).send(menuItem);
  expect(updateRes.status).toBe(403);
  expect(updateRes.body.message).toBe("unable to add menu item");
  expect(await logout(loginRes.body.token))
});

//bad test
test("get list of orders", async () =>{
  const loginRes = await login(admin);
  const listRes = await request(app).get('/api/order').set('Authorization', `Bearer ${loginRes.body.token}`);
  expect(listRes.status).toBe(200);
  expect(await logout(loginRes.body.token))
});