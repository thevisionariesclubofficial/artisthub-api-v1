# Production Deployment Guide

## Overview
This guide covers production-ready deployment and configuration of the ArtistHub API using Serverless Framework.

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Create AWS account with appropriate IAM roles and policies
- [ ] Configure AWS CLI credentials: `aws configure`
- [ ] Verify AWS region: `ap-south-1` (can be overridden with `--region` flag)

### 2. Secrets Management
- [ ] Store sensitive configuration in AWS Secrets Manager
- [ ] Never commit credentials to version control
- [ ] Use parameter store for non-sensitive config

### 3. Database Configuration
- [ ] Production: Point-in-Time Recovery (PITR) enabled
- [ ] Backup strategy: Daily snapshots
- [ ] Encryption: KMS encryption enabled on DynamoDB tables
- [ ] DynamoDB Streams enabled for event-driven architecture

### 4. Authentication Security
- [ ] Cognito password policy: Minimum 12 characters with symbols
- [ ] MFA enabled for user accounts
- [ ] Email verification required
- [ ] Token expiration: AccessToken 1 hour, IdToken 1 hour, RefreshToken 30 days
- [ ] Callback URLs configured for production domain
- [ ] CORS origins restricted to production domain

### 5. API Security
- [ ] JWT authorization enforced on protected endpoints
- [ ] Rate limiting configured (optional: API Gateway throttling)
- [ ] CORS headers properly configured
- [ ] Request validation enabled
- [ ] Input sanitization implemented in handlers

## Deployment Process

### Development Deployment
```bash
sls deploy --stage dev --region ap-south-1
```

### Staging Deployment
```bash
sls deploy --stage staging --region ap-south-1
```

### Production Deployment
```bash
sls deploy --stage prod --region ap-south-1
```

## Stage-Specific Configuration

### Development (dev)
- CORS: Allows all origins (`*`)
- Callback URL: `http://localhost:3000/auth/callback`
- Log Retention: 7 days
- PITR: Disabled
- Client Secret: Not generated
- Memory: 256 MB
- Timeout: 60 seconds

### Staging (staging)
- CORS: Restricted to staging domain
- Callback URL: `https://staging.artisthub.local/auth/callback`
- Log Retention: 14 days
- PITR: Enabled
- Client Secret: Generated
- Memory: 256 MB
- Timeout: 60 seconds

### Production (prod)
- CORS: Restricted to production domain only
- Callback URL: `https://artisthub.com/auth/callback`
- Log Retention: 30 days
- PITR: Enabled
- Client Secret: Generated
- Memory: 256 MB
- Timeout: 60 seconds

## Resource Management

### DynamoDB Tables

#### Users Table
- Billing: Pay-per-request (scales automatically)
- Encryption: KMS (AWS managed)
- Streams: Enabled (NEW_AND_OLD_IMAGES)
- TTL: Enabled on `expiresAt` attribute
- GSIs:
  - `usernameIndex`: Hash on username (for username lookups)
  - `createdAtIndex`: Hash on createdAt (for time-based queries)

#### Casting Table
- Billing: Pay-per-request
- Encryption: KMS (AWS managed)
- Streams: Enabled
- TTL: Enabled on `expiresAt` attribute
- GSIs:
  - `recruiterIdIndex`: Hash on recruiterId + Range on createdAt
  - `createdAtIndex`: Hash on createdAt

### Cognito Configuration

#### User Pool
- MFA: Optional (TOTP)
- Password: 12+ chars, uppercase, lowercase, numbers, symbols
- Email verification required
- Device tracking enabled
- Token revocation enabled

#### User Pool Client
- No client secret in development
- Client secret required in staging/production
- OAuth flows: authorization code, implicit
- Auth flows: SRP only (USER_SRP_AUTH + REFRESH_TOKEN)
- Token validity: 1 hour access, 1 hour ID, 30 days refresh
- Prevent user existence errors enabled

## Monitoring & Logging

### CloudWatch Logs
- Log group retention varies by stage
- All Lambda invocations logged automatically
- Custom metrics can be published

### DynamoDB Monitoring
- CloudWatch metrics enabled by default
- Set up alarms for:
  - Read/write throttling
  - User errors
  - System errors

### API Monitoring
- API Gateway logging enabled
- Request/response logging in CloudWatch
- Set up alarms for:
  - 4xx errors
  - 5xx errors
  - Latency > 1000ms

## Scaling Considerations

### Lambda Functions
- Concurrent execution limit: 1000 per function (default)
- Memory: 256 MB (can be increased if needed)
- Timeout: 60 seconds (monitored for duration)

### DynamoDB
- Auto-scaling with pay-per-request model
- No provisioned capacity needed
- Automatic burst capacity handling

### Cognito
- Scales automatically
- Session management handled by AWS

## Disaster Recovery

### Backup Strategy
1. **DynamoDB Backups**
   - PITR enabled in staging/production
   - On-demand backups can be created manually
   - Restore points available for 35 days

2. **Code Versioning**
   - Versions tracked in git repository
   - Rollback via CloudFormation stack updates

### Rollback Procedure
```bash
# Rollback to previous version
sls rollback --stage prod

# Or redeploy previous version
git checkout <commit-hash>
sls deploy --stage prod
```

## Cost Optimization

### DynamoDB
- Pay-per-request billing (optimal for variable load)
- Consider provisioned capacity if usage is predictable

### Lambda
- On-demand pricing (no idle costs)
- Consider Lambda@Edge for global optimization

### API Gateway
- HTTP API (cheaper than REST API)
- Request-based pricing

### CloudWatch
- Log retention: Adjust based on compliance needs
- Set up log filters for critical events

## Security Best Practices

### IAM
- Per-function IAM roles (principle of least privilege)
- No wildcard permissions
- Regular access reviews

### Encryption
- All data encrypted at rest (KMS)
- TLS/SSL for data in transit
- Signed API requests

### Secrets
- Use AWS Secrets Manager for sensitive data
- Rotate secrets regularly
- Never commit secrets to git

### API Security
- Rate limiting on public endpoints
- Request validation and sanitization
- CORS properly configured
- JWT token expiration

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Increase timeout setting if needed
   - Check for slow DynamoDB queries
   - Verify network connectivity

2. **Authorization Errors**
   - Verify JWT token is valid
   - Check token expiration
   - Verify Cognito user pool configuration

3. **DynamoDB Errors**
   - Check item size (max 400 KB)
   - Verify GSI attribute definitions
   - Check provisioned capacity (if using)

4. **CORS Errors**
   - Verify origin is in CORS allowlist
   - Check Content-Type headers
   - Verify preflight requests are working

## Useful Commands

```bash
# Deploy specific function
sls deploy function -f createUser --stage prod

# View logs
sls logs -f createUser --stage prod --tail

# Invoke function locally
sls invoke local -f createUser --stage dev

# Remove entire stack
sls remove --stage prod

# Get deployment info
sls info --stage prod

# Validate configuration
sls validate
```

## Support & Escalation

For issues or questions:
1. Check CloudWatch logs first
2. Review handler implementation
3. Check Serverless Framework documentation
4. Contact AWS support for infrastructure issues

## References

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
