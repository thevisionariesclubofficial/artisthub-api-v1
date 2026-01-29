# Configuration Management

## File Structure

```
resources/
├── Users.yaml              # Users DynamoDB table definition
├── Casting.yaml            # Casting/Jobs DynamoDB table definition
├── Cognito.yaml            # Cognito User Pool & Client configuration
├── Auth.yaml               # Auth handlers configuration (optional)
├── UserHandlers.yaml       # User handlers configuration (optional)
└── CastingHandlers.yaml    # Casting handlers configuration (optional)

serverless.yml             # Main Serverless Framework configuration
.env.example              # Environment variables template
```

## Configuration Files Explanation

### serverless.yml
**Purpose**: Main Serverless Framework configuration file

**Key Sections**:
- `provider`: AWS provider settings, environment variables, timeouts
- `functions`: All Lambda function definitions with IAM roles and events
- `resources`: CloudFormation resources (DynamoDB, Cognito)
- `custom`: Stage-specific configuration variables

**Important Variables**:
```yaml
# Global settings
- service: API name
- stage: dev/staging/prod (controls resource naming and behavior)
- region: AWS region
- runtime: Node.js version
- memorySize: Lambda memory (256MB recommended)
- timeout: Lambda timeout (60 seconds for API handlers)

# Logging
- logRetentionInDays: 7 days for dev, 14 for staging, 30 for prod

# CORS
- corsOrigins: Restricted per stage
  - dev: * (all origins)
  - staging: staging domain only
  - prod: production domain only
```

### resources/Users.yaml
**Purpose**: DynamoDB table for user profiles and account data

**Configuration**:
- **Billing**: Pay-per-request (scales automatically)
- **Encryption**: KMS encryption enabled
- **PITR**: Point-in-time recovery (enabled in staging/prod)
- **TTL**: Time-to-live on `expiresAt` attribute for soft deletes
- **Streams**: Enabled for event-driven processing

**Indexes**:
- **usernameIndex**: GSI for username lookups (used in login)
- **createdAtIndex**: GSI for time-based queries

### resources/Casting.yaml
**Purpose**: DynamoDB table for job listings and applications

**Configuration**:
- Similar to Users.yaml
- Additional GSI for recruiter ID filtering
- Tracks job creation dates for trending/recent jobs

**Indexes**:
- **recruiterIdIndex**: Filter jobs by recruiter
- **createdAtIndex**: Get recent jobs

### resources/Cognito.yaml
**Purpose**: User authentication and management

**Components**:
1. **CognitoUserPool**
   - Password policy: 12 chars, uppercase, lowercase, numbers, symbols
   - MFA: Optional (TOTP method)
   - Email verification: Required
   - Device tracking: Enabled

2. **CognitoUserPoolClient**
   - Auth flows: SRP recommended (no password directly)
   - Token validity: 1 hour access, 1 hour ID, 30 days refresh
   - Callback URLs: Stage-specific
   - Client secret: Enabled in staging/prod, disabled in dev

3. **CognitoUserPoolDomain**
   - Hosted auth UI at `https://{domain}.auth.{region}.amazoncognito.com`
   - Format: `${service}-auth-${stage}-${accountId}`

### resources/Auth.yaml (Optional)
**Purpose**: Organized auth handler definitions

**Contains**: signUp, signIn, confirmSignUp, resetPassword, etc.

**Benefit**: Separates concerns, makes serverless.yml more readable

### resources/UserHandlers.yaml (Optional)
**Purpose**: Organized user handler definitions

**Contains**: All 11 user CRUD handlers

### resources/CastingHandlers.yaml (Optional)
**Purpose**: Organized casting handler definitions

**Contains**: All 13 casting job handlers

## Stage-Specific Configuration

### Development (dev)
```yaml
stage: dev
logRetentionInDays: 7
pitr: false
corsOrigins: '*'
callbackUrl: http://localhost:3000/auth/callback
generateClientSecret: false
```
**Use Case**: Local development and testing

### Staging (staging)
```yaml
stage: staging
logRetentionInDays: 14
pitr: true
corsOrigins: https://staging.artisthub.local
callbackUrl: https://staging.artisthub.local/auth/callback
generateClientSecret: true
```
**Use Case**: Pre-production testing, load testing

