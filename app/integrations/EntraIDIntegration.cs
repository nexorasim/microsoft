using Microsoft.Graph;
using Microsoft.Graph.Models;
using System.Text.Json;

namespace NexoraSIM.Integrations
{
    public class EntraIDIntegration
    {
        private readonly GraphServiceClient _graphClient;
        private readonly ILogger<EntraIDIntegration> _logger;

        public EntraIDIntegration(GraphServiceClient graphClient, ILogger<EntraIDIntegration> logger)
        {
            _graphClient = graphClient;
            _logger = logger;
        }

        public async Task<bool> ConfigureDevicePolicies(string deviceId, string compliancePolicy, string conditionalAccess, string configuredBy)
        {
            try
            {
                var device = await _graphClient.Devices[deviceId].GetAsync();
                if (device == null)
                {
                    _logger.LogWarning($"Device not found in Entra ID: {deviceId}");
                    return false;
                }

                await ApplyCompliancePolicy(deviceId, compliancePolicy);
                await ConfigureConditionalAccess(deviceId, conditionalAccess);
                
                await LogAuditEvent("ENTRA_DEVICE_CONFIGURE", configuredBy, deviceId, "SUCCESS");
                _logger.LogInformation($"Entra ID device policies configured: {deviceId}");
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to configure Entra ID device policies: {deviceId}");
                await LogAuditEvent("ENTRA_DEVICE_CONFIGURE", configuredBy, deviceId, "FAILED");
                return false;
            }
        }

