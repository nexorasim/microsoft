using Microsoft.Identity.Web;
using Microsoft.Graph;
using System.Security.Claims;

namespace NexoraSIM.Auth
{
    public class EntraAuthService
    {
        private readonly GraphServiceClient _graphClient;
        private readonly ILogger<EntraAuthService> _logger;
        private readonly string _tenantId = "d7ff8066-4e28-4170-9805-b60ec642c442";
        private readonly string _clientId = "56b29d70-add0-4e62-a33c-fd1fb44da71a";

        public EntraAuthService(GraphServiceClient graphClient, ILogger<EntraAuthService> logger)
        {
            _graphClient = graphClient;
            _logger = logger;
        }

        public async Task<AuthResult> ValidateToken(string accessToken)
        {
            try
            {
                var user = await _graphClient.Me.GetAsync();
                
                return new AuthResult
                {
                    IsValid = true,
                    UserId = user.Id,
                    UserPrincipalName = user.UserPrincipalName,
                    DisplayName = user.DisplayName,
                    TenantId = _tenantId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token validation failed");
                return new AuthResult { IsValid = false };
            }
        }

        public async Task<UserRoles> GetUserRoles(string userId)
        {
            try
            {
                var memberOf = await _graphClient.Users[userId].MemberOf.GetAsync();
                
                var roles = new UserRoles();
                
                foreach (var group in memberOf.Value.OfType<Group>())
                {
                    switch (group.DisplayName)
                    {
                        case "NexoraSIM eSIM Administrators":
                            roles.IsESIMAdmin = true;
                            break;
                        case "NexoraSIM eSIM Operators":
                            roles.IsESIMOperator = true;
                            break;
                        case "NexoraSIM Enterprise Users":
                            roles.IsEnterpriseUser = true;
                            break;
                    }
                }
                
                return roles;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to get user roles for: {userId}");
                return new UserRoles();
            }
        }

        public string GetAuthorizationUrl(string redirectUri, string state = null)
        {
            var scopes = "https://graph.microsoft.com/User.Read https://graph.microsoft.com/DeviceManagementConfiguration.ReadWrite.All";
            var authorityUrl = $"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/authorize";
            
            var parameters = new Dictionary<string, string>
            {
                ["client_id"] = _clientId,
                ["response_type"] = "code",
                ["redirect_uri"] = redirectUri,
                ["scope"] = scopes,
                ["response_mode"] = "query"
            };
            
            if (!string.IsNullOrEmpty(state))
                parameters["state"] = state;
            
            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            return $"{authorityUrl}?{queryString}";
        }

        public string GetLogoutUrl(string postLogoutRedirectUri)
        {
            var logoutUrl = $"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/logout";
            return $"{logoutUrl}?post_logout_redirect_uri={Uri.EscapeDataString(postLogoutRedirectUri)}";
        }
    }

    public class AuthResult
    {
        public bool IsValid { get; set; }
        public string UserId { get; set; }
        public string UserPrincipalName { get; set; }
        public string DisplayName { get; set; }
        public string TenantId { get; set; }
    }

    public class UserRoles
    {
        public bool IsESIMAdmin { get; set; }
        public bool IsESIMOperator { get; set; }
        public bool IsEnterpriseUser { get; set; }
    }
}