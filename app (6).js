const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/states/", authenticateToken, async (request, response) => {
  const allStatesQuery = `
    select * from state;`;
  const statesList = await db.all(allStatesQuery);
  const statesResult = statesList.map((eachObject) => {
    return convertStateDbObjectToResponseObject(eachObject);
  });
  response.send(statesResult);
});

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getState = `
    select * from state where state_id=${stateId};`;
  const newState = await db.get(getState);
  const stateResult = convertStateDbObjectToResponseObject(newState);
  response.send(stateResult);
});

app.get(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
    select * from district where district_id=${districtId};`;
    const newDistrict = await db.get(getDistrictQuery);
    const districtResult = convertDistrictDbObjectToResponseObject(newDistrict);
    response.send(districtResult);
  }
);

app.post("/districts/", authenticateToken, async (request, response) => {
  const createDistrict = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = createDistrict;
  const newDistrictQuery = `
    insert into district (district_name,state_id,cases,cured,active,deaths) 
    values ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const addDistrict = await db.run(newDistrictQuery);
  const districtId = addDistrict.lastId;
  response.send("District Successfully Added");
});

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
    delete from district where district_id=${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtDetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const updateDistrictQuery = `
  update district set 
  district_name='${districtName}',
  state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths}
   where district_id=${districtId};`;
    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateReportQuery = `
    select SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths) from district where state_id=${stateId};`;
    const stateReport = await db.get(getStateReportQuery);
    response.send({
      totalCases: stateReport["SUM(cases)"],
      totalCured: stateReport["SUM(cured)"],
      totalActive: stateReport["SUM(active)"],
      totalDeaths: stateReport["SUM(deaths)"],
    });
  }
);

module.exports = app;
