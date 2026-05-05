const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { Connection, PublicKey, Transaction, SystemProgram } = require("@solana/web3.js");

const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection("https://api.mainnet-beta.solana.com","confirmed");

const RECEIVER = new PublicKey("Ej9DaKaqvDu73ZeskM77EqGLsmUr2ND6EahccJ5T6zge");

const DB_FILE = "db.json";

if(!fs.existsSync(DB_FILE)){
  fs.writeFileSync(DB_FILE, JSON.stringify({ users:{} }));
}

function loadDB(){
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db){
  fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2));
}

app.post("/create-tx", async (req,res)=>{
  try{
    const { wallet, price } = req.body;

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet),
        toPubkey: RECEIVER,
        lamports: Math.floor(price * 1e9)
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();

    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(wallet);

    const serialized = tx.serialize({ requireAllSignatures:false }).toString("base64");

    res.send({ tx: serialized });

  } catch(e){
    res.status(500).send(e.message);
  }
});

app.listen(3000,()=>console.log("Backend running"));
