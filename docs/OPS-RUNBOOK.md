# NexoraSIM Operations Runbook

## System Overview

NexoraSIM Enterprise platform provides eSIM entitlement services and enterprise management capabilities with Zero Trust architecture across Cloudflare and Microsoft Azure.

## Architecture Components

- **Edge**: Cloudflare Workers (app.nexorasim.workers.dev)
- **Identity**: Microsoft Entra ID (d7ff8066-4e28-4170-9805-b60ec642c442)
- **Compute**: Azure Functions + Container Apps
- **Data**: Cosmos DB + Azure SQL + Service Bus
- **Monitoring**: Application Insights + Azure Monitor

## Critical Alerts and Response

### High Priority Alerts

#### Entitlement Server Failure
**Alert**: Function app error rate > 5%
**Response Time**: 15 minutes
**Actions**:
1. Check Application Insights for error details
2. Verify Azure Function health status
3. Check Cosmos DB connectivity
4. Escalate to on-call engineer if unresolved

#### SM-DP+ Connection Timeout
**Alert**: SM-DP+ response time > 30 seconds
**Response Time**: 10 minutes
**Actions**:
1. Verify carrier SM-DP+ endpoint status
2. Check network connectivity from Container Apps
3. Review Service Bus message queue
4. Contact carrier technical support if needed

#### Authentication Anomalies
**Alert**: Failed authentication rate > 10%
**Response Time**: 5 minutes
**Actions**:
1. Check Entra ID sign-in logs
2. Verify Conditional Access policy status
3. Review Cloudflare Zero Trust logs
4. Block suspicious IP addresses if confirmed attack

### Medium Priority Alerts

#### High Latency Warning
**Alert**: Average response time > 2 seconds
**Response Time**: 30 minutes
**Actions**:
1. Check Azure Function performance metrics
2. Review Cosmos DB RU consumption
3. Analyze Cloudflare Worker performance
4. Scale resources if needed

#### Storage Capacity Warning
**Alert**: Cosmos DB storage > 80%
**Response Time**: 1 hour
**Actions**:
1. Review data retention policies
2. Archive old audit logs
3. Optimize document structure
4. Plan capacity expansion

## Operational Procedures

### Daily Operations

#### Morning Health Check
1. Review overnight alerts and incidents
2. Check system performance dashboards
3. Verify backup completion status
4. Review security event logs
5. Update operational status page

#### Performance Monitoring
- Monitor success rates across all carriers (target: >99%)
- Track average latency (target: <500ms)
- Review error patterns and trends
- Check resource utilization metrics

### Weekly Operations

#### Security Review
1. Review access logs and user activity
2. Check for failed authentication attempts
3. Verify certificate expiration dates
4. Update security policies if needed

#### Capacity Planning
1. Analyze usage trends and growth patterns
2. Review resource utilization metrics
3. Plan scaling activities
4. Update capacity forecasts

### Monthly Operations

#### Compliance Audit
1. Generate compliance reports
2. Review audit log completeness
3. Verify data retention compliance
4. Update compliance documentation

#### Disaster Recovery Testing
1. Test backup and restore procedures
2. Verify failover capabilities
3. Update recovery documentation
4. Train operations team on procedures

## Certificate and Secret Rotation

### Automated Rotation
- Key Vault certificates: 30 days before expiration
- Service principal secrets: 60 days before expiration
- API keys: 90 days before expiration

### Manual Rotation Process
1. Generate new certificate/secret in Key Vault
2. Update application configurations
3. Test connectivity and functionality
4. Remove old certificate/secret
5. Update documentation

## Backup and Recovery

### Backup Schedule
- **Cosmos DB**: Continuous backup with 30-day retention
- **Azure SQL**: Daily full backup, hourly differential
- **Configuration**: Weekly backup to Azure Storage
- **Key Vault**: Automatic backup with geo-replication

### Recovery Procedures

#### Database Recovery
1. Identify recovery point objective (RPO)
2. Initiate point-in-time restore
3. Verify data integrity
4. Update connection strings
5. Test application functionality

#### Service Recovery
1. Check service health status
2. Restart failed services
3. Verify dependencies
4. Monitor for cascading failures
5. Update status communications

## Monitoring and Alerting

### Key Metrics
- **Availability**: 99.9% uptime target
- **Performance**: <500ms average response time
- **Success Rate**: >99% operation success
- **Security**: Zero unauthorized access

### Alert Channels
- **Critical**: SMS + Email + Teams
- **High**: Email + Teams
- **Medium**: Email
- **Low**: Dashboard notification

### Escalation Matrix
1. **L1 Support**: Initial response (0-15 minutes)
2. **L2 Engineering**: Technical investigation (15-60 minutes)
3. **L3 Architecture**: Complex issues (1-4 hours)
4. **Management**: Business impact (4+ hours)

## Troubleshooting Guide

### Common Issues

#### Profile Transfer Failures
**Symptoms**: Transfer operations failing with timeout errors
**Diagnosis**:
1. Check SM-DP+ endpoint connectivity
2. Verify device authentication
3. Review carrier-specific requirements
**Resolution**:
1. Retry with exponential backoff
2. Contact carrier support if persistent
3. Update device compatibility matrix

#### Authentication Errors
**Symptoms**: Users unable to access portal
**Diagnosis**:
1. Check Entra ID service health
2. Verify Conditional Access policies
3. Review user account status
**Resolution**:
1. Reset user credentials if needed
2. Adjust Conditional Access policies
3. Clear browser cache and cookies

#### Performance Degradation
**Symptoms**: Slow response times across services
**Diagnosis**:
1. Check Azure service health
2. Review resource utilization
3. Analyze traffic patterns
**Resolution**:
1. Scale out compute resources
2. Optimize database queries
3. Enable caching where appropriate

## Contact Information

### On-Call Rotation
- **Primary**: +1-555-0123 (operations@nexorasim.com)
- **Secondary**: +1-555-0124 (engineering@nexorasim.com)
- **Escalation**: +1-555-0125 (management@nexorasim.com)

### Vendor Contacts
- **Microsoft Support**: Enterprise support contract
- **Cloudflare Support**: Business plan support
- **Carrier Technical**: Per carrier agreement

### Internal Teams
- **Security**: security@nexorasim.com
- **Compliance**: compliance@nexorasim.com
- **Engineering**: engineering@nexorasim.com

## Change Management

### Change Categories
- **Emergency**: Security patches, critical fixes
- **Standard**: Feature updates, configuration changes
- **Normal**: Routine maintenance, documentation updates

### Approval Process
1. **Emergency**: CTO approval required
2. **Standard**: Engineering manager approval
3. **Normal**: Peer review sufficient

### Deployment Windows
- **Production**: Tuesday/Thursday 2-4 AM UTC
- **Staging**: Daily 6-8 PM UTC
- **Development**: Continuous deployment

## Compliance Requirements

### Data Retention
- **Audit logs**: 7 years (immutable storage)
- **Operational logs**: 90 days
- **Performance metrics**: 1 year
- **User data**: Per privacy policy

### Regulatory Compliance
- **GSMA SGP.22/SGP.32**: eSIM specifications
- **Myanmar PTD**: Local telecommunications regulations
- **GDPR**: European data protection
- **SOC 2**: Security and availability controls