var programID = new solanaWeb3.PublicKey("");
var connection = new solanaWeb3.Connection("", "confirmed");
var bankpda = new solanaWeb3.PublicKey("");
var bankAssocTok = new solanaWeb3.PublicKey("");
var tokenProgram = new solanaWeb3.PublicKey("");
var mint = new solanaWeb3.PublicKey("");
var globalProvider;
var globalKey;

async function solflare_connect(){
   await window.solflare.connect();
   document.getElementById("display").innerHTML = window.solflare.publicKey.toBase58();
   globalKey = window.solflare.publicKey;
   globalProvider = window.solflare
}

async function phantom_connect() {
   if ('phantom' in window) {
      phantom = window.phantom?.solana;
      if(phantom?.isPhantom) {
         let connection = await phantom.connect()
         globalKey = connection.publicKey
         globalProvider = connection
         document.getElementById("display").innerHTML = globalKey.toString()
      }
   }
}

async function wagerPush(){
   var sport = document.getElementById("sport").value;
   var league = document.getElementById("league").value;
   var event = document.getElementById("event").value;
   var period = document.getElementById("period").value;
   var mkt = document.getElementById("mkt").value;
   var player = document.getElementById("player").value;
   await wagerPushParams(sport, league, event, period, mkt, player);
}

async function getBumpKey(){
   //needs fixed
   var bumpKeyArr = await solanaWeb3.PublicKey.findProgramAddress([ new Uint8Array([98, 97, 110, 107])], programID);
   var bumpKey = bumpKeyArr[1];
   return bumpKey;
}

async function getBets(sport, league, event, period, mkt, player){ 
   //needs fixed
   var b58id = base58.encode([id1, id2]);
   var accs = await connection.getProgramAccounts
      (programID, 
         {filters:
         [
            {memcmp: {offset: 0, bytes: b58id} }, 
         ],
         //dataSlice: {length: 65, offset: 6}
         }
      );
   if(accs.length == 0){
     alert("Either there are no bets on this market or the RPC ran into an error.");
   }
   return accs;
}
 
async function wagerPushParams(sport, league, event, period, mkt, player){
   var accs = await getBets(id1, id2);
   var bumpKey = await getBumpKey();
   var transaction = new solanaWeb3.Transaction();
   transaction.feePayer = globalKey;
   var blockhashObj = await connection.getRecentBlockhash();
   transaction.recentBlockhash = await blockhashObj.blockhash;
   var x = 0;
   
   while(transaction.serialize({requireAllSignatures: false, verifySignatures: false}).length < 1075 && x < accs.length){
      var betAcc = accs[x].pubkey;
      var homeWallet = new solanaWeb3.PublicKey(accs[x].account.data.slice(6, 38));
      var awayWallet = new solanaWeb3.PublicKey(accs[x].account.data.slice(38, 70));
   
      if (homeWallet.toBase58() == all0s || awayWallet.toBase58() == all0s){
         x += 1;
         continue;
      }
 
      var homeAssocTok = await connection.getTokenAccountsByOwner(homeWallet, {mint: mint});
      var awayAssocTok = await connection.getTokenAccountsByOwner(awayWallet, {mint: mint});
   
      var instruction = new solanaWeb3.TransactionInstruction({
         keys: [
         {pubkey: betAcc, isSigner: false, isWritable: true},
         {pubkey: tokenProgram, isSigner: false, isWritable: false},
         {pubkey: bankAssocTok, isSigner: false, isWritable: true},
         {pubkey: mint, isSigner: false, isWritable: true},
         {pubkey: homeAssocTok.value[0].pubkey, isSigner: false, isWritable: true},
         {pubkey: homeWallet, isSigner: false, isWritable: true},
         {pubkey: bankpda, isSigner: false, isWritable: true},
         {pubkey: globalKey, isSigner: true, isWritable: true},
         {pubkey: awayAssocTok.value[0].pubkey, isSigner: false, isWritable: true},
         {pubkey: awayWallet, isSigner: false, isWritable: true}
         ],
         programId: programID,
         data: new Uint8Array([bumpKey, parseInt(id1), parseInt(id2), 99]),
      });
     transaction.add(instruction);
     x += 1;
     console.log(transaction.serialize({requireAllSignatures: false, verifySignatures: false}).length);
   }
   
   document.getElementById("txsizemsg").innerHTML = "There were " + (accs.length - x) + " accounts left unpushed because of transaction size";
   
   signed = await globalProvider.signTransaction(transaction);
   signature = await connection.sendRawTransaction(signed.serialize());
   await connection.confirmTransaction(signature);
   console.log(signature);
   document.getElementById("gradeSig").innerHTML = signature;
   document.getElementById("gradeSig").setAttribute("href", "https://explorer.solana.com/tx/" + signature);
}

