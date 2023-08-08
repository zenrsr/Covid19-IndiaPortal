const express = require("express");
const app = express();
app.use(express.json());

const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const camelCase = (obj) => {
  var newObj = {};
  for (d in obj) {
    if (obj.hasOwnProperty(d)) {
      newObj[
        d.replace(/(\_\w)/g, function (k) {
          return k[1].toUpperCase();
        })
      ] = obj[d];
    }
  }
  return newObj;
};

const initialize = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3010, () => {
      console.log("Server running at http://localhost/3010/");
    });
  } catch (e) {
    console.log(`${e.message}`);
  }
};
initialize();
const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader === undefined) {
    response.send(401);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = authHeader.split(" ")[1];
    jwt.verify(jwtToken, "secret_key", async (error, payload) => {
      if (error) {
        response.send(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// Login
app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const userQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const dbUser = await db.get(userQuery);
    if (dbUser === undefined) {
      response.status(400).send("Invalid User");
    } else {
      const match = await bcrypt.compare(password, dbUser.password);
      if (match == true) {
        const payload = { username: username };
        const jwtToken = await jwt.sign(payload, "secret_key");
        response.send({ jwtToken });
      } else {
        response.status(400).send("Invalid password");
      }
    }
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// API 2
app.get("/states/", authenticateToken, async (request, response) => {
  try {
    const getQuery = `SELECT * FROM state;`;
    const x = await db.all(getQuery);
    response.send(x.map((each) => camelCase(each)));
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// API 3
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  try {
    const { stateId } = request.params;
    const getQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
    const x = await db.get(getQuery);
    response.send(camelCase(x));
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// API 4
app.post("/districts/", authenticateToken, async (request, response) => {
  try {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const getQuery = `INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES 
    (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
    const x = await db.run(getQuery);
    console.log(`districtId : ${x.lastID}`);
    response.send("District Successfully Added");
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// API 5
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    try {
      const { districtId } = request.params;
      const getQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
      const x = await db.get(getQuery);
      response.send(camelCase(x));
    } catch (e) {
      console.log(`${e.message}`);
    }
  }
);

// API 6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    try {
      const { districtId } = request.params;
      const getQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
      await db.run(getQuery);
      response.send("District Removed");
    } catch (e) {
      console.log(`${e.message}`);
    }
  }
);

// API 7
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    try {
      const { districtId } = request.params;
      const {
        districtName,
        stateId,
        cases,
        cured,
        active,
        deaths,
      } = request.body;
      const getQuery = `UPDATE district 
      SET 
      district_name = '${districtName}',
      state_id = '${stateId}',
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
      WHERE 
      district_id = ${districtId};`;
      await db.run(getQuery);
      response.send("District Details Updated");
    } catch (e) {
      console.log(`${e.message}`);
    }
  }
);

// API 8
app.get(
  "states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    try {
      const { stateId } = request.params;
      const getQuery = `
        SELECT SUM(cases) as totalCases, SUM(cured) as totalCured, SUM(active) as totalActive, 
        SUM(deaths) as totalDeaths FROM district WHERE state_id = ${stateId};`;
      const stats = await db.get(getQuery);
      response.send(stats);
    } catch (e) {
      console.log(`${e.message}`);
    }
  }
);

module.exports = app;
