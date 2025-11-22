using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace NexoraSIM.Integrations
{
    public class AppleBusinessManager
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AppleBusinessManager> _logger;
        private readonly string _appleBusinessManagerId;
        private readonly string _privateKey;

        public AppleBusinessManager(HttpClient httpClient, ILogger<AppleBusinessManager> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _appleBusinessManagerId = configuration["Apple:BusinessManagerId"];
            _privateKey = configuration["Apple:PrivateKey"];
        }

        public async Task<AppleEnrollmentResult> EnrollDevice(string udid, string mdmProfileId, string enrolledBy)
        {
            try
            {
                var enrollmentRequest = new AppleEnrollmentRequest
                {
                    UDID = udid,
                    MDMProfileId = mdmProfileId,
                    BusinessManagerId = _appleBusinessManagerId,
                    EnrolledBy = enrolledBy,
                    Timestamp = DateTime.UtcNow
                };

                var token = GenerateAppleToken();
                _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                var response = await _httpClient.PostAsJsonAsync("https://mdmenrollment.apple.com/device/enroll", enrollmentRequest);
                
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<AppleEnrollmentResult>();
                    
                    await LogAuditEvent("APPLE_DEVICE_ENROLL", enrolledBy, udid, "SUCCESS");
                    _logger.LogInformation($"Apple device enrolled successfully: {udid}");
                    
                    return result;
                }
                else
                {
                    await LogAuditEvent("APPLE_DEVICE_ENROLL", enrolledBy, udid, "FAILED");
                    throw new Exception($"Apple enrollment failed: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Apple device enrollment failed for UDID: {udid}");
                throw;
            }
        }

        public async Task<bool> AssignMDMProfile(string udid, string profileId)
        {
            try
            {
                var assignmentRequest = new
                {
                    UDID = udid,
                    ProfileId = profileId,
                    BusinessManagerId = _appleBusinessManagerId
                };

                var token = GenerateAppleToken();
                _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                var response = await _httpClient.PostAsJsonAsync("https://mdmenrollment.apple.com/profile/assign", assignmentRequest);
                
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to assign MDM profile for UDID: {udid}");
                return false;
            }
        }

        private string GenerateAppleToken()
        {
            return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_appleBusinessManagerId}:{DateTime.UtcNow.Ticks}"));
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
                Source = "AppleBusinessManager"
            };

            _logger.LogInformation("AUDIT: {AuditEvent}", JsonSerializer.Serialize(auditEvent));
        }
    }

    public class AppleEnrollmentRequest
    {
        public string UDID { get; set; }
        public string MDMProfileId { get; set; }
        public string BusinessManagerId { get; set; }
        public string EnrolledBy { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class AppleEnrollmentResult
    {
        public string UDID { get; set; }
        public string EnrollmentStatus { get; set; }
        public string ProfileId { get; set; }
        public DateTime EnrolledAt { get; set; }
        public bool Success { get; set; }
    }
}