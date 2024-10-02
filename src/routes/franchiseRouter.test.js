const request = require('supertest');
const app = require('../service');

let admin, adminToken, testUser, testUserToken, adminId, franchiseToDeleteId, storeToDeleteId;
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

async function login(user){
  let loginRes;
  try{
    loginRes = await request(app).put('/api/auth').send({name: user.name, email: user.email, password: user.password});
    if (user.roles[0].role == Role.Admin){
      adminToken = loginRes.body.token;
    }
    else{
      testUserToken = loginRes.body.token;
    }
    return loginRes;
  }
  catch (error){
    console.log(error);
    throw new Error("login didnt work");
  }
}

beforeAll(async () => {
  admin = await createAdminUser();
  testUser = await createTestUser();
});
test("unauthorized franchise", async () =>{
  loginRes = await login(testUser);
  testUserToken = loginRes.body.token;
  const createRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${testUserToken}`).send({"name": "newandimprovedpizzapocket", "admins": [{"email": testUser.email}]})
  expect(createRes.status).toBe(403);
  expect(createRes.body.message).toBe("unable to create a franchise");
  const logout = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserToken}`);
  expect(logout.body.message).toBe("logout successful");
});

test("create franchise test", async () =>{
  const loginRes = await login(admin);
  adminToken = loginRes.body.token;
  const createRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${adminToken}`).send({"name": "otherpizzapocket", "admins": [{"email": admin.email}]})
  expect(createRes.status).toBe(200);
  expect(createRes.body.name).toBe("otherpizzapocket");
  franchiseToDeleteId = createRes.body.id;
  const logout = await request(app).delete('/api/auth').set('Authorization', `Bearer ${adminToken}`);
  expect(logout.body.message).toBe("logout successful");
});

test("get franchises", async () =>{
  const franchisesRes = await request(app).get('/api/franchise/');
  expect(franchisesRes.status).toBe(200);
  expect(franchisesRes.body[0].name).toBe('otherpizzapocket');
});

test("get user franchises", async () =>{
  const loginRes = await login(admin);
  adminToken = loginRes.body.token;
  adminId = loginRes.body.user.id;
  const franchisesRes = await request(app).get(`/api/franchise/${adminId}`).set('Authorization', `Bearer ${adminToken}`);
  expect(franchisesRes.status).toBe(200);
  expect(franchisesRes.body[0].name).toBe('otherpizzapocket');
});

test("create store test", async () =>{
  const createRes = await request(app).post(`/api/franchise/${franchiseToDeleteId}/store`).set('Authorization', `Bearer ${adminToken}`).send({"franchiseId": franchiseToDeleteId, "name": "SLC"})
  expect(createRes.status).toBe(200);
  expect(createRes.body.name).toBe("SLC");
  storeToDeleteId = createRes.body.id;
});

test("delete store", async () =>{
  const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchiseToDeleteId}/store/${storeToDeleteId}`).set('Authorization', `Bearer ${adminToken}`);
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body.message).toBe('store deleted'); 
});

test("delete franchise", async () =>{
  const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchiseToDeleteId}`).set('Authorization', `Bearer ${adminToken}`);
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
  const logout = await request(app).delete('/api/auth').set('Authorization', `Bearer ${adminToken}`);
  expect(logout.body.message).toBe("logout successful"); 
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