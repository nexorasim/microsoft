#!/bin/bash

set -euo pipefail

ENVIRONMENT=${1:-prod}
RESOURCE_GROUP="nexorasim-${ENVIRONMENT}-rg"
LOCATION="East US"
TENANT_ID="d7ff8066-4e28-4170-9805-b60ec642c442"

echo "Deploying NexoraSIM infrastructure for environment: ${ENVIRONMENT}"

command -v az >/dev/null 2>&1 || { echo "Azure CLI required but not installed. Aborting." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq required but not installed. Aborting." >&2; exit 1; }

echo "Logging in to Azure..."
az login --tenant ${TENANT_ID}

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Using subscription: ${SUBSCRIPTION_ID}"

echo "Creating resource group: ${RESOURCE_GROUP}"
az group create --name ${RESOURCE_GROUP} --location "${LOCATION}" --tags \
  Environment=${ENVIRONMENT} \
  Project=NexoraSIM \
  Owner=NexoraCore

echo "Deploying main infrastructure..."
DEPLOYMENT_NAME="nexorasim-infra-$(date +%Y%m%d-%H%M%S)"

az deployment group create \
  --resource-group ${RESOURCE_GROUP} \
  --template-file infra/main.bicep \
  --parameters environment=${ENVIRONMENT} location="${LOCATION}" tenantId=${TENANT_ID} \
  --name ${DEPLOYMENT_NAME} \
  --verbose

echo "Retrieving deployment outputs..."
OUTPUTS=$(az deployment group show --resource-group ${RESOURCE_GROUP} --name ${DEPLOYMENT_NAME} --query properties.outputs -o json)

KEY_VAULT_NAME=$(echo ${OUTPUTS} | jq -r '.keyVaultName.value')
FUNCTION_APP_NAME=$(echo ${OUTPUTS} | jq -r '.functionAppName.value')
COSMOS_ACCOUNT_NAME=$(echo ${OUTPUTS} | jq -r '.cosmosAccountName.value')

echo "Infrastructure deployed successfully:"
echo "  Key Vault: ${KEY_VAULT_NAME}"
echo "  Function App: ${FUNCTION_APP_NAME}"
echo "  Cosmos DB: ${COSMOS_ACCOUNT_NAME}"

echo "Configuring Key Vault secrets..."
SQL_PASSWORD=$(openssl rand -base64 32)
az keyvault secret set --vault-name ${KEY_VAULT_NAME} --name "sql-admin-password" --value "${SQL_PASSWORD}"

COSMOS_CONNECTION=$(az cosmosdb keys list --name ${COSMOS_ACCOUNT_NAME} --resource-group ${RESOURCE_GROUP} --type connection-strings --query 'connectionStrings[0].connectionString' -o tsv)
az keyvault secret set --vault-name ${KEY_VAULT_NAME} --name "cosmos-connection" --value "${COSMOS_CONNECTION}"

echo "Creating deployment summary..."
cat > deployment-summary.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "resourceGroup": "${RESOURCE_GROUP}",
  "deploymentName": "${DEPLOYMENT_NAME}",
  "resources": {
    "keyVault": "${KEY_VAULT_NAME}",
    "functionApp": "${FUNCTION_APP_NAME}",
    "cosmosAccount": "${COSMOS_ACCOUNT_NAME}"
  }
}
EOF

echo "Infrastructure deployment completed successfully!"