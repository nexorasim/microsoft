using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace NexoraSIM.ESIM
{
    public class ESIMLifecycleManager
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ESIMLifecycleManager> _logger;
        private readonly Dictionary<string, CarrierConfig> _carriers;

        public ESIMLifecycleManager(HttpClient httpClient, ILogger<ESIMLifecycleManager> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _carriers = new Dictionary<string, CarrierConfig>
            {
                ["MPT"] = new CarrierConfig { Name = "MPT", SMDP = "smdp.mpt.com.mm", ApiEndpoint = "https://api.mpt.com.mm/esim" },
                ["ATOM"] = new CarrierConfig { Name = "ATOM", SMDP = "smdp.atom.com.mm", ApiEndpoint = "https://api.atom.com.mm/esim" },
                ["U9"] = new CarrierConfig { Name = "U9", SMDP = "smdp.u9.com.mm", ApiEndpoint = "https://api.u9.com.mm/esim" },
                ["MYTEL"] = new CarrierConfig { Name = "MYTEL", SMDP = "smdp.mytel.com.mm", ApiEndpoint = "https://api.mytel.com.mm/esim" }
            };
        }

        public async Task<ESIMProfile> DownloadProfile(string carrierId, string iccid, string userId)
        {
            if (!_carriers.TryGetValue(carrierId, out var carrier))
                throw new ArgumentException($"Unsupported carrier: {carrierId}");

            var request = new ESIMDownloadRequest
            {
                ICCID = iccid,
                UserId = userId,
                SMDP = carrier.SMDP
            };

            var response = await _httpClient.PostAsJsonAsync($"{carrier.ApiEndpoint}/download", request);
            response.EnsureSuccessStatusCode();

            var profile = await response.Content.ReadFromJsonAsync<ESIMProfile>();
            
            await LogAuditEvent("ESIM_DOWNLOAD", userId, carrierId, iccid);
            _logger.LogInformation($"eSIM profile downloaded: {iccid} for user: {userId}");
            
            return profile;
        }

        public async Task<bool> ActivateProfile(string carrierId, string iccid, string activationCode)
        {
            if (!_carriers.TryGetValue(carrierId, out var carrier))
                return false;

            var request = new ESIMActivationRequest
            {
                ICCID = iccid,
                ActivationCode = activationCode,
                SMDP = carrier.SMDP
            };

            var response = await _httpClient.PostAsJsonAsync($"{carrier.ApiEndpoint}/activate", request);
            
            if (response.IsSuccessStatusCode)
            {
                await LogAuditEvent("ESIM_ACTIVATE", "", carrierId, iccid);
                return true;
            }
            
            return false;
        }

        public async Task<bool> RevokeProfile(string carrierId, string iccid, string reason)
        {
            if (!_carriers.TryGetValue(carrierId, out var carrier))
                return false;

            var request = new ESIMRevocationRequest
            {
                ICCID = iccid,
                Reason = reason,
                SMDP = carrier.SMDP
            };

            var response = await _httpClient.PostAsJsonAsync($"{carrier.ApiEndpoint}/revoke", request);
            
            if (response.IsSuccessStatusCode)
            {
                await LogAuditEvent("ESIM_REVOKE", "", carrierId, iccid, reason);
                return true;
            }
            
            return false;
        }

        private async Task LogAuditEvent(string action, string userId, string carrierId, string iccid, string details = "")
        {
            var auditEvent = new
            {
                Timestamp = DateTime.UtcNow,
                Action = action,
                UserId = userId,
                CarrierId = carrierId,
                ICCID = iccid,
                Details = details,
                Source = "ESIMLifecycleManager"
            };

            // Log to Azure Monitor/Sentinel
            _logger.LogInformation("AUDIT: {AuditEvent}", JsonSerializer.Serialize(auditEvent));
        }
    }

    public class CarrierConfig
    {
        public string Name { get; set; }
        public string SMDP { get; set; }
        public string ApiEndpoint { get; set; }
    }

    public class ESIMProfile
    {
        public string ICCID { get; set; }
        public string ActivationCode { get; set; }
        public string QRCode { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string Status { get; set; }
    }

    public class ESIMDownloadRequest
    {
        public string ICCID { get; set; }
        public string UserId { get; set; }
        public string SMDP { get; set; }
    }

    public class ESIMActivationRequest
    {
        public string ICCID { get; set; }
        public string ActivationCode { get; set; }
        public string SMDP { get; set; }
    }

    public class ESIMRevocationRequest
    {
        public string ICCID { get; set; }
        public string Reason { get; set; }
        public string SMDP { get; set; }
    }
}