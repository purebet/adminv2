var programID = new solanaWeb3.PublicKey("9uReBEtnYGYf1oUe4KGSt6kQhsqGE74i17NzRNEDLutn");
var pool = new solanaWeb3.PublicKey("3SdgUSptYW5NM4SFUYfJwV3awTG7hYJnc1T1yL519mEZ");
var tokenProgram = new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
//var mint = new solanaWeb3.PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
var mint = new solanaWeb3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
var pda = new solanaWeb3.PublicKey("8AbwG4Cbr9DefgeF7P9Pt9RJMA1RS1KVogRWBWh9U8wM");
var delay = new solanaWeb3.PublicKey("Axb9d4GZ9QtMEJoRbnv75gGaos5CSeCpEpJRJsz9YPHF"); 
//var connection = new solanaWeb3.Connection("https://solana-mainnet.core.chainstack.com/db4ce305e4c9e0a90e069f0fe3a5abf7");
var connection = new solanaWeb3.Connection("https://thrumming-burned-bush.solana-mainnet.quiknode.pro/5bb1fc012c796f46f7249e3ec7b3e62ed563f846/");
var all0s = "11111111111111111111111111111111";
var pbmm = "PbmmyD7nYPPiReWYtPK4HKMbzdP79oWrseoYR3McPU5";
var globalProvider;
var globalKey;

async function solflare_connect(){
   await window.solflare.connect();
   document.getElementById("display").innerHTML = window.solflare.publicKey.toBase58();
   globalKey = window.solflare.publicKey;
   globalProvider = window.solflare
}

async function phantom_connect() {
   await window.solana.connect();
   globalKey = window.solana.publicKey
   globalProvider = window.solana;
   document.getElementById("display").innerHTML = globalKey.toString()
}

function nameToBytes(name){
   let words = name.split(" ");
   if(words.length == 0){ //no name, not a player props bet
       return [0, 0, 0, 0];
   }
   else if(words.length == 1){//someone only has a first name
       return [name.charCodeAt(0), 0, 0, 0]
   }
   else{
       if(words.length > 2){ //last name with multiple words
           words[1] = words.slice(1).join(" ");
       }
       let output = [words[0].charCodeAt(0), words[1].charCodeAt(0), words[1].charCodeAt(1)]
       if(words[1].length == 2){ //2 letter last name
           output.push(0);
           return output;
       }
       else{
           output.push(words[1].charCodeAt(2));
           return output;
       }
   }
}

function numToBytes(num, bytes){
   let output = [0, 0, 0, 0, 0, 0, 0, 0];
   for(let pow = 7; pow >= 0; pow--){
       output[pow] = Math.floor(num / 256**pow);
       num = num % 256**pow;
   }
   return output.slice(0, bytes);
}

function genId(sport, league, event, period, mkt, player){
   return numToBytes(sport, 1)
      .concat(numToBytes(league, 4))
      .concat(numToBytes(event, 8))
      .concat(numToBytes(period, 1))
      .concat(numToBytes(mkt, 2))
      .concat(nameToBytes(player));
}

async function getBets(sport, league, event, period, mkt, player){ 
   //needs fixed
   var b58id = base58.encode(genId(sport, league, event, period, mkt, player));
   var accs = await connection.getProgramAccounts
      (programID, 
         {
            filters: [{memcmp: {offset: 0, bytes: b58id} }, {dataSize: 142}],
            dataSlice: {length: 96, offset: 36}
         }
      );
   if(accs.length == 0){
     alert("Either there are no bets on this market or the RPC ran into an error.");
   }
   return accs;
}

async function grade(){
   var sport = document.getElementById("sport").value;
   var league = document.getElementById("league").value;
   var event = document.getElementById("isObfuscated").checked ? //obfuscated is written on chain
      document.getElementById("event").value :
      (document.getElementById("event").value - 1500000000) * 2;
   var period = document.getElementById("period").value;
   var mkt = document.getElementById("mkt").value;
   var player = document.getElementById("player").value;
   var winner = document.getElementById("winner").value;
   await gradeParams(sport, league, event, period, mkt, player, winner);
}
 
async function gradeParams(sport, league, event, period, mkt, player, winner){
   let graded = []; //will be an array of {bettor, bet}
   document.getElementById("txsizemsg").innerHTML = "";
   var accs = await getBets(sport, league, event, period, mkt, player);
   
   var transaction = new solanaWeb3.Transaction();
   transaction.feePayer = globalKey;
   transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
   var x = 0;

   while(transaction.serialize({requireAllSignatures: false, verifySignatures: false}).length < 1100 && x < accs.length){
      var betAcc = accs[x].pubkey;
      
      var bettor0 = new solanaWeb3.PublicKey(accs[x].account.data.slice(0, 32));
      var bettor1 = new solanaWeb3.PublicKey(accs[x].account.data.slice(32, 64));
      let rentPayer = new solanaWeb3.PublicKey(accs[x].account.data.slice(64, 96));

      if (bettor0.toBase58() == all0s || bettor1.toBase58() == all0s || rentPayer.toBase58() == all0s){
         x += 1;
         continue;
      }
      let ataInfos = await Promise.all([
         connection.getTokenAccountsByOwner(bettor0, { mint: mint }),
         connection.getTokenAccountsByOwner(bettor1, { mint: mint })
      ]);
      let ata0 = ataInfos[0].value[0].pubkey;
      let ata1 = ataInfos[1].value[0].pubkey;
      
      var instruction  = new solanaWeb3.TransactionInstruction({
         keys: [
            {pubkey: betAcc, isSigner: false, isWritable: true },
            {pubkey: tokenProgram, isSigner: false, isWritable: false},
            {pubkey: pool, isSigner: false, isWritable: true },
            {pubkey: pda, isSigner: false, isWritable: true },
            {pubkey: bettor0, isSigner: false, isWritable: true },
            {pubkey: ata0, isSigner: false, isWritable: true },
            {pubkey: bettor1, isSigner: false, isWritable: true },
            {pubkey: ata1, isSigner: false, isWritable: true },
            {pubkey: rentPayer, isSigner: false, isWritable: true },
            {pubkey: globalKey, isSigner: true, isWritable: true } 
         ],
         programId: programID,
         data: new Uint8Array(genId(sport, league, event, period, mkt, player).concat([winner])),
      });
      transaction.add(instruction); 
      x += 1;
      //console.log(transaction.serialize({requireAllSignatures: false, verifySignatures: false}).length);
      if(bettor0.toBase58() != pbmm){
         graded.push({grade: betAcc.toBase58(), for: bettor0.toBase58(), winner: winner})
      }
      if(bettor1.toBase58() != pbmm){
         graded.push({grade: betAcc.toBase58(), for: bettor1.toBase58(), winner: winner})
      }
   }

   document.getElementById("txsizemsg").innerHTML = "There were " + (accs.length - x) + " accounts left ungraded because of transaction size";

   signed = await globalProvider.signTransaction(transaction);
   signature = await connection.sendRawTransaction(signed.serialize());
   await connection.confirmTransaction(signature);
   document.getElementById("gradeSig").innerHTML = signature;
   document.getElementById("gradeSig").setAttribute("href", "https://explorer.solana.com/tx/" + signature);// + "?cluster=devnet");

   for(let bet of graded){
      let call = new XMLHttpRequest();
      let url = "https://p43l0w1hu4.execute-api.ap-northeast-1.amazonaws.com/default/pendingBetsV2?grade=" + 
         bet.grade + "&for=" + bet.for + "&winner=" + bet.winner;
      call.open("GET", url);
      call.send();
   }

}
