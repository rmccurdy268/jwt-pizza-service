const request = require('supertest');
const app = require('../service');

const { Role, DB } = require('../database/database.js');
let admin;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

beforeAll(async () => {
  admin = await createAdminUser();
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



test("create franchise test", async () =>{
  
});