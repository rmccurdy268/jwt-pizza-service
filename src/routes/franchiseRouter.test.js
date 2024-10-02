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

async function logout(token){
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
  return logoutRes.body.message;
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

function randomFranchiseName(){
  return Math.random().toString(12).substring(2, 8);
}

beforeAll(async () => {
  admin = await createAdminUser();
  testUser = await createTestUser();
});
test("unauthorized franchise", async () =>{
  const loginRes = await login(testUser);
  const franchiseName = randomFranchiseName();
  const createRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${loginRes.body.token}`).send({"name": `${franchiseName}`, "admins": [{"email": testUser.email}]})
  expect(createRes.status).toBe(403);
  expect(createRes.body.message).toBe("unable to create a franchise");
  expect(await logout(loginRes.body.token)).toBe("logout successful");
});

test("create franchise test", async () =>{
  const loginRes = await login(admin);
  const franchiseName = randomFranchiseName();
  const createRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${loginRes.body.token}`).send({"name": `${franchiseName}`, "admins": [{"email": admin.email}]})
  expect(createRes.status).toBe(200);
  expect(createRes.body.name).toBe(franchiseName);
  expect(await logout(loginRes.body.token)).toBe("logout successful");
});

test("get franchises", async () =>{
  const franchisesRes = await request(app).get('/api/franchise/');
  expect(franchisesRes.status).toBe(200);
  //add confirmation here
});

test("get user franchises", async () =>{
  const loginRes = await login(admin);
  adminToken = loginRes.body.token;
  adminId = loginRes.body.user.id;
  const franchisesRes = await request(app).get(`/api/franchise/${adminId}`).set('Authorization', `Bearer ${adminToken}`);
  expect(franchisesRes.status).toBe(200);
  //add confirmation here
  expect(await logout(adminToken)).toBe("logout successful")
});

test("create store test", async () =>{
  const loginRes = await login(admin);
  const franchiseName = randomFranchiseName();
  const createFranchiseRes = await request(app).post('/api/franchise/').set('Authorization', `Bearer ${loginRes.body.token}`).send({"name": `${franchiseName}`, "admins": [{"email": admin.email}]})
  expect(createFranchiseRes.status).toBe(200);
  const storeName = randomFranchiseName()
  const createStoreRes = await request(app).post(`/api/franchise/${createFranchiseRes.body.id}/store`).set('Authorization', `Bearer ${adminToken}`).send({"franchiseId": createFranchiseRes.body.id, "name": storeName});
  expect(createStoreRes.status).toBe(200);
  expect(createStoreRes.body.name).toBe(storeName);
  storeToDeleteId = createStoreRes.body.id;
  franchiseToDeleteId = createFranchiseRes.body.id;
});

test("delete store", async () =>{
  const deleteStoreRes = await request(app).delete(`/api/franchise/${franchiseToDeleteId}/store/${storeToDeleteId}`).set('Authorization', `Bearer ${adminToken}`);
  expect(deleteStoreRes.status).toBe(200);
  expect(deleteStoreRes.body.message).toBe('store deleted');
});

test("delete franchise", async () =>{
  const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchiseToDeleteId}`).set('Authorization', `Bearer ${adminToken}`);
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
  expect(await logout(adminToken)).toBe("logout successful"); 
});



afterAll(async () => {
  const connection = await DB.getConnection();
  try{
    //await DB.query(connection, "DROP DATABASE testpizza");
    console.log("Destroying database")
  }
  finally{
    connection.end();
  }
});