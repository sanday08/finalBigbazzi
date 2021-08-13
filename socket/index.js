const { io } = require("../server");
const { getUserInfoBytoken } = require("./utils/users");
const {
  placeBet,
  winGamePay,
  getAdminPer,
  addGameResult,
  getLastrecord,
  getCurrentBetData,
} = require("./utils/bet");
const immutable = require("object-path-immutable");
var _ = require("lodash");
let games = {
  parity: {
    startTime: new Date().getTime() / 1000,
    position: {},
    adminBalance: 0,
  },
  andarBahar: {
    startTime: new Date().getTime() / 1000 + 25,
    position: {},
    position: {},
    adminBalance: 0,
  },
};
//users: use for store game Name so when user leave room than we can used
let users = {};
//used for when he won the match
let retailers = {};
//TransactionId
let transactions = {};
let andarBaharResult = 52;
let adminPer = 90;
io.on("connection", (socket) => {
  //Join Event When Application is Start
  socket.on("join", async ({ token, gameName }) => {
    console.log(token);
    let user = await getUserInfoBytoken(token);
    let numbers = await getLastrecord(gameName, user._id);
    let gameData = await getCurrentBetData(gameName, user._id);
    users[socket.id] = gameName;
    retailers[user._id] = socket.id;
    socket.join(gameName);
    socket.emit("join", {
      data: {
        user,
        time: new Date().getTime() / 1000 - games[gameName].startTime,
        numbers: numbers.records,
        take: numbers.take,
        gameName,
        gameData,
      },
      en: "join",
      status: 1,
    });
  });

  socket.on(
    "placeBet",
    async ({ retailerId, gameName, position, betPoint, position2 }) => {
      const result = await placeBet(retailerId, gameName, position, betPoint);

      if (result != 0) {
        if (gameName == "parity") playParity(position, betPoint, result);
        else if (gameName == "andarBahar") {
          if (position.andar) {
            betPoint = betPoint - position.andar;
            games.andarBahar.adminBalance += (position.andar * adminPer) / 100;
            games.andarBahar.andar += position.andar;
            transactions.andarBahar = immutable.update(
              transactions.andarBahar,
              ["andar", result],
              (v) => (v ? v + position.andar * 2 : position.andar * 2)
            );
          }
          if (position.bahar) {
            betPoint = betPoint - position.bahar;
            games.andarBahar.adminBalance += (position.bahar * adminPer) / 100;
            games.andarBahar.bahar += position.bahar;
            transactions.andarBahar = immutable.update(
              transactions.andarBahar,
              ["bahar", result],
              (v) => (v ? v + position.bahar * 2 : position.bahar * 2)
            );
          }
          console.log("AndarBahar Transaction : ", transactions.andarBahar);
        }
        console.log(
          "Viju vinod Chopda before : ",
          games[gameName].adminBalance
        );

        if (betPoint)
          games[gameName].adminBalance += (betPoint * adminPer) / 100;

        console.log(
          "Viju vinod Chopda Admin balance is: ",
          games[gameName].adminBalance
        );
      }
    }
  );

  socket.on("leaveRoom", ({ gameName, userId }) => {
    socket.leave(gameName);
    delete users[socket.id];

    delete retailers[userId];
  });

  //Disconnect the users
  socket.on("disconnect", () => {
    socket.leave(users[socket.id]);
    delete users[socket.id];
    for (userId in retailers) {
      if (retailers[userId] == socket.id) delete retailers[userId];
    }
  });

  socket.on("beep", () => {
    socket.emit("boop", {
      data: {},
      status: 1,
    });
  });
});

setInterval(async () => {
  // if (new Date().getHours() > 7 && new Date().getHours() < 22) {

  if (new Date().getTime() / 1000 > games.parity.startTime + 60) {
    getResult("parity", 36);
  }

  if (new Date().getTime() / 1000 > games.andarBahar.startTime + 60) {
    getResult("andarBahar", 52);
    // getResultAndarBahar();
  }

  //Get Admin Percentage
  if (new Date().getMinutes() == 1) {
    let p = await getAdminPer();

    winningPercent = p.percent;
  }

  //}
}, 1000);
getResultAndarBahar = async () => {
  let result = 0;
  gameName = "andarBahar";

  if (andarBaharResult != 52) {
    if (games.andarBahar.andarBet != 0 || games.andarBahar.baharBet != 0) {
      //Get result
      console.log("Andar Bahar Admin Balance:", games.andarBahar.adminBalance);
      if (games.andarBahar.andarBet > games.andarBahar.baharBet) {
        if (games.andarBahar.andarBet < games.andarBahar.adminBalance) {
          games.andarBahar.adminBalance -= games.andarBahar.andarBet;
          result = andarBet;
        } else {
          games.andarBahar.adminBalance -= games.andarBahar.baharBet;
          result = baharBet;
        }
      } else {
        if (games.andarBahar.baharBet < games.andarBahar.adminBalance) {
          games.andarBahar.adminBalance -= games.andarBahar.baharBet;
          result = "bahar";
        } else {
          games.andarBahar.adminBalance -= games.andarBahar.andarBet;
          result = "andar";
        }
      }
    }
    console.log(
      "Andar Bahar After Admin Balance:",
      games.andarBahar.adminBalance
    );
    let pages = getPages(andarBaharResult);
    console.log("Pages : ", pages);
    let finalPages = getFlipPages(pages, result);
    console.log("Final Pahges : ", finalPages);
    result = finalPages.length % 2 == 0 ? "bahar" : "andar";
    io.in(gameName).emit("finalResult", {
      data: {
        gameName,
        data: result,
        pages: finalPages,
      },
      en: "finalResult",
      status: 1,
    });
    await payTransaction("andarBahar", result);
    // if (transactions.andarBahar != {})
    //   await updateAndarBahar(result)
    flushAndarBahar();
  }
};
flushAndarBahar = () => {
  transactions.andarBahar = {};
  games.andarBahar.andarBet = 0;
  games.andarBahar.baharBet = 0;
  andarBaharResult = 52;
};
//Get Flip Pages for andarBaharResult
getFlipPages = (pages, result) => {
  let randomNumbers = [];
  for (let i = 0; i < 52; i++) {
    let randomNumber = Math.floor(Math.random() * 52);
    while (randomNumbers.includes(randomNumber)) {
      randomNumber = Math.floor(Math.random() * 52);
    }
    randomNumbers[i] = randomNumber;
    if (pages.includes(randomNumber)) break;
  }
  if (result != 0)
    if (result == "andar") {
      if (randomNumbers.length % 2 != 0) return randomNumbers;
      else randomNumbers.shift();
    } else {
      if (randomNumbers.length % 2 == 0) return randomNumbers;
      else if (randomNumbers.length > 2) randomNumbers.shift();
      else randomNumbers.unshift(pages[0] + 1);
    }

  return randomNumbers;
};

