const express = require("express");
const cors = require("cors");

const pool = require("./database");

const verifyTransaction =
require("./verifyTransaction");

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

app.post("/buy-well", async(req,res)=>{

try{

const {

wallet,
country,
signature

} = req.body;

if(
!wallet ||
!country ||
!signature
){

return res.status(400).send(
"MISSING DATA"
);

}

const verified =
await verifyTransaction(
signature
);

if(!verified){

return res.status(400).send(
"INVALID TRANSACTION"
);

}

await pool.query(

`

INSERT INTO wells
(wallet,country,production)

VALUES ($1,$2,$3)

`,

[
wallet,
country,
5
]

);

await pool.query(

`

INSERT INTO transactions
(wallet,country,amount,signature)

VALUES ($1,$2,$3,$4)

`,

[
wallet,
country,
0.02,
signature
]

);

const existingUser =

await pool.query(

`

SELECT * FROM users

WHERE wallet=$1

`,

[wallet]

);

if(
existingUser.rows.length === 0
){

await pool.query(

`

INSERT INTO users
(wallet,oil,wells)

VALUES ($1,$2,$3)

`,

[
wallet,
10,
1
]

);

}else{

await pool.query(

`

UPDATE users

SET

oil = oil + 10,
wells = wells + 1

WHERE wallet=$1

`,

[wallet]

);

}

res.json({

success:true

});

}catch(err){

console.log(err);

res.status(500).send(
"SERVER ERROR"
);

}

});

app.get("/leaderboard", async(req,res)=>{

try{

const result =

await pool.query(

`

SELECT wallet,oil,wells

FROM users

ORDER BY oil DESC

LIMIT 10

`

);

res.json(
result.rows
);

}catch(err){

console.log(err);

res.status(500).send(
"LEADERBOARD ERROR"
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
