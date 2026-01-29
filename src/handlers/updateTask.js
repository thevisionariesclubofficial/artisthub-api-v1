const { title } = require("node:process");
const documentClient = require("../utils/database");

const TASKS_TABLE = process.env.TASKS_TABLE;

module.exports.handler = async (event) => {
    const id = Number.parseInt(event.pathParameters?.id);
    const data = JSON.parse(event.body);
    try{
        const params = {
            TableName: TASKS_TABLE,
            Key: {
                id
            },
            UpdateExpression: 'set #title = :title, #description = :description',
            ExpressionAttributeNames: {
                '#title': 'title',
                '#description': 'description'
            },
            ExpressionAttributeValues: {
                ':title': data.title,
                ':description': data.description
            },
            ConditionExpression: 'attribute_exists(id)'
        }
        await documentClient.update(params).promise();
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