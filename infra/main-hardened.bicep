@description('NexoraSIM Enterprise Infrastructure - Security Hardened')
@minLength(3)
@maxLength(10)
param environment string = 'prod'

@description('Azure region for deployment')
param location string = resourceGroup().location

@description('Entra ID tenant identifier')
param tenantId string

@description('Application version for tagging')
param version string = '1.0.0'

@description('Enable private endpoints for all services')
param enablePrivateEndpoints bool = true

@description('Enable diagnostic logging')
param enableDiagnostics bool = true

var prefix = 'nexorasim-${environment}'
var tags = {
  Environment: environment
  Project: 'NexoraSIM-Enterprise'
  Owner: 'NexoraCore'
  CostCenter: 'Engineering'
  Version: version
  Compliance: 'GSMA-SGP22-SGP32'
  DataClassification: 'Confidential'
}

// Virtual Network with security-first design
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: '${prefix}-vnet'
  location: location
  tags: tags
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    enableDdosProtection: true
    subnets: [
      {
        name: 'private-endpoints'
        properties: {
          addressPrefix: '10.0.1.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
        }
      }
      {
        name: 'container-apps'
        properties: {
          addressPrefix: '10.0.2.0/23'
          delegations: [
            {
              name: 'Microsoft.App/environments'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: 'function-apps'
        properties: {
          addressPrefix: '10.0.4.0/24'
          delegations: [
            {
              name: 'Microsoft.Web/serverFarms'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
    ]
  }
}

// Network Security Groups
resource nsgPrivateEndpoints 'Microsoft.Network/networkSecurityGroups@2023-09-01' = {
  name: '${prefix}-nsg-pe'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowHTTPS'
        properties: {
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '443'
          sourceAddressPrefix: 'VirtualNetwork'
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 100
          direction: 'Inbound'
        }
      }
      {
        name: 'DenyAll'
        properties: {
          protocol: '*'
          sourcePortRange: '*'
          destinationPortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
          access: 'Deny'
          priority: 4096
          direction: 'Inbound'
        }
      }
    ]
  }
}

// Key Vault with enhanced security
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'premium' }
    tenantId: tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: [
        {
          id: '${vnet.id}/subnets/private-endpoints'
          ignoreMissingVnetServiceEndpoint: false
        }
      ]
    }
  }
}

// Log Analytics Workspace for centralized logging
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 2555 // 7 years for regulatory compliance
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
      disableLocalAuth: true
    }
    workspaceCapping: {
      dailyQuotaGb: 10
    }
  }
}

// Application Insights with enhanced monitoring
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    DisableIpMasking: false
    DisableLocalAuth: true
    ForceCustomerStorageForProfiler: true
  }
}

// Cosmos DB with enhanced security
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: '${prefix}-cosmos'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [{ locationName: location, failoverPriority: 0 }]
    capabilities: [{ name: 'EnableServerless' }]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: {
        tier: 'Continuous7Days'
      }
    }
    isVirtualNetworkFilterEnabled: true
    publicNetworkAccess: 'Disabled'
    disableKeyBasedMetadataWriteAccess: true
    networkAclBypass: 'AzureServices'
    minimalTlsVersion: 'Tls12'
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'nexorasim'
  properties: {
    resource: { id: 'nexorasim' }
  }
}

// Azure SQL with advanced security
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: '${prefix}-sql'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: 'Group'
      tenantId: tenantId
      azureADOnlyAuthentication: true
    }
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: 'nexorasim-audit'
  location: location
  tags: tags
  sku: { name: 'S2', tier: 'Standard' }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 268435456000
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    ledgerOn: true // Enable ledger for immutable audit logs
  }
}

// Advanced Threat Protection for SQL
resource sqlAdvancedThreatProtection 'Microsoft.Sql/servers/advancedThreatProtectionSettings@2023-05-01-preview' = {
  parent: sqlServer
  name: 'Default'
  properties: {
    state: 'Enabled'
  }
}

// Service Bus with premium security
resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${prefix}-sb'
  location: location
  tags: tags
  sku: { name: 'Premium', capacity: 1 }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    zoneRedundant: true
    disableLocalAuth: true
  }
}

// Function App with enhanced security
resource functionAppPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${prefix}-func-plan'
  location: location
  tags: tags
  sku: { name: 'EP1', tier: 'ElasticPremium' }
  properties: { 
    reserved: true
    zoneRedundant: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${prefix}-func'
  location: location
  tags: tags
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: functionAppPlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    publicNetworkAccess: 'Disabled'
    vnetRouteAllEnabled: true
    virtualNetworkSubnetId: '${vnet.id}/subnets/function-apps'
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|8.0'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsights.properties.ConnectionString }
        { name: 'COSMOS_CONNECTION_STRING', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=cosmos-connection)' }
        { name: 'SQL_CONNECTION_STRING', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=sql-connection)' }
        { name: 'SERVICEBUS_CONNECTION_STRING', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=servicebus-connection)' }
        { name: 'WEBSITE_VNET_ROUTE_ALL', value: '1' }
        { name: 'WEBSITE_DNS_SERVER', value: '168.63.129.16' }
      ]
    }
  }
}

// Container Apps Environment with security
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${prefix}-cae'
  location: location
  tags: tags
  properties: {
    vnetConfiguration: {
      internal: true
      infrastructureSubnetId: '${vnet.id}/subnets/container-apps'
    }
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// Private DNS Zones
resource privateDnsZoneKeyVault 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  tags: tags
}

resource privateDnsZoneCosmos 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.documents.azure.com'
  location: 'global'
  tags: tags
}

resource privateDnsZoneSQL 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.database.windows.net'
  location: 'global'
  tags: tags
}

// Private Endpoints
resource keyVaultPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-09-01' = if (enablePrivateEndpoints) {
  name: '${prefix}-kv-pe'
  location: location
  tags: tags
  properties: {
    subnet: { id: '${vnet.id}/subnets/private-endpoints' }
    privateLinkServiceConnections: [
      {
        name: 'keyvault'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: ['vault']
        }
      }
    ]
  }
}

resource cosmosPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-09-01' = if (enablePrivateEndpoints) {
  name: '${prefix}-cosmos-pe'
  location: location
  tags: tags
  properties: {
    subnet: { id: '${vnet.id}/subnets/private-endpoints' }
    privateLinkServiceConnections: [
      {
        name: 'cosmos'
        properties: {
          privateLinkServiceId: cosmosAccount.id
          groupIds: ['Sql']
        }
      }
    ]
  }
}

// RBAC Assignments with least privilege
resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, functionApp.id, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource cosmosDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: cosmosAccount
  name: guid(cosmosAccount.id, functionApp.id, 'Cosmos DB Built-in Data Contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00000000-0000-0000-0000-000000000002')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Diagnostic Settings for compliance
resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (enableDiagnostics) {
  scope: keyVault
  name: 'audit-logs'
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 2555 // 7 years
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
  }
}

// Outputs for deployment pipeline
output keyVaultName string = keyVault.name
output functionAppName string = functionApp.name
output cosmosAccountName string = cosmosAccount.name
output sqlServerName string = sqlServer.name
output serviceBusName string = serviceBus.name
output applicationInsightsName string = applicationInsights.name
output vnetId string = vnet.id
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id