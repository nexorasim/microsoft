@description('NexoraSIM Enterprise Infrastructure')
param environment string = 'prod'
param location string = resourceGroup().location
param tenantId string = 'd7ff8066-4e28-4170-9805-b60ec642c442'

var prefix = 'nexorasim-${environment}'
var tags = {
  Environment: environment
  Project: 'NexoraSIM'
  Owner: 'NexoraCore'
  CostCenter: 'Engineering'
}

// Key Vault for secrets management
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
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// Cosmos DB for profile and device data
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: '${prefix}-cosmos'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [{ locationName: location, failoverPriority: 0 }]
    capabilities: [{ name: 'EnableServerless' }]
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 720
      }
    }
    isVirtualNetworkFilterEnabled: true
    publicNetworkAccess: 'Disabled'
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'nexorasim'
  properties: {
    resource: { id: 'nexorasim' }
  }
}

// Azure SQL for audit and compliance data
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: '${prefix}-sql'
  location: location
  tags: tags
  properties: {
    administratorLogin: 'nexoraadmin'
    administratorLoginPassword: 'TempPassword123!'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
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
  }
}

// Service Bus for event messaging
resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${prefix}-sb'
  location: location
  tags: tags
  sku: { name: 'Premium', capacity: 1 }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    zoneRedundant: true
  }
}

// Function App for entitlement server
resource functionAppPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${prefix}-func-plan'
  location: location
  tags: tags
  sku: { name: 'EP1', tier: 'ElasticPremium' }
  properties: { reserved: true }
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
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|8.0'
      appSettings: [
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'COSMOS_CONNECTION_STRING', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=cosmos-connection)' }
        { name: 'SQL_CONNECTION_STRING', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=sql-connection)' }
        { name: 'SERVICEBUS_CONNECTION_STRING', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=servicebus-connection)' }
      ]
    }
    publicNetworkAccess: 'Disabled'
  }
}

// Container Apps for microservices
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${prefix}-cae'
  location: location
  tags: tags
  properties: {
    vnetConfiguration: {
      internal: true
    }
  }
}

resource smdpGateway 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-smdp-gateway'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 8080
      }
      secrets: [
        { name: 'cosmos-connection', keyVaultUrl: '${keyVault.properties.vaultUri}secrets/cosmos-connection' }
      ]
    }
    template: {
      containers: [
        {
          name: 'smdp-gateway'
          image: 'nexorasim.azurecr.io/smdp-gateway:latest'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'COSMOS_CONNECTION_STRING', secretRef: 'cosmos-connection' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 10 }
    }
  }
}

// Application Insights for monitoring
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
  }
}

// Private DNS zones
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

// Virtual Network for private endpoints
resource vnet 'Microsoft.Network/virtualNetworks@2023-06-01' = {
  name: '${prefix}-vnet'
  location: location
  tags: tags
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    subnets: [
      {
        name: 'private-endpoints'
        properties: { addressPrefix: '10.0.1.0/24' }
      }
      {
        name: 'container-apps'
        properties: { addressPrefix: '10.0.2.0/23' }
      }
    ]
  }
}

// Private endpoints
resource keyVaultPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-06-01' = {
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

// RBAC assignments
resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, functionApp.id, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output keyVaultName string = keyVault.name
output functionAppName string = functionApp.name
output cosmosAccountName string = cosmosAccount.name
output sqlServerName string = sqlServer.name
output serviceBusName string = serviceBus.name
output applicationInsightsName string = applicationInsights.name