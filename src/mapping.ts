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

  if (methodName == "buy" || methodName == "nft_transfer") {
    let buyer: string = "";
    if (methodName == "buy") {
      buyer = actionReceipt.signerId;
    }
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

    if (!buyer) {
      // do nothing in case we have no buyer
      return;
    }
    log.info('buyer: {}', [buyer]);

    const args = json.try_fromBytes(functionCall.args).value;
    const tokenId = args.toObject().get("token_id");
    if (tokenId) {
      log.info("arguments: {}", [tokenId.toString()])
      let token = NFTToken.load(tokenId.toString());
      if (token) {
        token.owner = buyer.toString();
        token.last_change = BigInt.fromU64(timestamp);
      } else {
        // create new token with new owner (when buy happened)
        token = new NFTToken(tokenId.toString());
        token.owner = buyer.toString();
        token.last_change = BigInt.fromU64(timestamp);
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
