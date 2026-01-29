import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const documentClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION || 'ap-south-1',
  maxRetries: 3,
  httpOptions: {
    timeout: 5000
  }
});

const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Success response helper
 */
const successResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

/**
 * Error response helper
 */
const errorResponse = (statusCode, message, details = null) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({
    success: false,
    message,
    ...(details && { details }),
  }),
});

/**
 * Validate required fields
 */
const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  return missing.length === 0 ? null : missing;
};

/**
 * Create a new user
 * POST /users
 * Body: { username, email, basicDetails: { firstName, lastName, ... }, ... }
 */
export const createUser = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, email, basicDetails = {} } = body;

    // Validate required fields
    const missing = validateRequiredFields(body, ['username', 'email']);
    if (missing) {
      return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
    }

    const userId = uuidv4();
    const now = new Date().toISOString();

    // Check if username already exists
    const existingUser = await documentClient.query({
      TableName: USERS_TABLE,
      IndexName: 'usernameIndex',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      }
    }).promise();

    if (existingUser.Items && existingUser.Items.length > 0) {
      return errorResponse(409, 'Username already exists');
    }

    const user = {
      userId,
      username,
      email,
      privacy: body.privacy || 'public',
      currentPlan: body.currentPlan || 'free',
      view: 0,
      aboutMe: body.aboutMe || '',
      device_tokens: body.device_tokens || [],
      subscription: {
        activePlan: body.subscription?.activePlan || 'free',
        startDate: now,
        renewalDate: body.subscription?.renewalDate || null,
        status: 'active'
      },
      tokens: body.tokens || {
        AccessToken: '',
        RefreshToken: '',
        IdToken: ''
      },
      basicDetails: {
        firstName: basicDetails.firstName || '',
        lastName: basicDetails.lastName || '',
        fullName: basicDetails.fullName || '',
        avatarUrl: basicDetails.avatarUrl || '',
        gender: basicDetails.gender || '',
        category: basicDetails.category || [],
        birthDate: basicDetails.birthDate || null,
        age: basicDetails.age || null,
        city: basicDetails.city || ''
      },
      contactDetails: {
        email: body.contactDetails?.email || email,
        phone: body.contactDetails?.phone || '',
        instagram: body.contactDetails?.instagram || '',
        facebook: body.contactDetails?.facebook || '',
        twitter: body.contactDetails?.twitter || '',
        youtube: body.contactDetails?.youtube || ''
      },
      physicalStats: {
        height: body.physicalStats?.height || '',
        weight: body.physicalStats?.weight || '',
        bust: body.physicalStats?.bust || '',
        waist: body.physicalStats?.waist || '',
        hips: body.physicalStats?.hips || '',
        chest: body.physicalStats?.chest || '',
        biceps: body.physicalStats?.biceps || '',
        hairType: body.physicalStats?.hairType || '',
        hairLength: body.physicalStats?.hairLength || ''
      },
      skills: {
        languages: body.skills?.languages || [],
        expertise: body.skills?.expertise || [],
        hobbies: body.skills?.hobbies || []
      },
      workExperience: body.workExperience || [],
      portfolio: body.portfolio || [],
      appliedJobs: body.appliedJobs || [],
      requestSent: body.requestSent || [],
      requestReceived: body.requestReceived || [],
      connections: body.connections || [],
      createdAt: now,
      updatedAt: now
    };

    const params = {
      TableName: USERS_TABLE,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)'
    };

    await documentClient.put(params).promise();

    return successResponse(201, {
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('CreateUser error:', error);

    if (error.code === 'ConditionalCheckFailedException') {
      return errorResponse(409, 'User already exists');
    }

    return errorResponse(500, 'Failed to create user', error.message);
  }
};

/**
 * Get user by userId
 * GET /users/{userId}
 */
export const getUserById = async (event) => {
  try {
    const { userId } = event.pathParameters;

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    const params = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const result = await documentClient.get(params).promise();

    if (!result.Item) {
      return errorResponse(404, 'User not found');
    }

    return successResponse(200, {
      success: true,
      user: result.Item
    });
  } catch (error) {
    console.error('GetUserById error:', error);
    return errorResponse(500, 'Failed to fetch user', error.message);
  }
};

/**
 * Get user by username
 * GET /users/username/{username}
 */
