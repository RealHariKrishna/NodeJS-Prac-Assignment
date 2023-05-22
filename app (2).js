const express = require("express");
const app = express();
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

app.use(express.json()); //middleware
const dbPath = path.join(__dirname, "covid19India.db");

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

const objectSnakeToCamel = (newObject) => {
  return {
    stateId: newObject.state_id,
    stateName: newObject.state_name,
    population: newObject.population,
  };
};

const districtSnakeToCamel = (newObject) => {
  return {
    districtId: newObject.district_id,
    districtName: newObject.district_name,
    stateId: newObject.state_id,
    cases: newObject.cases,
    cured: newObject.cured,
    active: newObject.active,
    deaths: newObject.deaths,
  };
};

const reportSnakeToCamelCase = (newObject) => {
  return {
    totalCases: newObject.cases,
    totalCured: newObject.cured,
    totalActive: newObject.active,
    totalDeaths: newObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const allStatesQuery = `
    select * from state order by state_id;`;
  const statesList = await db.all(allStatesQuery);
  const statesResult = statesList.map((eachObject) => {
    return objectSnakeToCamel(eachObject);
  });
  response.send(statesResult);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getState = `
    select * from state where state_id=${stateId};`;
  const newState = await db.get(getState);
  const stateResult = objectSnakeToCamel(newState);
  response.send(stateResult);
});

app.post("/districts/", async (request, response) => {
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

app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    select * from district where district_id=${districtId};`;
  const newDistrict = await db.get(getDistrictQuery);
  const districtResult = districtSnakeToCamel(newDistrict);
  response.send(districtResult);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    delete from district where district_id=${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
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
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateReportQuery = `
    select SUM(cases) as cases,
    SUM(cured) as cured,
    SUM(active) as active,
    SUM(deaths) as deaths from district where state_id=${stateId};`;
  const stateReport = await db.get(getStateReportQuery);
  const resultReport = reportSnakeToCamelCase(stateReport);
  response.send(resultReport);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetailsQuery = `
    select state_name from state join district 
    on state.state_id=district.state_id 
    where district.district_id=${districtId};`;
  const stateName = await db.get(stateDetailsQuery);
  response.send({ stateName: stateName.state_name });
});

module.exports = app;
