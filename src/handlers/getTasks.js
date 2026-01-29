const documentClient = require("../utils/database");

const TASKS_TABLE = process.env.TASKS_TABLE;

module.exports.handler = async (event) => {
      try{
          const params = {
              TableName: TASKS_TABLE
          }
          const data = await documentClient.scan(params).promise();
              return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
      }
      catch(err){
          console.error('DynamoDB error: ', err);
            return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
      }

}