export const getUserByUsername = async (event) => {
  try {
    const { username } = event.pathParameters;

    if (!username) {
      return errorResponse(400, 'Missing required parameter: username');
    }

    const params = {
      TableName: USERS_TABLE,
      IndexName: 'usernameIndex',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      }
    };

    const result = await documentClient.query(params).promise();

    if (!result.Items || result.Items.length === 0) {
      return errorResponse(404, 'User not found');
    }

    return successResponse(200, {
      success: true,
      user: result.Items[0]
    });
  } catch (error) {
    console.error('GetUserByUsername error:', error);
    return errorResponse(500, 'Failed to fetch user', error.message);
  }
};

/**
 * Update user
 * PUT /users/{userId}
 * Body: { username, email, basicDetails, contactDetails, ... }
 */
export const updateUser = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    // Check if user exists
    const existingUser = await documentClient.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!existingUser.Item) {
      return errorResponse(404, 'User not found');
    }

    // If username is being updated, check for uniqueness
    if (body.username && body.username !== existingUser.Item.username) {
      const usernameExists = await documentClient.query({
        TableName: USERS_TABLE,
        IndexName: 'usernameIndex',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
          ':username': body.username
        }
      }).promise();

      if (usernameExists.Items && usernameExists.Items.length > 0) {
        return errorResponse(409, 'Username already exists');
      }
    }

    const now = new Date().toISOString();
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Build dynamic update expression
    const updateableFields = [
      'username', 'email', 'privacy', 'currentPlan', 'view', 'aboutMe',
      'device_tokens', 'subscription', 'tokens', 'basicDetails',
      'contactDetails', 'physicalStats', 'skills', 'workExperience',
      'portfolio', 'appliedJobs', 'requestSent', 'requestReceived', 'connections'
    ];

    updateableFields.forEach(field => {
      if (body[field] !== undefined) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    // Always update updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    if (updateExpressions.length === 0) {
      return errorResponse(400, 'No fields to update');
    }

    const params = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(200, {
      success: true,
      message: 'User updated successfully',
      user: result.Attributes
    });
  } catch (error) {
    console.error('UpdateUser error:', error);
    return errorResponse(500, 'Failed to update user', error.message);
  }
};

/**
 * Delete user
 * DELETE /users/{userId}
 */
export const deleteUser = async (event) => {
  try {
    const { userId } = event.pathParameters;

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    // Check if user exists
    const existingUser = await documentClient.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!existingUser.Item) {
      return errorResponse(404, 'User not found');
    }

    const params = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    await documentClient.delete(params).promise();

    return successResponse(200, {
      success: true,
      message: 'User deleted successfully',
      deletedUserId: userId
    });
  } catch (error) {
    console.error('DeleteUser error:', error);
    return errorResponse(500, 'Failed to delete user', error.message);
  }
};

/**
 * List all users with pagination
 * GET /users?limit=10&lastKey={lastKey}
 */
export const listUsers = async (event) => {
  try {
    const { limit = 10, lastKey } = event.queryStringParameters || {};

    const params = {
      TableName: USERS_TABLE,
      Limit: parseInt(limit, 10)
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
    }

    const result = await documentClient.scan(params).promise();

    return successResponse(200, {
      success: true,
      items: result.Items,
      count: result.Items.length,
      lastKey: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    });
  } catch (error) {
    console.error('ListUsers error:', error);
    return errorResponse(500, 'Failed to fetch users', error.message);
  }
};

/**
 * Update user view count
 * PUT /users/{userId}/view
 */
export const incrementUserView = async (event) => {
  try {
    const { userId } = event.pathParameters;

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    const params = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #view = if_not_exists(#view, :zero) + :inc, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#view': 'view',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(200, {
      success: true,
      message: 'User view incremented',
      view: result.Attributes.view
    });
  } catch (error) {
    console.error('IncrementUserView error:', error);
    return errorResponse(500, 'Failed to update user view', error.message);
  }
};

/**
 * Add work experience
 * POST /users/{userId}/work-experience
 * Body: { workType, brand, workLink, verified }
 */
