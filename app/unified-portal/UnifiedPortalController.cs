using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Identity.Web;
using System.Security.Claims;

namespace NexoraSIM.Portal
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UnifiedPortalController : ControllerBase
    {
        private readonly VPN.VPNProfileManager _vpnManager;
        private readonly ESIM.ESIMLifecycleManager _esimManager;
        private readonly Drive.DriveAutoRegister _driveManager;
        private readonly ILogger<UnifiedPortalController> _logger;

        public UnifiedPortalController(
            VPN.VPNProfileManager vpnManager,
            ESIM.ESIMLifecycleManager esimManager,
            Drive.DriveAutoRegister driveManager,
            ILogger<UnifiedPortalController> logger)
        {
            _vpnManager = vpnManager;
            _esimManager = esimManager;
            _driveManager = driveManager;
            _logger = logger;
        }

        [HttpPost("initialize-device")]
        public async Task<IActionResult> InitializeDevice([FromBody] DeviceInitRequest request)
        {
            var userId = User.GetObjectId();
            var userPrincipalName = User.GetDisplayName();

            try
            {
                // Auto-register OneDrive/SharePoint
                await _driveManager.RegisterUserDrive(userId, request.DeviceId);

                // Deploy VPN profile based on device platform
                string vpnProfileId = null;
                if (request.Platform == "Windows")
                {
                    var vpnConfig = new VPN.VPNConfiguration
                    {
                        CarrierCode = request.CarrierCode,
                        ServerAddress = GetVPNServerForCarrier(request.CarrierCode),
                        RequireMFA = true
                    };
                    vpnProfileId = await _vpnManager.CreateAlwaysOnVPNProfile(request.DeviceId, vpnConfig);
                }

                // Initialize eSIM profile if requested
                ESIM.ESIMProfile esimProfile = null;
                if (!string.IsNullOrEmpty(request.ICCID))
                {
                    esimProfile = await _esimManager.DownloadProfile(request.CarrierCode, request.ICCID, userId);
                }

                var response = new DeviceInitResponse
                {
                    Success = true,
                    VPNProfileId = vpnProfileId,
                    ESIMProfile = esimProfile,
                    DriveRegistered = true,
                    PowerBIDashboardUrl = $"https://nexorasim.powerappsportals.com/dashboard?user={userId}"
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Device initialization failed for user: {userId}");
                return BadRequest(new { Error = "Device initialization failed" });
            }
        }

        [HttpGet("dashboard-embed")]
        public async Task<IActionResult> GetDashboardEmbed()
        {
            var userId = User.GetObjectId();
            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

            // Generate Power BI embed token based on user roles
            var embedConfig = new
            {
                EmbedUrl = "https://app.powerbi.com/reportEmbed",
                AccessToken = await GeneratePowerBIToken(userId, roles),
                ReportId = GetReportIdForUser(roles),
                Filters = new { UserId = userId }
            };

            return Ok(embedConfig);
        }

        [HttpPost("esim/activate")]
        [Authorize(Roles = "ESIMOperator,ESIMAdmin")]
        public async Task<IActionResult> ActivateESIM([FromBody] ESIMActivateRequest request)
        {
            var success = await _esimManager.ActivateProfile(request.CarrierCode, request.ICCID, request.ActivationCode);
            
            if (success)
            {
                return Ok(new { Message = "eSIM activated successfully" });
            }
            
            return BadRequest(new { Error = "eSIM activation failed" });
        }

        [HttpPost("vpn/validate-compliance")]
        public async Task<IActionResult> ValidateVPNCompliance([FromBody] ComplianceCheckRequest request)
        {
            var isCompliant = await _vpnManager.ValidateVPNCompliance(request.DeviceId);
            
            return Ok(new { IsCompliant = isCompliant });
        }

        private string GetVPNServerForCarrier(string carrierCode)
        {
            return carrierCode switch
            {
                "MPT" => "vpn-mpt.nexorasim.com",
                "ATOM" => "vpn-atom.nexorasim.com",
                "U9" => "vpn-u9.nexorasim.com",
                "MYTEL" => "vpn-mytel.nexorasim.com",
                _ => "vpn-default.nexorasim.com"
            };
        }

        private async Task<string> GeneratePowerBIToken(string userId, List<string> roles)
        {
            // Simplified - actual implementation would use Power BI REST API
            return $"mock-token-{userId}-{string.Join(",", roles)}";
        }

        private string GetReportIdForUser(List<string> roles)
        {
            if (roles.Contains("ESIMAdmin")) return "admin-dashboard-report-id";
            if (roles.Contains("ESIMOperator")) return "operator-dashboard-report-id";
            return "customer-dashboard-report-id";
        }
    }

    public class DeviceInitRequest
    {
        public string DeviceId { get; set; }
        public string Platform { get; set; }
        public string CarrierCode { get; set; }
        public string ICCID { get; set; }
    }

    public class DeviceInitResponse
    {
        public bool Success { get; set; }
        public string VPNProfileId { get; set; }
        public ESIM.ESIMProfile ESIMProfile { get; set; }
        public bool DriveRegistered { get; set; }
        public string PowerBIDashboardUrl { get; set; }
    }

    public class ESIMActivateRequest
    {
        public string CarrierCode { get; set; }
        public string ICCID { get; set; }
        public string ActivationCode { get; set; }
    }

    public class ComplianceCheckRequest
    {
        public string DeviceId { get; set; }
    }
}