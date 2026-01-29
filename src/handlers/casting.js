import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const documentClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION || 'ap-south-1',
  maxRetries: 3,
  httpOptions: {
    timeout: 5000
  }
});

const CASTING_TABLE = process.env.CASTING_TABLE;

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
 * Create a new casting job
 * POST /casting
 * Body: { userId, jobTitle, jobDescription, jobCategory, jobType, jobLocation, ... }
 */
export const createJob = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const {
      userId,
      jobTitle,
      jobDescription,
      jobCategory,
      jobType,
      jobLocation = [],
      tags = [],
      imageUrl,
      expiryDate,
      recruiter = [],
      requirements = [],
      documents = []
    } = body;

    // Validate required fields
    const missing = validateRequiredFields(body, ['userId', 'jobTitle', 'jobDescription', 'jobCategory', 'jobType']);
    if (missing) {
      return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Validate enum values
    const validCategories = ['Acting', 'Singing', 'Dancing', 'Modeling', 'Writing', 'Editing', 'Photography', 'Makeup', 'Voice Acting', 'Comedy', 'Production', 'Design'];
    if (!validCategories.includes(jobCategory)) {
      return errorResponse(400, `Invalid jobCategory. Must be one of: ${validCategories.join(', ')}`);
    }

    const validJobTypes = ['Online', 'Offline'];
    if (!validJobTypes.includes(jobType)) {
      return errorResponse(400, 'Invalid jobType. Must be Online or Offline');
    }

    const jobId = uuidv4();
    const now = new Date().toISOString();

    const job = {
      jobId,
      userId,
      jobTitle,
      jobDescription,
      jobCategory,
      jobType,
      jobLocation,
      tags,
      view: 0,
      verified: false,
      isExpired: false,
      isCollab: body.isCollab || false,
      isWishlisted: false,
      imageUrl: imageUrl || '',
      expiryDate: expiryDate || null,
      applicationStatus: 0,
      appliedBy: [],
      recruiter,
      requirements,
      documents,
      createdAt: now,
      updatedAt: now
    };

    const params = {
      TableName: CASTING_TABLE,
      Item: job,
      ConditionExpression: 'attribute_not_exists(jobId)'
    };

    await documentClient.put(params).promise();

    return successResponse(201, {
      success: true,
      message: 'Casting job created successfully',
      job
    });
  } catch (error) {
    console.error('CreateJob error:', error);

    if (error.code === 'ConditionalCheckFailedException') {
      return errorResponse(409, 'Job already exists');
    }

    return errorResponse(500, 'Failed to create job', error.message);
  }
};

/**
 * Get job by jobId
 * GET /casting/{jobId}
 */
export const getJobById = async (event) => {
  try {
    const { jobId } = event.pathParameters;

    if (!jobId) {
      return errorResponse(400, 'Missing required parameter: jobId');
    }

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId }
    };

    const result = await documentClient.get(params).promise();

    if (!result.Item) {
      return errorResponse(404, 'Job not found');
    }

    return successResponse(200, {
      success: true,
      job: result.Item
    });
  } catch (error) {
    console.error('GetJobById error:', error);
    return errorResponse(500, 'Failed to fetch job', error.message);
  }
};

/**
 * List all casting jobs with pagination
 * GET /casting?limit=10&lastKey={lastKey}&category=Acting
 */
export const listJobs = async (event) => {
  try {
    const { limit = 10, lastKey, category } = event.queryStringParameters || {};

    const params = {
      TableName: CASTING_TABLE,
      Limit: parseInt(limit, 10)
    };

    // If category filter is provided, add FilterExpression
    if (category) {
      params.FilterExpression = 'jobCategory = :category';
      params.ExpressionAttributeValues = {
        ':category': category
      };
    }

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
    console.error('ListJobs error:', error);
    return errorResponse(500, 'Failed to fetch jobs', error.message);
  }
};

/**
 * Update casting job
 * PUT /casting/{jobId}
 * Body: { jobTitle, jobDescription, jobCategory, jobType, ... }
 */