export const addWorkExperience = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { workType, brand, workLink, verified = false } = body;

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    const missing = validateRequiredFields(body, ['workType', 'brand']);
    if (missing) {
      return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await documentClient.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!existingUser.Item) {
      return errorResponse(404, 'User not found');
    }

    const workExperienceId = uuidv4();
    const newWork = {
      id: workExperienceId,
      workType,
      brand,
      verified,
      workLink: workLink || '',
      createdAt: new Date().toISOString()
    };

    const params = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #workExp = list_append(if_not_exists(#workExp, :empty), :work), #updatedAt = :now',
      ExpressionAttributeNames: {
        '#workExp': 'workExperience',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':empty': [],
        ':work': [newWork],
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(201, {
      success: true,
      message: 'Work experience added',
      workExperience: newWork,
      user: result.Attributes
    });
  } catch (error) {
    console.error('AddWorkExperience error:', error);
    return errorResponse(500, 'Failed to add work experience', error.message);
  }
};

/**
 * Add portfolio item
 * POST /users/{userId}/portfolio
 * Body: { url, type, selected }
 */
export const addPortfolioItem = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { url, type, selected = false } = body;

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    const missing = validateRequiredFields(body, ['url', 'type']);
    if (missing) {
      return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await documentClient.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!existingUser.Item) {
      return errorResponse(404, 'User not found');
    }

    const portfolioId = uuidv4();
    const newPortfolio = {
      id: portfolioId,
      url,
      type,
      selected,
      uploadedAt: new Date().toISOString()
    };

    const params = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #portfolio = list_append(if_not_exists(#portfolio, :empty), :item), #updatedAt = :now',
      ExpressionAttributeNames: {
        '#portfolio': 'portfolio',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':empty': [],
        ':item': [newPortfolio],
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(201, {
      success: true,
      message: 'Portfolio item added',
      portfolioItem: newPortfolio,
      user: result.Attributes
    });
  } catch (error) {
    console.error('AddPortfolioItem error:', error);
    return errorResponse(500, 'Failed to add portfolio item', error.message);
  }
};

/**
 * Add connection
 * POST /users/{userId}/connections
 * Body: { senderId, receiverId }
 */
export const addConnection = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { senderId, receiverId } = body;

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    const missing = validateRequiredFields(body, ['senderId', 'receiverId']);
    if (missing) {
      return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await documentClient.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!existingUser.Item) {
      return errorResponse(404, 'User not found');
    }

    const connectionId = uuidv4();
    const newConnection = {
      connectionId,
      senderId,
      receiverId,
      chatId: uuidv4(),
      connectionStatus: 'pending',
      connectedAt: new Date().toISOString()
    };

    const params = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #connections = list_append(if_not_exists(#connections, :empty), :connection), #updatedAt = :now',
      ExpressionAttributeNames: {
        '#connections': 'connections',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':empty': [],
        ':connection': [newConnection],
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(201, {
      success: true,
      message: 'Connection added',
      connection: newConnection,
      user: result.Attributes
    });
  } catch (error) {
    console.error('AddConnection error:', error);
    return errorResponse(500, 'Failed to add connection', error.message);
  }
};

/**
 * Search users by category or skills
 * GET /users/search?q=query&type=category
 */
export const searchUsers = async (event) => {
  try {
    const { q, type = 'category', limit = 10 } = event.queryStringParameters || {};

    if (!q) {
      return errorResponse(400, 'Missing required parameter: q');
    }

    // Since DynamoDB doesn't have full-text search, we scan and filter
    // For production, consider using Elasticsearch or DynamoDB Query with GSI
    let filterExpression;
    const expressionAttributeValues = { ':q': q };
    const expressionAttributeNames = {};

    if (type === 'category') {
      filterExpression = 'contains(basicDetails.#category, :q)';
      expressionAttributeNames['#category'] = 'category';
    } else if (type === 'skills') {
      filterExpression = 'contains(#skills.#expertise, :q) OR contains(#skills.#languages, :q)';
      expressionAttributeNames['#skills'] = 'skills';
      expressionAttributeNames['#expertise'] = 'expertise';
      expressionAttributeNames['#languages'] = 'languages';
    } else if (type === 'username') {
      filterExpression = 'contains(username, :q)';
    } else {
      return errorResponse(400, 'Invalid search type. Use: category, skills, or username');
    }

    const params = {
      TableName: USERS_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: parseInt(limit, 10)
    };

    // Only add ExpressionAttributeNames if there are any
    if (Object.keys(expressionAttributeNames).length > 0) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await documentClient.scan(params).promise();

    return successResponse(200, {
      success: true,
      query: q,
      type,
      count: result.Items.length,
      items: result.Items
    });
  } catch (error) {
    console.error('SearchUsers error:', error);
    return errorResponse(500, 'Failed to search users', error.message);
  }
};
