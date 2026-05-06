const express = require("express");
const cors = require("cors");

const pool = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{

res.send(
"OILANTIS BACKEND LIVE"
);

});

app.get("/test-db", async(req,res)=>{

try{

const result =
await pool.query(
"SELECT NOW()"
);

res.json(result.rows);

}catch(err){

console.log(err);

res.status(500).send(
"DATABASE ERROR"
);

}

});

app.get("/create-tables", async(req,res)=>{

try{

await pool.query(`

CREATE TABLE IF NOT EXISTS users (

id SERIAL PRIMARY KEY,

wallet TEXT UNIQUE,

oil INTEGER DEFAULT 0,

wells INTEGER DEFAULT 0,

created_at TIMESTAMP DEFAULT NOW()

);

`);

await pool.query(`

CREATE TABLE IF NOT EXISTS wells (

id SERIAL PRIMARY KEY,

wallet TEXT,

country TEXT,

production INTEGER DEFAULT 5,

created_at TIMESTAMP DEFAULT NOW()

);

`);

await pool.query(`

CREATE TABLE IF NOT EXISTS transactions (

id SERIAL PRIMARY KEY,

wallet TEXT,

country TEXT,

amount REAL,

signature TEXT,

created_at TIMESTAMP DEFAULT NOW()

);

`);

res.send(
"TABLES CREATED"
);

}catch(err){

console.log(err);

res.status(500).send(
"ERROR CREATING TABLES"
);

}

});

const PORT =
process.env.PORT || 3000;

app.listen(PORT, ()=>{

console.log(
"SERVER LIVE ON " + PORT
);

});
