# Deployment Guide | အသုံးချမှု လမ်းညွှန်

## Overview | ခြုံငုံသုံးသပ်ချက်

This guide covers the deployment of NexoraSIM Enterprise eSIM Management Portal to Portal.esim.com.mm with enterprise-grade security and compliance.

ဤလမ်းညွှန်သည် Portal.esim.com.mm သို့ NexoraSIM Enterprise eSIM Management Portal ကို enterprise-grade လုံခြုံရေးနှင့် လိုက်နာမှုဖြင့် အသုံးချမှုကို ဖော်ပြပါသည်။

## Prerequisites | ကြိုတင်လိုအပ်ချက်များ

### Azure Resources | Azure အရင်းအမြစ်များ
- Azure subscription with Owner permissions
- Entra ID tenant (d7ff8066-4e28-4170-9805-b60ec642c442)
- Custom domain verification for portal.esim.com.mm
- SSL certificate for HTTPS

### GitHub Configuration | GitHub ဖွဲ့စည်းမှု
- Repository with admin access
- GitHub Actions enabled
- OIDC federation configured
- Branch protection rules applied

## Deployment Steps | အသုံးချမှု အဆင့်များ

### 1. Infrastructure Deployment | အခြေခံအဆောက်အအုံ အသုံးချမှု

```powershell
# Deploy core infrastructure
az deployment group create \
  --resource-group nexorasim-prod-rg \
  --template-file infra/main-hardened.bicep \
  --parameters environment=prod tenantId=d7ff8066-4e28-4170-9805-b60ec642c442

# Deploy portal infrastructure
az deployment group create \
  --resource-group nexorasim-prod-rg \
  --template-file infra/bicep/portal.bicep \
  --parameters customDomain=portal.esim.com.mm
```

### 2. Application Deployment | အပ္ပလီကေးရှင်း အသုံးချမှု

```powershell
# Build and deploy entitlement server
dotnet publish app/entitlement-server/ -c Release
az functionapp deployment source config-zip \
  --resource-group nexorasim-prod-rg \
  --name nexorasim-prod-func \
  --src entitlement-server.zip

# Deploy portal static content
az staticwebapp deploy \
  --name portal-esim-prod-portal \
  --app-location portal/ \
  --resource-group nexorasim-prod-rg
```

### 3. Security Configuration | လုံခြုံရေး ဖွဲ့စည်းမှု

```powershell
# Configure RBAC
az role assignment create \
  --assignee-object-id <user-object-id> \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/<subscription-id>/resourceGroups/nexorasim-prod-rg

# Enable diagnostic logging
az monitor diagnostic-settings create \
  --name audit-logs \
  --resource <resource-id> \
  --workspace <log-analytics-workspace-id> \
  --logs '[{"category":"AuditEvent","enabled":true,"retentionPolicy":{"enabled":true,"days":2555}}]'
```

## Environment Configuration | ပတ်ဝန်းကျင် ဖွဲ့စည်းမှု

### Production Settings | ထုတ်လုပ်မှု ဆက်တင်များ

```json
{
  "environment": "production",
  "domain": "portal.esim.com.mm",
  "apiBaseUrl": "https://api.portal.esim.com.mm",
  "entraId": {
    "tenantId": "d7ff8066-4e28-4170-9805-b60ec642c442",
    "clientId": "${ENTRA_CLIENT_ID}"
  },
  "compliance": {
    "auditRetention": "7years",
    "dataResidency": "Myanmar",
    "frameworks": ["GSMA-SGP22", "GSMA-SGP32", "Myanmar-PTD", "GDPR", "SOC2"]
  }
}
```

## Health Checks | ကျန်းမာရေး စစ်ဆေးမှု

### Automated Validation | အလিုအလျောက် အတည်ပြုမှု

```bash
# API health check
curl -f https://api.portal.esim.com.mm/health

# Portal availability
curl -f https://portal.esim.com.mm

# Security headers validation
curl -I https://portal.esim.com.mm | grep -E "(Strict-Transport-Security|X-Frame-Options|Content-Security-Policy)"
```

## Rollback Procedures | နောက်ပြန်ပြောင်းမှု လုပ်ငန်းစဉ်များ

### Emergency Rollback | အရေးပေါ် နောက်ပြန်ပြောင်းမှု

```powershell
# Rollback to previous version
az functionapp deployment source config \
  --resource-group nexorasim-prod-rg \
  --name nexorasim-prod-func \
  --repo-url <previous-version-url>

# Verify rollback success
Invoke-RestMethod -Uri "https://api.portal.esim.com.mm/health" -Method Get
```

## Monitoring Setup | စောင့်ကြည့်မှု တပ်ဆင်မှု

### Application Insights | Application Insights

```powershell
# Configure application monitoring
az monitor app-insights component create \
  --app nexorasim-prod-insights \
  --location eastus \
  --resource-group nexorasim-prod-rg \
  --workspace <log-analytics-workspace-id>
```

## Compliance Validation | လိုက်နာမှု အတည်ပြုမှု

### Audit Evidence Collection | စာရင်းစစ် အထောက်အထား စုဆောင်းမှု

```powershell
# Generate audit pack
./scripts/generate-audit-pack.ps1 -OutputPath ./audit-evidence -Version 1.0.0

# Validate compliance frameworks
./scripts/validate-compliance.ps1 -Framework "GSMA-SGP22,Myanmar-PTD,GDPR"
```

## Troubleshooting | ပြဿနာ ဖြေရှင်းမှု

### Common Issues | အဖြစ်များသော ပြဿနာများ

1. **Certificate Issues | လက်မှတ် ပြဿနာများ**
   - Verify domain ownership
   - Check certificate expiration
   - Validate DNS configuration

2. **Authentication Failures | အထောက်အထား စစ်ဆေးမှု မအောင်မြင်မှု**
   - Verify Entra ID configuration
   - Check OIDC federation setup
   - Validate redirect URIs

3. **Performance Issues | စွမ်းဆောင်ရည် ပြဿနာများ**
   - Monitor Application Insights metrics
   - Check database connection pooling
   - Validate CDN configuration

## Support Contacts | ပံ့ပိုးမှု ဆက်သွယ်ရန်

- **Technical Support**: support@nexorasim.com
- **Security Issues**: security@nexorasim.com
- **Compliance Questions**: compliance@nexorasim.com
- **Emergency Hotline**: +95-9-xxx-xxx-xxx (24/7)