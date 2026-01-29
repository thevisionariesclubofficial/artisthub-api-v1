const documentClient = require("../utils/database");

const TASKS_TABLE = process.env.TASKS_TABLE;

module.exports.handler = async (event) => {
    const data = JSON.parse(event.body);
    try{
        const params = {
            TableName: TASKS_TABLE,
            Item: {
                id: data.id,
                title: data.title,
                description: data.description
            },
            ConditionExpression: 'attribute_not_exists(id)'
        }
        await documentClient.put(params).promise();
    }
    catch(err){
        console.error('DynamoDB error: ', err);
          return {
    statusCode: 500,
    body: JSON.stringify(err),
  };
    }
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}