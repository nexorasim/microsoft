using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace NexoraSIM.EntitlementServer;

public class EntitlementFunction
{
    private readonly ILogger<EntitlementFunction> _logger;
    private readonly IEntitlementService _entitlementService;
    private readonly IAuditService _auditService;

    public EntitlementFunction(ILogger<EntitlementFunction> logger, 
        IEntitlementService entitlementService, IAuditService auditService)
    {
        _logger = logger;
        _entitlementService = entitlementService;
        _auditService = auditService;
    }

    [Function("TransferProfile")]
    public async Task<HttpResponseData> TransferProfile(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "profiles/transfer")] HttpRequestData req)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<TransferRequest>(req.Body);
            
            await _auditService.LogAsync("ProfileTransfer", "Initiated", request.SourceDeviceId, request.UserId);
            
            var result = await _entitlementService.TransferProfileAsync(request);
            
            await _auditService.LogAsync("ProfileTransfer", "Completed", request.SourceDeviceId, request.UserId);
            
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Profile transfer failed");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new { error = "Transfer failed" });
            return response;
        }
    }

    [Function("ActivateProfile")]
    public async Task<HttpResponseData> ActivateProfile(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "profiles/{iccid}/activate")] HttpRequestData req,
        string iccid)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<ActivationRequest>(req.Body);
            
            await _auditService.LogAsync("ProfileActivation", "Initiated", iccid, request.UserId);
            
            var result = await _entitlementService.ActivateProfileAsync(iccid, request);
            
            await _auditService.LogAsync("ProfileActivation", "Completed", iccid, request.UserId);
            
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Profile activation failed for ICCID: {ICCID}", iccid);
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new { error = "Activation failed" });
            return response;
        }
    }

    [Function("GetProfileStatus")]
    public async Task<HttpResponseData> GetProfileStatus(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "profiles/{iccid}/status")] HttpRequestData req,
        string iccid)
    {
        try
        {
            var status = await _entitlementService.GetProfileStatusAsync(iccid);
            
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(status);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get profile status for ICCID: {ICCID}", iccid);
            var response = req.CreateResponse(HttpStatusCode.NotFound);
            await response.WriteAsJsonAsync(new { error = "Profile not found" });
            return response;
        }
    }

    [Function("RegisterDevice")]
    public async Task<HttpResponseData> RegisterDevice(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "devices/register")] HttpRequestData req)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<DeviceRegistrationRequest>(req.Body);
            
            await _auditService.LogAsync("DeviceRegistration", "Initiated", request.DeviceId, request.UserId);
            
            var result = await _entitlementService.RegisterDeviceAsync(request);
            
            await _auditService.LogAsync("DeviceRegistration", "Completed", request.DeviceId, request.UserId);
            
            var response = req.CreateResponse(HttpStatusCode.Created);
            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Device registration failed");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new { error = "Registration failed" });
            return response;
        }
    }
}

public record TransferRequest(string SourceDeviceId, string TargetDeviceId, string ProfileId, string UserId);
public record ActivationRequest(string DeviceId, string UserId, Dictionary<string, object> Parameters);
public record DeviceRegistrationRequest(string DeviceId, string DeviceType, string UserId, string Platform);