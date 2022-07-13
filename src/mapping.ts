import { near, JSONValue, json, ipfs, log, BigInt } from "@graphprotocol/graph-ts";
import { NFTToken, User } from "../generated/schema";

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const timestamp: u64 = receipt.block.header.timestampNanosec;
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt.receipt, timestamp);
  }
}

function handleAction(
  action: near.ActionValue,
  actionReceipt: near.ActionReceipt,
  timestamp: u64,
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    return;
  }

  const functionCall = action.toFunctionCall();
  const methodName = functionCall.methodName;

  // only for debugging purposes
  if (methodName) {
    log.info("methodName {}", [methodName]);
  }

  // verify if the method is one of the methods we want to handle
  if (methodName == "buy" || methodName == "nft_transfer" || methodName == "resell" || methodName == "revoke") {
    let buyer: string = "";

    // in case of buy, the buyer is the sender of the transaction
    if (methodName == "buy") {
      buyer = actionReceipt.signerId;
    }

    // in case of transfer `buyer` var is a receiver (the one who gets the transfer)
    if (methodName == "nft_transfer") {
      const args = json.try_fromBytes(functionCall.args).value;
      const receiver = args.toObject().get("receiver_id");
      if (receiver) {
        buyer = receiver.toString(); 
      } else {
        // do nothing in case we have no receiver
        return;
      }
    }

    // in case we do resell or revoke buyer is always a caller
    if (methodName == "resell" || methodName == "revoke") {
      buyer = actionReceipt.signerId;
    }

    // no buyer always means that the transaction is not related to NFT
    if (!buyer) {
      // do nothing in case we have no buyer
      return;
    }
    log.info('buyer: {}', [buyer]);

    const args = json.try_fromBytes(functionCall.args).value;
    const tokenId = args.toObject().get("token_id");
    const toBeSold = methodName == "resell";
    
    // for debug purposes to check if all is fine with sell operations
    log.info('to be sold: {}', [toBeSold.toString()]);

    if (tokenId) {
      log.info("arguments: {}", [tokenId.toString()])

      let token = NFTToken.load(tokenId.toString());
      if (token) {
        token.owner = buyer.toString();
        token.last_change = BigInt.fromU64(timestamp);
        token.on_sale = toBeSold;
      } else {
        // create new token with new owner (when buy happened)
        token = new NFTToken(tokenId.toString());
        token.owner = buyer.toString();
        token.last_change = BigInt.fromU64(timestamp);
        token.on_sale = toBeSold;
      }
      token.save();
    
      let user = User.load(buyer);
      if (!user) {
        user = new User(buyer);
        user.save();
      }
    } else {
      log.info("no token id", []);
    }

  }

}