        public async Task<EntraDeviceInfo> GetDeviceInfo(string deviceId)
        {
            try
            {
                var device = await _graphClient.Devices[deviceId].GetAsync();
                if (device == null) return null;

                var complianceState = await _graphClient.DeviceManagement.ManagedDevices[deviceId]
                    .DeviceCompliancePolicyStates.GetAsync();

                return new EntraDeviceInfo
                {
                    DeviceId = device.Id,
                    DisplayName = device.DisplayName,
                    OperatingSystem = device.OperatingSystem,
                    OperatingSystemVersion = device.OperatingSystemVersion,
                    IsCompliant = complianceState?.Value?.Any(c => c.State == ComplianceState.Compliant) ?? false,
                    LastSyncDateTime = device.ApproximateLastSignInDateTime,
                    TrustType = device.TrustType,
                    IsManaged = device.IsManaged ?? false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to get Entra ID device info: {deviceId}");
                return null;
            }
        }

        public async Task<bool> EnforceConditionalAccess(string userId, string deviceId, string policyName)
        {
            try
            {
                var policy = new ConditionalAccessPolicy
                {
                    DisplayName = $"NexoraSIM-{policyName}-{deviceId}",
                    State = ConditionalAccessPolicyState.Enabled,
                    Conditions = new ConditionalAccessConditionSet
                    {
                        Users = new ConditionalAccessUsers
                        {
                            IncludeUsers = new List<string> { userId }
                        },
                        Applications = new ConditionalAccessApplications
                        {
                            IncludeApplications = new List<string> { "All" }
                        },
                        Devices = new ConditionalAccessDevices
                        {
                            IncludeDevices = new List<string> { deviceId }
                        }
                    },
                    GrantControls = new ConditionalAccessGrantControls
                    {
                        Operator = "AND",
                        BuiltInControls = new List<ConditionalAccessGrantControl?>
                        {
                            ConditionalAccessGrantControl.Mfa,
                            ConditionalAccessGrantControl.CompliantDevice
                        }
                    }
                };

                var result = await _graphClient.Identity.ConditionalAccess.Policies.PostAsync(policy);
                
                _logger.LogInformation($"Conditional Access policy created: {result.Id}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to enforce Conditional Access for device: {deviceId}");
                return false;
            }
        }

        private async Task ApplyCompliancePolicy(string deviceId, string policyType)
        {
            var compliancePolicy = policyType switch
            {
                "high" => CreateHighSecurityPolicy(),
                "executive" => CreateExecutivePolicy(),
                _ => CreateStandardPolicy()
            };

            compliancePolicy.DisplayName = $"NexoraSIM-{policyType}-{deviceId}";
            
            var result = await _graphClient.DeviceManagement.DeviceCompliancePolicies.PostAsync(compliancePolicy);
            
            var assignment = new DeviceCompliancePolicyAssignment
            {
                Target = new DeviceAndAppManagementAssignmentTarget
                {
                    DeviceAndAppManagementAssignmentFilterId = deviceId
                }
            };

            await _graphClient.DeviceManagement.DeviceCompliancePolicies[result.Id].Assignments.PostAsync(assignment);
        }

        private async Task ConfigureConditionalAccess(string deviceId, string accessLevel)
        {
            if (accessLevel == "disabled") return;

            var policy = new ConditionalAccessPolicy
            {
                DisplayName = $"NexoraSIM-Device-{deviceId}",
                State = accessLevel == "report-only" ? ConditionalAccessPolicyState.EnabledForReportingButNotEnforced : ConditionalAccessPolicyState.Enabled,
                Conditions = new ConditionalAccessConditionSet
                {
                    Devices = new ConditionalAccessDevices
                    {
                        IncludeDevices = new List<string> { deviceId }
                    }
                },
                GrantControls = new ConditionalAccessGrantControls
                {
                    Operator = "OR",
                    BuiltInControls = new List<ConditionalAccessGrantControl?> { ConditionalAccessGrantControl.CompliantDevice }
                }
            };

            await _graphClient.Identity.ConditionalAccess.Policies.PostAsync(policy);
        }

        private DeviceCompliancePolicy CreateStandardPolicy()
        {
            return new Windows10CompliancePolicy
            {
                PasswordRequired = true,
                PasswordMinimumLength = 8,
                PasswordRequiredType = RequiredPasswordType.Alphanumeric,
                DeviceThreatProtectionEnabled = true,
                DeviceThreatProtectionRequiredSecurityLevel = DeviceThreatProtectionLevel.Medium,
                StorageRequireEncryption = true
            };
        }

        private DeviceCompliancePolicy CreateHighSecurityPolicy()
        {
            return new Windows10CompliancePolicy
            {
                PasswordRequired = true,
                PasswordMinimumLength = 12,
                PasswordRequiredType = RequiredPasswordType.Alphanumeric,
                DeviceThreatProtectionEnabled = true,
                DeviceThreatProtectionRequiredSecurityLevel = DeviceThreatProtectionLevel.High,
                StorageRequireEncryption = true,
                BitLockerEnabled = true,
                SecureBootEnabled = true
            };
        }

        private DeviceCompliancePolicy CreateExecutivePolicy()
        {
            return new Windows10CompliancePolicy
            {
                PasswordRequired = true,
                PasswordMinimumLength = 14,
                PasswordRequiredType = RequiredPasswordType.Alphanumeric,
                DeviceThreatProtectionEnabled = true,
                DeviceThreatProtectionRequiredSecurityLevel = DeviceThreatProtectionLevel.High,
                StorageRequireEncryption = true,
                BitLockerEnabled = true,
                SecureBootEnabled = true,
                CodeIntegrityEnabled = true
            };
        }

        private async Task LogAuditEvent(string action, string userId, string deviceId, string status)
        {
            var auditEvent = new
            {
                Timestamp = DateTime.UtcNow,
                Action = action,
                UserId = userId,
                DeviceId = deviceId,
                Status = status,
                Source = "EntraIDIntegration"
            };

            _logger.LogInformation("AUDIT: {AuditEvent}", JsonSerializer.Serialize(auditEvent));
        }
    }

    public class EntraDeviceInfo
    {
        public string DeviceId { get; set; }
        public string DisplayName { get; set; }
        public string OperatingSystem { get; set; }
        public string OperatingSystemVersion { get; set; }
        public bool IsCompliant { get; set; }
        public DateTimeOffset? LastSyncDateTime { get; set; }
        public string TrustType { get; set; }
        public bool IsManaged { get; set; }
    }
}