async function grade(){
   var sport = document.getElementById("sport").value;
   var league = document.getElementById("league").value;
   var event = document.getElementById("event").value;
   var period = document.getElementById("period").value;
   var mkt = document.getElementById("mkt").value;
   var player = document.getElementById("player").value;
   var winner = document.getElementById("winner").value;
   await gradeParams(sport, league, event, period, mkt, player, winner);
}
 
async function gradeParams(sport, league, event, period, mkt, player){
   if(winner == "99"){
      await wagerPushParams(sport, league, event, period, mkt, player);
      return;
   }
   document.getElementById("txsizemsg").innerHTML = "";
   var accs = await getBets(sport, league, event, period, mkt, player);
   var bumpKey = await getBumpKey();   

   //var adminAssocTokArr = await connection.getTokenAccountsByOwner(globalKey, {mint: mint});
   //var adminAssocTok = adminAssocTokArr.value[0].pubkey;
   var transaction = new solanaWeb3.Transaction();
   transaction.feePayer = globalKey;
   var blockhashObj = await connection.getRecentBlockhash();
   transaction.recentBlockhash = await blockhashObj.blockhash; 
   var x = 0;

   while(transaction.serialize({requireAllSignatures: false, verifySignatures: false}).length < 1100 && x < accs.length){
      var betAcc = accs[x].pubkey;
      var receiver;
      
      var homeWallet = new solanaWeb3.PublicKey(accs[x].account.data.slice(6, 38));
      var awayWallet = new solanaWeb3.PublicKey(accs[x].account.data.slice(38, 70));

      if (homeWallet.toBase58() == all0s || awayWallet.toBase58() == all0s){
         x += 1;
         continue;
      }
      else if (winner == "0"){
         receiver = homeWallet;
      }
      else if(winner == "1"){
         receiver = awayWallet;
      }
      
      var receiverAssocTok = await connection.getTokenAccountsByOwner(receiver, {mint: mint});

      var rentExemptionPayer;
      if(accs[x].account.data[70] == 0){
         rentExemptionPayer = new solanaWeb3.PublicKey(accs[x].account.data.slice(6, 38));
      }
      else if(accs[x].account.data[70] == 1){
         rentExemptionPayer = new solanaWeb3.PublicKey(accs[x].account.data.slice(38, 70));
      }
      
      var instruction  = new solanaWeb3.TransactionInstruction({
         keys: [
         {pubkey: betAcc, isSigner: false, isWritable: true},
         {pubkey: tokenProgram, isSigner: false, isWritable: false},
         {pubkey: bankAssocTok, isSigner: false, isWritable: true},
         {pubkey: mint, isSigner: false, isWritable: true},
         {pubkey: receiverAssocTok.value[0].pubkey, isSigner: false, isWritable: true},
         {pubkey: receiver, isSigner: false, isWritable: true},
         {pubkey: bankpda, isSigner: false, isWritable: true},
         {pubkey: globalKey, isSigner: true, isWritable: true},
         {pubkey: rentExemptionPayer, isSigner: false, isWritable: true},
         ],
         programId: programID,
         data: new Uint8Array([bumpKey, parseInt(id1), parseInt(id2), parseInt(winner)]),
      });
      transaction.add(instruction); 
      x += 1;
      console.log(transaction.serialize({requireAllSignatures: false, verifySignatures: false}).length);
   }

   document.getElementById("txsizemsg").innerHTML = "There were " + (accs.length - x) + " accounts left ungraded because of transaction size";

   signed = await globalProvider.signTransaction(transaction);
   signature = await connection.sendRawTransaction(signed.serialize());
   await connection.confirmTransaction(signature);
   console.log(signature);
   document.getElementById("gradeSig").innerHTML = signature;
   document.getElementById("gradeSig").setAttribute("href", "https://explorer.solana.com/tx/" + signature);
}