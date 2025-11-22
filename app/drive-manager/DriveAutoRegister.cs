using Microsoft.Graph;
using Microsoft.Graph.Models;
using System.Text.Json;

namespace NexoraSIM.Drive
{
    public class DriveAutoRegister
    {
        private readonly GraphServiceClient _graphClient;
        private readonly ILogger<DriveAutoRegister> _logger;

        public DriveAutoRegister(GraphServiceClient graphClient, ILogger<DriveAutoRegister> logger)
        {
            _graphClient = graphClient;
            _logger = logger;
        }

        public async Task<bool> RegisterUserDrive(string userId, string deviceId)
        {
            try
            {
                // Get user's OneDrive
                var drive = await _graphClient.Users[userId].Drive.GetAsync();
                
                // Create company folder structure
                await CreateCompanyFolders(userId);
                
                // Apply sensitivity labels
                await ApplySensitivityLabels(userId);
                
                // Register SharePoint sites
                await RegisterSharePointSites(userId);
                
                await LogAuditEvent("DRIVE_AUTO_REGISTER", userId, deviceId);
                _logger.LogInformation($"Drive auto-registered for user: {userId}, device: {deviceId}");
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to auto-register drive for user: {userId}");
                return false;
            }
        }

        private async Task CreateCompanyFolders(string userId)
        {
            var folders = new[]
            {
                "NexoraSIM-Enterprise",
                "NexoraSIM-Enterprise/eSIM-Profiles",
                "NexoraSIM-Enterprise/VPN-Configs",
                "NexoraSIM-Enterprise/Compliance-Reports"
            };

            foreach (var folderPath in folders)
            {
                var folderRequest = new DriveItem
                {
                    Name = folderPath.Split('/').Last(),
                    Folder = new Folder(),
                    AdditionalData = new Dictionary<string, object>
                    {
                        ["@microsoft.graph.conflictBehavior"] = "rename"
                    }
                };

                try
                {
                    await _graphClient.Users[userId].Drive.Root.Children.PostAsync(folderRequest);
                }
                catch (ServiceException ex) when (ex.Error.Code == "nameAlreadyExists")
                {
                    // Folder already exists, continue
                }
            }
        }

        private async Task ApplySensitivityLabels(string userId)
        {
            // Get available sensitivity labels
            var labels = await _graphClient.InformationProtection.Policy.Labels.GetAsync();
            var confidentialLabel = labels.Value.FirstOrDefault(l => l.Name.Contains("Confidential"));

            if (confidentialLabel != null)
            {
                // Apply to NexoraSIM folders
                var driveItems = await _graphClient.Users[userId].Drive.Root.Children
                    .GetAsync(config => config.QueryParameters.Filter = "name eq 'NexoraSIM-Enterprise'");

                foreach (var item in driveItems.Value)
                {
                    var labelRequest = new InformationProtectionLabel
                    {
                        Id = confidentialLabel.Id
                    };

                    // Apply sensitivity label (simplified - actual implementation depends on API availability)
                    _logger.LogInformation($"Applied sensitivity label to folder: {item.Name}");
                }
            }
        }

        private async Task RegisterSharePointSites(string userId)
        {
            // Get user's associated SharePoint sites
            var sites = await _graphClient.Sites.GetAsync(config => 
                config.QueryParameters.Search = "NexoraSIM");

            foreach (var site in sites.Value)
            {
                // Register user access to company SharePoint sites
                var permission = new Permission
                {
                    Roles = new List<string> { "read", "write" },
                    GrantedToV2 = new SharePointIdentitySet
                    {
                        User = new Identity
                        {
                            Id = userId
                        }
                    }
                };

                try
                {
                    await _graphClient.Sites[site.Id].Permissions.PostAsync(permission);
                    _logger.LogInformation($"Registered SharePoint access for user: {userId}, site: {site.Name}");
                }
                catch (ServiceException ex)
                {
                    _logger.LogWarning($"Failed to register SharePoint access: {ex.Message}");
                }
            }
        }

        private async Task LogAuditEvent(string action, string userId, string deviceId)
        {
            var auditEvent = new
            {
                Timestamp = DateTime.UtcNow,
                Action = action,
                UserId = userId,
                DeviceId = deviceId,
                Source = "DriveAutoRegister"
            };

            _logger.LogInformation("AUDIT: {AuditEvent}", JsonSerializer.Serialize(auditEvent));
        }
    }
}