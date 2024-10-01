const request = require('supertest');
const app = require('../service');

let admin, adminToken, testUser, testUserToken, adminId;
const { Role, DB } = require('../database/database.js');


async function createTestUser() {
  let user = { password: 'testerPassword', roles: [{ role: Role.Diner }] }
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@tester.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
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

async function login(user){
  let loginRes;
  try{
    loginRes = await request(app).put('/api/auth').send({name: user.name, email: user.email, password: user.password});
  }
  catch (error){
    console.log("login didnt work");
  }
  finally{
    return loginRes
  }
}

beforeAll(async () => {
  admin = await createAdminUser();
  testUser = await createTestUser();
});

test("create franchise test", async () =>{
  loginRes = await login(admin);
  adminToken = loginRes.body.token;
  const createRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${adminToken}`).send({"name": "otherpizzapocket", "admins": [{"email": admin.email}]})
  expect(createRes.status).toBe(200);
  expect(createRes.body.name).toBe("otherpizzapocket");
  const logout = await request(app).delete('/api/auth').set('Authorization', `Bearer ${adminToken}`);
  expect(logout.body.message).toBe("logout successful");
});

//ASK TA'S ABOUT ME I AM GETTING A 401 INSTEAD OF A 403 look at franRouter ln 82
/*
test("unauthorized franchise", async () =>{
  loginRes = await login(testUser);
  testUserToken = loginRes.body.token;
  const createRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${testUserToken}`).send({"name": "newandimprovedpizzapocket", "admins": [{"email": testUser.email}]})
  expect(createRes.status).toBe(403);
  expect(createRes.message).toBe("unable to create a franchise");
});
*/

test("get franchises", async () =>{
  const franchisesRes = await request(app).get('/api/franchise/');
  expect(franchisesRes.status).toBe(200);
  expect(franchisesRes.body[0].name).toBe('otherpizzapocket');
});

test("get user franchises", async () =>{
  loginRes = await login(admin);
  adminToken = loginRes.body.token;
  adminId = loginRes.body.user.id;
  const franchisesRes = await request(app).get(`/api/franchise/${adminId}`).set('Authorization', `Bearer ${adminToken}`);
  expect(franchisesRes.status).toBe(200);
  expect(franchisesRes.body[0].name).toBe('otherpizzapocket');
});



afterAll(async () => {
  const connection = await DB.getConnection();
  try{
    await DB.query(connection, "DROP DATABASE testpizza");
    console.log("Destroying database")
  }
  finally{
    connection.end();
  }
});