### Production (prod)
```yaml
stage: prod
logRetentionInDays: 30
pitr: true
corsOrigins: https://artisthub.com
callbackUrl: https://artisthub.com/auth/callback
generateClientSecret: true
```
**Use Case**: Live user-facing environment

## Modifying Configurations

### To Change CORS Origins
Edit `serverless.yml`:
```yaml
custom:
  corsOrigins:
    dev: 'http://localhost:3000'
    staging: 'https://staging.example.com'
    prod: 'https://example.com'
```

### To Change DynamoDB Settings
Edit `resources/Users.yaml` or `resources/Casting.yaml`:
```yaml
Properties:
  BillingMode: PAY_PER_REQUEST  # or PROVISIONED for fixed capacity
  StreamSpecification:
    StreamViewType: NEW_AND_OLD_IMAGES  # Enable for event streams
  PointInTimeRecoverySpecification:
    PointInTimeRecoveryEnabled: true  # Enable backup
```

### To Change Lambda Configuration
Edit `serverless.yml` provider section:
```yaml
provider:
  memorySize: 512  # Increase if needed
  timeout: 120     # Increase for long-running operations
  logRetentionInDays: 30
```

### To Change Cognito Security
Edit `resources/Cognito.yaml`:
```yaml
PasswordPolicy:
  MinimumLength: 16  # Increase for higher security
  RequireSymbols: true
```

## IAM Permissions Model

### Per-Function IAM Roles
Each Lambda function has minimal, specific permissions:

```yaml
function:
  createUser:
    iamRoleStatements:
      - Effect: Allow
        Action:
          - dynamodb:PutItem      # Only what's needed
          - dynamodb:Query        # For GSI username check
        Resource:
          - !GetAtt UsersTable.Arn
          - !Sub '${UsersTable.Arn}/index/usernameIndex'
```

**Principle**: Least privilege - each function only has access to:
- Specific AWS actions (PutItem, not all DynamoDB)
- Specific resources (UsersTable, not all tables)
- Specific GSIs (usernameIndex, not all indexes)

### Global IAM Permissions
Provider-level permissions for CloudWatch Logs:
```yaml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - logs:CreateLogGroup
            - logs:CreateLogStream
            - logs:PutLogEvents
          Resource: "arn:aws:logs:${self:provider.region}:*:*"
```

## Secrets Management

### Not Stored in Config
- Database passwords
- API keys
- Private keys
- OAuth secrets

### Storage Options
1. **AWS Secrets Manager** (recommended)
   ```bash
   aws secretsmanager create-secret --name artisthub/db/password
   ```

2. **AWS Parameter Store** (for non-sensitive config)
   ```bash
   aws ssm put-parameter --name /artisthub/stage/api-key
   ```

3. **.env files** (development only, never commit)
   ```bash
   echo ".env" >> .gitignore
   ```

### Accessing in Handlers
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

const secret = await secretsManager.getSecretValue({
  SecretId: 'artisthub/db/password'
}).promise();
```

## Validation Checklist

Before deploying to production:
- [ ] All custom config values set for stage
- [ ] CORS origins don't include wildcards in prod
- [ ] Cognito callbacks are HTTPS
- [ ] Database PITR enabled in prod
- [ ] Encryption enabled for all tables
- [ ] IAM permissions follow least privilege
- [ ] Log retention set appropriately
- [ ] No secrets in configuration files
- [ ] Environment variables documented
- [ ] Resource naming includes stage

## Troubleshooting Configuration Issues

### "Unrecognized property" error
- Syntax error in YAML (check indentation)
- Remove deprecated properties (e.g., `cors: true` in events)

### "Invalid cross-stage reference"
- Ensure all referenced resources exist in current stage
- Use stage parameter in resource names

### "Access denied" errors
- Check IAM role statements
- Verify resource ARNs are correct
- Check table/GSI names match resource definitions

### "Table not found"
- Verify table name in handler matches configured name
- Check environment variable references
- Ensure table was created successfully
