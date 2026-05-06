const { Connection } =
require("@solana/web3.js");

const connection =
new Connection(
"https://api.mainnet-beta.solana.com"
);

async function verifyTransaction(signature){

try{

const tx =
await connection.getParsedTransaction(
signature,
{
maxSupportedTransactionVersion:0
}
);

if(!tx){

return false;

}

return true;

}catch(err){

console.log(err);

return false;

}

}

module.exports =
verifyTransaction;
