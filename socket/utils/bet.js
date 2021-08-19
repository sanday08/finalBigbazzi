const User = require("../../models/User");
const Bet = require("../../models/Bet");
const WinResult = require("../../models/WinResult");
const Winning = require("../../models/Winning");

async function placeBet(userId, game, position, betPoint, adminPer) {
  //Verify Token
  try {
    let user = await User.findById(userId);

    if (user.amount >= betPoint) {
      bet = await Bet.create({
        userId,
        game,
        bet: betPoint,
        startPoint: user.amount,
        userName: user.userName,
        position,
        name: user.name,
      });
      await User.findByIdAndUpdate(userId, {
        $inc: {
          amount: -betPoint,
          playPoint: betPoint,
        },
        lastBetAmount: betPoint,
      });

      return bet._id;
    }
    return 0;
  } catch (err) {
    console.log("Error on place bet", err.message);
    return;
  }
}

async function winGamePay(price, betId, winPosition, gameName) {
  try {
    console.log(
      "WInGame Pay: price : ",
      price,
      "  betId : ",
      betId,
      " winPosition : ",
      winPosition
    );

    const betData = await Bet.findByIdAndUpdate(betId, {
      $inc: { won: price },
    });

    let user = await User.findByIdAndUpdate(betData.userId, {
      $inc: { amount: price, wonPoint: price },
    });

    return betData.userId;
  } catch (err) {
    console.log("Error on winGamePay", err.message);
    return err.message;
  }
}

//Add result of the Game
async function addGameResult(gameName, result) {
  try {
    await WinResult.create({ gameName, result });
    await Bet.updateMany(
      { $and: [{ game: gameName }, { winPosition: "" }] },
      { winPosition: result }
    );
  } catch (err) {
    console.log("Error on addGameResult", err.message);
    return err.message;
  }
}

//Add result of the Game
async function getLastrecord(gameName, userId) {
  try {
    let result = await WinResult.find({ gameName })
      .select({ result: 1, _id: 0 })
      .sort("-createdAt")
      .limit(15);
    let data = [];

    for (res of result) {
      data.push(res.result);
    }

    return { records: data };
  } catch (err) {
    console.log("Error on getLastrecord", err.message);
    return err.message;
  }
}

//Get Admin Percentage for winning Result
async function getAdminPer() {
  return Winning.findById("602e55e9a494988def7acc25");
}
//Get current running Game Data{
async function getCurrentBetData(gameName, userId) {
  let data = await Bet.find({ game: gameName, winPosition: "", userId });
  return data;
}

module.exports = {
  placeBet,
  winGamePay,
  getAdminPer,
  addGameResult,
  getLastrecord,
  getCurrentBetData,
};