//get all Pages

getPages = (page) => {
  page = parseInt(page);
  if (page > 38) return [page, page - 13, page - 26, page - 39];
  else if (page > 25) return [page, page + 13, page - 26, page - 13];
  else if (page > 12) return [page, page + 13, page + 26, page - 13];
  else return [page, page + 13, page + 26, page + 39];
};

getResult = async (gameName, stopNum) => {
  let result = "";
  games[gameName].startTime = new Date().getTime() / 1000;

  if (Object.keys(games[gameName].position).length != undefined) {
    console.log(gameName, "Solo    Before : ", games[gameName].position);
    let sortResult = sortObject(games[gameName].position);
    console.log(gameName, "After : ", sortResult);
    for (num of sortResult) {
      let value = Object.values(num)[0];
      let key = Object.keys(num)[0];
      if (value < games[gameName].adminBalance) {
        result = key;
      }
      if (value > games[gameName].adminBalance) {
        break;
      }
    }
  }

  if (result == "") {
    result = Math.round(Math.random() * stopNum);
  }

  let counter = 0;
  if (games[gameName].position[result])
    while (games[gameName].adminBalance < games[gameName].position[result]) {
      result = Math.round(Math.random() * stopNum);
      counter++;

      if (counter == 100) {
        result = Object.keys(games[gameName].position)[0];
        break;
      }
    }

  io.in(gameName).emit("result", {
    data: {
      gameName,
      data: result,
    },
    en: "result",
    status: 1,
  });

  if (games[gameName].position[result])
    games[gameName].adminBalance -= games[gameName].position[result];

  await addGameResult(gameName, result);

  if (gameName == "andarBahar") andarBaharResult = result;
  await payTransaction(gameName, result);

  // Pay Out of the winners

  flushAll(gameName);
  if (gameName == "andarBahar") getResultAndarBahar();
};

payTransaction = async (gameName, result) => {
  console.log(
    "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&",
    gameName,
    result,
    transactions[gameName]
  );
  if (transactions[gameName])
    if (transactions[gameName][result]) {
      for (let transId in transactions[gameName][result]) {
        console.log(
          "Result Price is :",
          transactions[gameName][result][transId]
        );
        let userId = await winGamePay(
          transactions[gameName][result][transId],
          transId,
          result,
          gameName
        );
        io.to(retailers[userId]).emit("res", {
          data: {
            gameName,
            data: { winAmount: transactions[gameName][result][transId] },
          },
          en: "winner",
          status: 1,
        });
      }
    }
};

sortObject = (entry) => {
  const sortKeysBy = function (obj, comparator) {
    var keys = _.sortBy(_.keys(obj), function (key) {
      return comparator ? comparator(obj[key], key) : key;
    });
    console.log(keys);
    return _.map(keys, function (key) {
      return { [key]: obj[key] };
    });
  };

  const sortable = sortKeysBy(entry, function (value, key) {
    return value;
  });

  return sortable;
};

flushAll = (gameName) => {
  games[gameName].position = {};
  transactions[gameName] = {};
};

playParity = (position, betPoint, result) => {
  if (position === "green" || position === "red" || position === "violet") {
    switch (position) {
      case "green":
        winAmount = betAmount - commission;
        for (let i = 0; i < 10; i++) {
          if (i === 5) {
            addValue(position, betPoint, result, 1.5);
          } else if (i % 2 === 1) {
            addValue(position, betPoint, result, 2);
          }
        }
        break;
      case "red":
        for (let i = 0; i < 10; i++) {
          if (i === 0) addValue(position, betPoint, result, 1.5);
          else if (i % 2 === 0) addValue(position, betPoint, result, 2);
        }
        break;
      case "violet":
        addValue(position, betPoint, result, 4.5);
        addValue(position, betPoint, result, 4.5);
        break;
      default:
        break;
    }
  } else {
    addValue(position, betPoint, result, 9);
  }
};

addValue = (pos, betPoint, result, x) => {
  games.position = immutable.update(games.position, [pos], (v) =>
    v ? v + betPoint * x : betPoint * x
  );
  transactions = immutable.update(transactions, [pos, result], (v) =>
    v ? v + betPoint * x : betPoint * x
  );
};
