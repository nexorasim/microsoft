using Microsoft.Extensions.Logging;
using NexoraSIM.EntitlementServer.Configuration;
using NexoraSIM.Shared.Models;

namespace NexoraSIM.EntitlementServer.Services;

public interface IEntitlementService
{
    Task<TransferOperation> TransferProfileAsync(TransferRequest request);
    Task<ESIMProfile> ActivateProfileAsync(string iccid, ActivationRequest request);
    Task<ESIMProfile> GetProfileStatusAsync(string iccid);
    Task<Device> RegisterDeviceAsync(DeviceRegistrationRequest request);
}

public class EntitlementService : IEntitlementService
{
    private readonly ILogger<EntitlementService> _logger;
    private readonly IAuditService _auditService;
    private readonly ICarrierService _carrierService;

    public EntitlementService(
        ILogger<EntitlementService> logger,
        IAuditService auditService,
        ICarrierService carrierService)
    {
        _logger = logger;
        _auditService = auditService;
        _carrierService = carrierService;
    }

    public async Task<TransferOperation> TransferProfileAsync(TransferRequest request)
    {
        var operation = new TransferOperation
        {
            OperationId = Guid.NewGuid(),
            SourceDeviceId = request.SourceDeviceId,
            TargetDeviceId = request.TargetDeviceId,
            ProfileId = request.ProfileId,
            Status = TransferStatus.Initiated,
            InitiatedAt = DateTime.UtcNow,
            UserId = request.UserId
        };

        try
        {
            await _auditService.LogAsync("ProfileTransfer", "Initiated", request.ProfileId, request.UserId);
            
            var profile = await GetProfileStatusAsync(request.ProfileId);
            if (profile.Status != ProfileStatus.Enabled)
            {
                throw new InvalidOperationException("Profile must be enabled for transfer");
            }

            var carrierConfig = CarrierConfigurations.Carriers[profile.CarrierCode];
            var result = await _carrierService.TransferProfileAsync(carrierConfig, request);
            
            operation.Status = TransferStatus.Completed;
            operation.CompletedAt = DateTime.UtcNow;
            
            await _auditService.LogAsync("ProfileTransfer", "Completed", request.ProfileId, request.UserId);
            
            return operation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Profile transfer failed for operation {OperationId}", operation.OperationId);
            operation.Status = TransferStatus.Failed;
            operation.ErrorMessage = ex.Message;
            
            await _auditService.LogAsync("ProfileTransfer", "Failed", request.ProfileId, request.UserId, ex.Message);
            
            return operation;
        }
    }

    public async Task<ESIMProfile> ActivateProfileAsync(string iccid, ActivationRequest request)
    {
        try
        {
            await _auditService.LogAsync("ProfileActivation", "Initiated", iccid, request.UserId);
            
            var profile = await GetProfileStatusAsync(iccid);
            var carrierConfig = CarrierConfigurations.Carriers[profile.CarrierCode];
            
            var activatedProfile = await _carrierService.ActivateProfileAsync(carrierConfig, iccid, request);
            
            await _auditService.LogAsync("ProfileActivation", "Completed", iccid, request.UserId);
            
            return activatedProfile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Profile activation failed for ICCID {ICCID}", iccid);
            await _auditService.LogAsync("ProfileActivation", "Failed", iccid, request.UserId, ex.Message);
            throw;
        }
    }

    public async Task<ESIMProfile> GetProfileStatusAsync(string iccid)
    {
        // Implementation would query Cosmos DB for profile status
        // This is a placeholder for the actual implementation
        throw new NotImplementedException("Profile status retrieval not yet implemented");
    }

    public async Task<Device> RegisterDeviceAsync(DeviceRegistrationRequest request)
    {
        try
        {
            await _auditService.LogAsync("DeviceRegistration", "Initiated", request.DeviceId, request.UserId);
            
            var device = new Device
            {
                DeviceId = request.DeviceId,
                DeviceType = request.DeviceType,
                Platform = request.Platform,
                RegisteredAt = DateTime.UtcNow,
                UserId = request.UserId,
                Capability = DetermineDeviceCapability(request.DeviceType, request.Platform)
            };
            
            // Store device in Cosmos DB
            // Implementation would persist the device record
            
            await _auditService.LogAsync("DeviceRegistration", "Completed", request.DeviceId, request.UserId);
            
            return device;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Device registration failed for device {DeviceId}", request.DeviceId);
            await _auditService.LogAsync("DeviceRegistration", "Failed", request.DeviceId, request.UserId, ex.Message);
            throw;
        }
    }

    private static DeviceCapability DetermineDeviceCapability(string deviceType, string platform)
    {
        return (deviceType.ToLower(), platform.ToLower()) switch
        {
            ("smartphone", "ios") when deviceType.Contains("iPhone") => DeviceCapability.DualESIM,
            ("smartphone", "android") => DeviceCapability.SingleESIM,
            ("tablet", _) => DeviceCapability.SingleESIM,
            ("smartwatch", _) => DeviceCapability.SingleESIM,
            _ => DeviceCapability.SingleESIM
        };
    }
}