export const updateJob = async (event) => {
  try {
    const { jobId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');

    if (!jobId) {
      return errorResponse(400, 'Missing required parameter: jobId');
    }

    // Check if job exists
    const existingJob = await documentClient.get({
      TableName: CASTING_TABLE,
      Key: { jobId }
    }).promise();

    if (!existingJob.Item) {
      return errorResponse(404, 'Job not found');
    }

    const now = new Date().toISOString();
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Build dynamic update expression
    const updateableFields = [
      'jobTitle', 'jobDescription', 'jobCategory', 'jobType', 'jobLocation',
      'tags', 'view', 'verified', 'isExpired', 'isCollab', 'isWishlisted',
      'imageUrl', 'expiryDate', 'applicationStatus', 'appliedBy', 'recruiter',
      'requirements', 'documents'
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
      TableName: CASTING_TABLE,
      Key: { jobId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(200, {
      success: true,
      message: 'Job updated successfully',
      job: result.Attributes
    });
  } catch (error) {
    console.error('UpdateJob error:', error);
    return errorResponse(500, 'Failed to update job', error.message);
  }
};

/**
 * Delete casting job
 * DELETE /casting/{jobId}
 */
export const deleteJob = async (event) => {
  try {
    const { jobId } = event.pathParameters;

    if (!jobId) {
      return errorResponse(400, 'Missing required parameter: jobId');
    }

    // Check if job exists
    const existingJob = await documentClient.get({
      TableName: CASTING_TABLE,
      Key: { jobId }
    }).promise();

    if (!existingJob.Item) {
      return errorResponse(404, 'Job not found');
    }

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId }
    };

    await documentClient.delete(params).promise();

    return successResponse(200, {
      success: true,
      message: 'Job deleted successfully',
      deletedJobId: jobId
    });
  } catch (error) {
    console.error('DeleteJob error:', error);
    return errorResponse(500, 'Failed to delete job', error.message);
  }
};

/**
 * Apply for a casting job
 * POST /casting/{jobId}/apply
 * Body: { userId, avatarUrl }
 */
export const applyForJob = async (event) => {
  try {
    const { jobId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { userId, avatarUrl } = body;

    if (!jobId) {
      return errorResponse(400, 'Missing required parameter: jobId');
    }

    const missing = validateRequiredFields(body, ['userId']);
    if (missing) {
      return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Check if job exists
    const existingJob = await documentClient.get({
      TableName: CASTING_TABLE,
      Key: { jobId }
    }).promise();

    if (!existingJob.Item) {
      return errorResponse(404, 'Job not found');
    }

    // Check if user already applied
    const alreadyApplied = existingJob.Item.appliedBy?.some(app => app.userId === userId);
    if (alreadyApplied) {
      return errorResponse(409, 'You have already applied for this job');
    }

    const appId = uuidv4();
    const newApplication = {
      userId,
      appId,
      avatarUrl: avatarUrl || ''
    };

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId },
      UpdateExpression: 'SET #appliedBy = list_append(if_not_exists(#appliedBy, :empty), :application), #updatedAt = :now',
      ExpressionAttributeNames: {
        '#appliedBy': 'appliedBy',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':empty': [],
        ':application': [newApplication],
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(201, {
      success: true,
      message: 'Application submitted successfully',
      application: newApplication,
      job: result.Attributes
    });
  } catch (error) {
    console.error('ApplyForJob error:', error);
    return errorResponse(500, 'Failed to apply for job', error.message);
  }
};

/**
 * Get all applications for a job
 * GET /casting/{jobId}/applications
 */
export const getJobApplications = async (event) => {
  try {
    const { jobId } = event.pathParameters;

    if (!jobId) {
      return errorResponse(400, 'Missing required parameter: jobId');
    }

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId }
    };

    const result = await documentClient.get(params).promise();

    if (!result.Item) {
      return errorResponse(404, 'Job not found');
    }

    return successResponse(200, {
      success: true,
      jobId,
      applications: result.Item.appliedBy || [],
      count: (result.Item.appliedBy || []).length
    });
  } catch (error) {
    console.error('GetJobApplications error:', error);
    return errorResponse(500, 'Failed to fetch applications', error.message);
  }
};

/**
 * Update application status
 * PUT /casting/{jobId}/applications/{userId}
 * Body: { status } (1 = Applied, 2 = Shortlisted)
 */
export const updateApplicationStatus = async (event) => {
  try {
    const { jobId, userId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { status } = body;

    if (!jobId || !userId) {
      return errorResponse(400, 'Missing required parameters: jobId, userId');
    }

    if (![1, 2].includes(parseInt(status, 10))) {
      return errorResponse(400, 'Invalid status. Must be 1 (Applied) or 2 (Shortlisted)');
    }

    // Get the job
    const job = await documentClient.get({
      TableName: CASTING_TABLE,
      Key: { jobId }
    }).promise();

    if (!job.Item) {
      return errorResponse(404, 'Job not found');
    }

    // Find and update the application
    const appliedBy = job.Item.appliedBy || [];
    const appIndex = appliedBy.findIndex(app => app.userId === userId);

    if (appIndex === -1) {
      return errorResponse(404, 'Application not found');
    }

    // Update the application status in the array
    appliedBy[appIndex].status = status;

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId },
      UpdateExpression: 'SET #appliedBy = :appliedBy, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#appliedBy': 'appliedBy',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':appliedBy': appliedBy,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(200, {
      success: true,
      message: 'Application status updated',
      job: result.Attributes
    });
  } catch (error) {
    console.error('UpdateApplicationStatus error:', error);
    return errorResponse(500, 'Failed to update application status', error.message);
  }
};

/**
 * Increment job view count
 * PUT /casting/{jobId}/view
 */
export const incrementJobView = async (event) => {
  try {
    const { jobId } = event.pathParameters;

    if (!jobId) {
      return errorResponse(400, 'Missing required parameter: jobId');
    }

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId },
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
      message: 'Job view incremented',
      view: result.Attributes.view
    });
  } catch (error) {
    console.error('IncrementJobView error:', error);
    return errorResponse(500, 'Failed to update job view', error.message);
  }
};

