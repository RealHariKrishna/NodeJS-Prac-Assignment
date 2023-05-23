const express = require("express");
const app = express();
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

app.use(express.json()); //middleware
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.get("/players", async (request, response) => {
  const getPlayersQuery = `
    select player_id as playerId,
    player_name as playerName from player_details;`;
  const playersArray = await db.all(getPlayersQuery);
  response.send(playersArray);
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    select player_id as playerId,
    player_name as playerName from player_details 
    where player_id=${playerId};`;
  const player = await db.get(getPlayerQuery);
  response.send(player);
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
    update player_details 
    set player_name='${playerName}' 
    where player_id=${playerId};`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `
    select match_id as matchId,match,year from match_details 
    where match_id=${matchId};`;
  const matchDetails = await db.get(getMatchDetailsQuery);
  response.send(matchDetails);
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
    select match_id as matchId,match,year from 
    player_match_score natural join match_details where 
    player_id=${playerId};`;
  const playerMatchesArray = await db.all(getPlayerMatchesQuery);
  response.send(playerMatchesArray);
});

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayers = `
    select 
    player_match_score.player_id as playerId,
    player_name as playerName 
    from player_details inner join player_match_score on 
    player_details.player_id=player_match_score.player_id 
    where match_id=${matchId};`;
  const matchPlayers = await db.all(getMatchPlayers);
  response.send(matchPlayers);
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoreQuery = `
    select 
    player_details.player_id as playerId,
    player_details.player_name as playerName,
    SUM(player_match_score.score) as totalScore,
    SUM(fours) as totalFours,
    SUM(sixes) as totalSixes
    from player_details inner join player_match_score on 
    player_details.player_id=player_match_score.player_id 
    where player_details.player_id=${playerId};`;
  const playerScores = await db.get(getPlayerScoreQuery);
  response.send(playerScores);
});

module.exports = app;
