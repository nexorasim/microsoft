using Microsoft.Graph;
using Microsoft.Graph.Models;
using System.Text.Json;

namespace NexoraSIM.VPN
{
    public class VPNProfileManager
    {
        private readonly GraphServiceClient _graphClient;
        private readonly ILogger<VPNProfileManager> _logger;

        public VPNProfileManager(GraphServiceClient graphClient, ILogger<VPNProfileManager> logger)
        {
            _graphClient = graphClient;
            _logger = logger;
        }

        public async Task<string> CreateAlwaysOnVPNProfile(string deviceId, VPNConfiguration config)
        {
            var vpnProfile = new Windows10VpnConfiguration
            {
                DisplayName = $"NexoraSIM-AlwaysOn-{config.CarrierCode}",
                Description = "NexoraSIM Enterprise Always On VPN Profile",
                ConnectionName = "NexoraSIM Enterprise VPN",
                Servers = new List<VpnServer>
                {
                    new VpnServer
                    {
                        Address = config.ServerAddress,
                        Description = "Primary VPN Server"
                    }
                },
                ConnectionType = VpnConnectionType.IkEv2,
                AuthenticationMethod = VpnAuthenticationMethod.Certificate,
                AlwaysOn = true,
                RememberUserCredentials = false,
                EnableSplitTunneling = false,
                EnableConditionalAccess = true
            };

            var assignment = new DeviceConfigurationAssignment
            {
                Target = new DeviceAndAppManagementAssignmentTarget
                {
                    DeviceAndAppManagementAssignmentFilterId = deviceId
                }
            };

            var result = await _graphClient.DeviceManagement.DeviceConfigurations.PostAsync(vpnProfile);
            await _graphClient.DeviceManagement.DeviceConfigurations[result.Id].Assignments.PostAsync(assignment);

            _logger.LogInformation($"VPN profile created: {result.Id} for device: {deviceId}");
            return result.Id;
        }

        public async Task<bool> ValidateVPNCompliance(string deviceId)
        {
            var compliancePolicy = await _graphClient.DeviceManagement.DeviceCompliancePolicies
                .GetAsync(config => config.QueryParameters.Filter = $"displayName eq 'NexoraSIM-VPN-Compliance'");

            var deviceCompliance = await _graphClient.DeviceManagement.ManagedDevices[deviceId]
                .DeviceCompliancePolicyStates.GetAsync();

            return deviceCompliance.Value.Any(c => c.State == ComplianceState.Compliant);
        }
    }

    public class VPNConfiguration
    {
        public string CarrierCode { get; set; }
        public string ServerAddress { get; set; }
        public string CertificateThumbprint { get; set; }
        public bool RequireMFA { get; set; } = true;
    }
}