/**
 * Add document to casting job
 * POST /casting/{jobId}/documents
 * Body: { url, type }
 */
export const addDocument = async (event) => {
  try {
    const { jobId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { url, type } = body;

    if (!jobId) {
      return errorResponse(400, 'Missing required parameter: jobId');
    }

    const missing = validateRequiredFields(body, ['url', 'type']);
    if (missing) {
      return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
    }

    const validTypes = ['pdf', 'image', 'video', 'script'];
    if (!validTypes.includes(type)) {
      return errorResponse(400, `Invalid document type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check if job exists
    const existingJob = await documentClient.get({
      TableName: CASTING_TABLE,
      Key: { jobId }
    }).promise();

    if (!existingJob.Item) {
      return errorResponse(404, 'Job not found');
    }

    const docId = uuidv4();
    const newDocument = {
      id: docId,
      url,
      type
    };

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId },
      UpdateExpression: 'SET #documents = list_append(if_not_exists(#documents, :empty), :document), #updatedAt = :now',
      ExpressionAttributeNames: {
        '#documents': 'documents',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':empty': [],
        ':document': [newDocument],
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(201, {
      success: true,
      message: 'Document added',
      document: newDocument,
      job: result.Attributes
    });
  } catch (error) {
    console.error('AddDocument error:', error);
    return errorResponse(500, 'Failed to add document', error.message);
  }
};

/**
 * Remove document from casting job
 * DELETE /casting/{jobId}/documents/{docId}
 */
export const removeDocument = async (event) => {
  try {
    const { jobId, docId } = event.pathParameters;

    if (!jobId || !docId) {
      return errorResponse(400, 'Missing required parameters: jobId, docId');
    }

    // Get the job
    const job = await documentClient.get({
      TableName: CASTING_TABLE,
      Key: { jobId }
    }).promise();

    if (!job.Item) {
      return errorResponse(404, 'Job not found');
    }

    // Filter out the document
    const documents = (job.Item.documents || []).filter(doc => doc.id !== docId);

    if (documents.length === job.Item.documents?.length) {
      return errorResponse(404, 'Document not found');
    }

    const params = {
      TableName: CASTING_TABLE,
      Key: { jobId },
      UpdateExpression: 'SET #documents = :documents, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#documents': 'documents',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':documents': documents,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await documentClient.update(params).promise();

    return successResponse(200, {
      success: true,
      message: 'Document removed',
      job: result.Attributes
    });
  } catch (error) {
    console.error('RemoveDocument error:', error);
    return errorResponse(500, 'Failed to remove document', error.message);
  }
};

/**
 * Get all applications by a user
 * GET /casting/user/{userId}/applications
 */
export const getUserApplications = async (event) => {
  try {
    const { userId } = event.pathParameters;

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    // Scan all jobs and filter for user's applications
    const params = {
      TableName: CASTING_TABLE,
      FilterExpression: 'contains(#appliedBy, :userId)',
      ExpressionAttributeNames: {
        '#appliedBy': 'appliedBy'
      },
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    const result = await documentClient.scan(params).promise();

    // Extract user applications from jobs
    const userApplications = [];
    result.Items.forEach(job => {
      const userApps = (job.appliedBy || []).filter(app => app.userId === userId);
      userApps.forEach(app => {
        userApplications.push({
          ...app,
          jobId: job.jobId,
          jobTitle: job.jobTitle,
          jobCategory: job.jobCategory
        });
      });
    });

    return successResponse(200, {
      success: true,
      userId,
      applications: userApplications,
      count: userApplications.length
    });
  } catch (error) {
    console.error('GetUserApplications error:', error);
    return errorResponse(500, 'Failed to fetch user applications', error.message);
  }
};

/**
 * Search casting jobs
 * GET /casting/search?q=query&type=category
 */
export const searchJobs = async (event) => {
  try {
    const { q, type = 'category', limit = 10 } = event.queryStringParameters || {};

    if (!q) {
      return errorResponse(400, 'Missing required parameter: q');
    }

    let filterExpression;
    const expressionAttributeValues = { ':q': q };
    const expressionAttributeNames = {};

    if (type === 'category') {
      filterExpression = 'jobCategory = :q';
    } else if (type === 'title') {
      filterExpression = 'contains(jobTitle, :q)';
    } else if (type === 'location') {
      filterExpression = 'contains(jobLocation, :q)';
    } else if (type === 'tags') {
      filterExpression = 'contains(tags, :q)';
    } else {
      return errorResponse(400, 'Invalid search type. Use: category, title, location, or tags');
    }

    const params = {
      TableName: CASTING_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: parseInt(limit, 10)
    };

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
    console.error('SearchJobs error:', error);
    return errorResponse(500, 'Failed to search jobs', error.message);
  }
};
