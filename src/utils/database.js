const dynamodb = require('aws-sdk/clients/dynamodb')
const documentClient = new dynamodb.DocumentClient({
    region: process.env.REGION || 'ap-south-1',
    maxRetries: 3,
    httpOptions: {
        timeout: 5000
    }   
})

module.exports = documentClient



