const express = require("express");
const app = express();
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

app.use(express.json()); //middleware
const dbPath = path.join(__dirname, "todoApplication.db");

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

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
            select * from todo where 
            todo like '%${search_q}%' and status='${status}' and priority='${priority}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
            select * from todo where 
            todo like '%${search_q}%' and priority='${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
            select * from todo where 
            todo like '%${search_q}%' and status='${status}';`;
      break;
    default:
      getTodosQuery = `
        select * from todo where 
            todo like '%${search_q}%';`;
  }
  data = await db.all(getTodosQuery);
  response.send(data);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    select * from todo where id=${todoId};`;
  const singleTodo = await db.get(getTodoQuery);
  response.send(singleTodo);
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status } = request.body;
  const postTodoQuery = `
    insert into todo (id,todo,priority,status) 
    values (${id},'${todo}','${priority}','${status}');`;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
  }
  const previousTodoQuery = `
    select * from todo where id=${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
  } = request.body;

  const updateTodoQuery = `
    update todo set todo='${todo}',
    priority='${priority}',
    status='${status}' where id=${todoId}`;

  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    delete from todo where id=${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
