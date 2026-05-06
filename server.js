require("dotenv").config();

const express =
require("express");

const cors =
require("cors");

const solanaWeb3 =
require("@solana/web3.js");

const pool =
require("./db");

const app =
express();

app.use(cors());

app.use(express.json());

/* ACTIVE EVENT */

let activeEvent = null;

/* HOME */

app.get("/",(req,res)=>{

  res.json({
    status:"Oilantis backend online"
  });

});

/* CREATE USER */

app.post("/create-user",
async(req,res)=>{

  try{

    const { wallet } =
    req.body;

    const exists =
    await pool.query(

      `SELECT *

      FROM users

      WHERE wallet=$1`,

      [wallet]

    );

    if(exists.rows.length > 0){

      return res.json({
        user:exists.rows[0]
      });

    }

    const result =
    await pool.query(

      `INSERT INTO users
      (wallet,oil,last_claim)

      VALUES($1,$2,$3)

      RETURNING *`,

      [
        wallet,
        0,
        Date.now()
      ]

    );

    res.json({
      user:result.rows[0]
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      error:"server error"
    });

  }

});

/* GET USER */

app.get("/user/:wallet",
async(req,res)=>{

  try{

    const result =
    await pool.query(

      `SELECT *

      FROM users

      WHERE wallet=$1`,

      [req.params.wallet]

    );

    const wellsResult =
    await pool.query(

      `SELECT COUNT(*)

      FROM wells

      WHERE wallet=$1`,

      [req.params.wallet]

    );

    const user =
    result.rows[0];

    user.wells =
    parseInt(
      wellsResult.rows[0].count
    );

    res.json(user);

  }catch(err){

    console.log(err);

    res.status(500).json({
      error:"server error"
    });

  }

});

/* BUY WELL */

app.post("/buy-well",
async(req,res)=>{

  try{

    const {
      wallet,
      signature,
      region
    } = req.body;

    /* DOUBLE SPEND */

    const existingTx =
    await pool.query(

      `SELECT *

      FROM transactions

      WHERE signature=$1`,

      [signature]

    );

    if(existingTx.rows.length > 0){

      return res.status(400).json({
        error:"tx used"
      });

    }

    /* VERIFY TX */

    const connection =
    new solanaWeb3.Connection(
      "https://api.mainnet-beta.solana.com"
    );

    const tx =
    await connection.getTransaction(
      signature,
      {
        commitment:"confirmed"
      }
    );

    if(!tx){

      return res.status(400).json({
        error:"tx not found"
      });

    }

    /* REGION */

    const regionResult =
    await pool.query(

      `SELECT *

      FROM regions

      WHERE name=$1`,

      [region]

    );

    const regionData =
    regionResult.rows[0];

    if(!regionData){

      return res.status(400).json({
        error:"invalid region"
      });

    }

    /* SAVE TX */

    await pool.query(

      `INSERT INTO transactions
      (signature,wallet,created_at)

      VALUES($1,$2,$3)`,

      [
        signature,
        wallet,
        Date.now()
      ]

    );

    /* CREATE WELL */

    await pool.query(

      `INSERT INTO wells
      (
      wallet,
      region,
      yield,
      health,
      risk,
      created_at
      )

      VALUES(
      $1,$2,$3,$4,$5,$6
      )`,

      [
        wallet,
        region,
        regionData.yield,
        100,
        1,
        Date.now()
      ]

    );

    res.json({
      success:true
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      error:"server error"
    });

  }

});

/* CLAIM */

app.post("/claim",
async(req,res)=>{

  try{

    const { wallet } =
    req.body;

    const userResult =
    await pool.query(

      `SELECT *

      FROM users

      WHERE wallet=$1`,

      [wallet]

    );

    const user =
    userResult.rows[0];

    const wellsResult =
    await pool.query(

      `SELECT *

      FROM wells

      WHERE wallet=$1`,

      [wallet]

    );

    const wells =
    wellsResult.rows;

    const now =
    Date.now();

    const diff =
    now - user.last_claim;

    const hours =
    diff / 3600000;

    let generated = 0;

    for(const w of wells){

      let finalYield =
      w.yield;

      if(activeEvent){

        if(

          activeEvent.effect_region ===
          w.region ||

          activeEvent.effect_region ===
          "GLOBAL"

        ){

          if(
            activeEvent.effect_type ===
            "yield"
          ){

            finalYield *=
            activeEvent.effect_value;

          }

        }

      }

      const effectiveYield =

      finalYield *
      (w.health / 100);

      generated +=
      effectiveYield * hours;

      /* DECAY */

      const decay =
      hours * w.risk;

      let newHealth =
      w.health - decay;

      if(newHealth < 10){

        newHealth = 10;

      }

      await pool.query(

        `UPDATE wells

        SET health=$1

        WHERE id=$2`,

        [
          newHealth,
          w.id
        ]

      );

    }

    generated =
    Math.floor(generated);

    await pool.query(

      `UPDATE users

      SET oil = oil + $1,

      last_claim = $2

      WHERE wallet=$3`,

      [
        generated,
        now,
        wallet
      ]

    );

    res.json({
      generated
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      error:"server error"
    });

  }

});

/* LEADERBOARD */

app.get("/leaderboard",
async(req,res)=>{

  try{

    const result =
    await pool.query(

      `SELECT *

      FROM users

      ORDER BY oil DESC

      LIMIT 20`

    );

    res.json(result.rows);

  }catch(err){

    console.log(err);

    res.status(500).json({
      error:"server error"
    });

  }

});

/* MARKET */

app.get("/market",
async(req,res)=>{

  try{

    const result =
    await pool.query(

      `SELECT *

      FROM market

      ORDER BY id DESC

      LIMIT 1`

    );

    res.json(result.rows[0]);

  }catch(err){

    console.log(err);

    res.status(500).json({
      error:"server error"
    });

  }

});

/* EVENTS */

app.get("/event",
(req,res)=>{

  res.json(activeEvent);

});

/* GENERATE EVENTS */

async function generateEvent(){

  try{

    const result =
    await pool.query(

      `SELECT *

      FROM events

      ORDER BY RANDOM()

      LIMIT 1`

    );

    activeEvent =
    result.rows[0];

    console.log(
      "NEW EVENT:",
      activeEvent.title
    );

  }catch(err){

    console.log(err);

  }

}

setInterval(

  generateEvent,

  1000 * 60 * 10

);

generateEvent();

/* SERVER */
async function setupDatabase(){
...
}

setupDatabase();
const PORT =
process.env.PORT || 3000;

app.listen(PORT,()=>{

  console.log(
    "Oilantis backend running"
  );

});
