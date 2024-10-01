const request = require('supertest');
const app = require('../service');

const { Role, DB } = require('../database/database.js');
let admin, adminToken, testUser, testUsertoken;

async function createTestUser() {
  let user = { password: 'testerPassword', roles: [{ role: Role.Diner }] }
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@admin.com';

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
    loginRes = await request(app).put('/api/auth').send(user);
  }
  catch (error){
    console.log("login didnt work");
  }
  finally{
    return loginRes.body.token;
  }
}

beforeAll(async () => {
  admin = await createAdminUser();
  testUser = await createAdminUser();
  adminToken = await login(admin);
  testUsertoken = await login(testUser);

});
test("create franchise test", async () =>{
  expect(true).toBeTruthy()
  const createRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${adminToken}`).send({"name": "otherpizzapocket", "admins": [{"email": admin.email}]})
  expect(createRes.status).toBe(200);
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