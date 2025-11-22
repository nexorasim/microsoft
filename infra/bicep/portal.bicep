@description('Portal.esim.com.mm Infrastructure')
param environment string = 'prod'
param location string = resourceGroup().location
param tenantId string
param customDomain string = 'portal.esim.com.mm'

var prefix = 'portal-esim-${environment}'

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${prefix}-portal'
  location: location
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
    enterpriseGradeCdnStatus: 'Enabled'
  }
}

resource customDomainResource 'Microsoft.Web/staticSites/customDomains@2023-01-01' = {
  parent: staticWebApp
  name: customDomain
  properties: {
    validationMethod: 'dns-txt-token'
  }
}

output staticWebAppUrl string = staticWebApp.properties.defaultHostname
output customDomainValidationToken string = customDomainResource.properties.validationToken