export function patchIncomeCapture(replace) {
  replace("    if (!Object.values(registry).some(pending)) return;", "    // Income capture must not depend on missions already present in the register.", 2);
  replace("          if(tx.amount<0) continue;", `          if(tx.amount<0) continue;
          // Emit ledger income before attempting a mission match. Backend keys
          // include player + transaction ID, so retries and other devices do not
          // inflate income. Re-emit periodically so a dropped queue can recover.
          if(!duplicate('income:'+whoIncomePlayer()+':'+tx.transactionId,600000))
            emit('activity',{source:'MISSIONCHIEF',category:'INCOME',action:'CREDIT_TRANSACTION',
              transactionId:tx.transactionId,transactionAt:tx.transactionAt,actualCredits:tx.amount,
              missionId:tx.missionId||'',missionName:tx.missionName,actualCreditsSource:'credit-ledger',route:'/credits'});`, 2);
  replace("  async function credits() {", "  function whoIncomePlayer(){return identity().player||'';}\n  async function credits() {", 2);
  replace("pending(r) && normaliseMissionLoggerCreditDescription(r.missionName)===tx.normalisedDescription &&\n            (tx.missionId ? r.missionId===tx.missionId : r.completedAt && Math.abs(Date.parse(r.completedAt)-Date.parse(tx.transactionAt))<120000)", "pending(r) && (tx.missionId ? r.missionId===tx.missionId :\n            normaliseMissionLoggerCreditDescription(r.missionName)===tx.normalisedDescription && r.completedAt && Math.abs(Date.parse(r.completedAt)-Date.parse(tx.transactionAt))<120000)", 2);
  replace("        if(!Object.values(registry).some(pending)) break;", "        // Continue the bounded ledger scan even when all known missions matched.", 2);
}
