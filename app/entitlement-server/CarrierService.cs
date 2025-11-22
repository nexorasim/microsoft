using Microsoft.Extensions.Logging;
using NexoraSIM.EntitlementServer.Configuration;
using NexoraSIM.Shared.Models;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;

namespace NexoraSIM.EntitlementServer.Services;

public interface ICarrierService
{
    Task<TransferOperation> TransferProfileAsync(CarrierConfig config, TransferRequest request);
    Task<ESIMProfile> ActivateProfileAsync(CarrierConfig config, string iccid, ActivationRequest request);
    Task<bool> ValidateCarrierConnectionAsync(string carrierCode);
}

public class CarrierService : ICarrierService
{
    private readonly ILogger<CarrierService> _logger;
    private readonly HttpClient _httpClient;
    private readonly IAuditService _auditService;

    public CarrierService(ILogger<CarrierService> logger, HttpClient httpClient, IAuditService auditService)
    {
        _logger = logger;
        _httpClient = httpClient;
        _auditService = auditService;
    }

    public async Task<TransferOperation> TransferProfileAsync(CarrierConfig config, TransferRequest request)
    {
        try
        {
            await _auditService.LogAsync("CarrierTransfer", "Initiated", request.ProfileId, request.UserId, $"Carrier: {config.CarrierCode}");
            
            var client = CreateAuthenticatedClient(config);
            var transferPayload = new
            {
                iccid = request.ProfileId,
                sourceEid = request.SourceDeviceId,
                targetEid = request.TargetDeviceId,
                operationId = Guid.NewGuid().ToString()
            };

            var response = await client.PostAsJsonAsync($"{config.ApiEndpoint}/profiles/transfer", transferPayload);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<CarrierTransferResponse>();
            
            await _auditService.LogAsync("CarrierTransfer", "Completed", request.ProfileId, request.UserId, $"Carrier: {config.CarrierCode}, Status: {result?.Status}");
            
            return new TransferOperation
            {
                OperationId = Guid.Parse(result?.OperationId ?? Guid.NewGuid().ToString()),
                SourceDeviceId = request.SourceDeviceId,
                TargetDeviceId = request.TargetDeviceId,
                ProfileId = request.ProfileId,
                Status = MapCarrierStatus(result?.Status),
                InitiatedAt = DateTime.UtcNow,
                UserId = request.UserId
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Carrier transfer failed for {CarrierCode}", config.CarrierCode);
            await _auditService.LogAsync("CarrierTransfer", "Failed", request.ProfileId, request.UserId, $"Carrier: {config.CarrierCode}, Error: {ex.Message}");
            throw;
        }
    }

    public async Task<ESIMProfile> ActivateProfileAsync(CarrierConfig config, string iccid, ActivationRequest request)
    {
        try
        {
            await _auditService.LogAsync("CarrierActivation", "Initiated", iccid, request.UserId, $"Carrier: {config.CarrierCode}");
            
            var client = CreateAuthenticatedClient(config);
            var activationPayload = new
            {
                iccid = iccid,
                deviceId = request.DeviceId,
                parameters = request.Parameters
            };

            var response = await client.PostAsJsonAsync($"{config.ApiEndpoint}/profiles/activate", activationPayload);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<CarrierActivationResponse>();
            
            await _auditService.LogAsync("CarrierActivation", "Completed", iccid, request.UserId, $"Carrier: {config.CarrierCode}");
            
            return new ESIMProfile
            {
                ICCID = iccid,
                IMSI = result?.IMSI ?? string.Empty,
                CarrierCode = config.CarrierCode,
                DeviceId = request.DeviceId,
                Status = ProfileStatus.Enabled,
                CreatedAt = DateTime.UtcNow,
                ActivatedAt = DateTime.UtcNow,
                ActivationCode = result?.ActivationCode,
                SMDPAddress = config.SMDPAddress
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Carrier activation failed for {CarrierCode}", config.CarrierCode);
            await _auditService.LogAsync("CarrierActivation", "Failed", iccid, request.UserId, $"Carrier: {config.CarrierCode}, Error: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> ValidateCarrierConnectionAsync(string carrierCode)
    {
        if (!CarrierConfigurations.Carriers.TryGetValue(carrierCode, out var config))
        {
            return false;
        }

        try
        {
            var client = CreateAuthenticatedClient(config);
            var response = await client.GetAsync($"{config.ApiEndpoint}/health");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Carrier connection validation failed for {CarrierCode}", carrierCode);
            return false;
        }
    }

    private HttpClient CreateAuthenticatedClient(CarrierConfig config)
    {
        var client = new HttpClient();
        client.Timeout = TimeSpan.FromSeconds(config.TimeoutSeconds);
        
        if (config.AuthenticationMethod == "certificate")
        {
            var certificate = new X509Certificate2(config.CertificatePath);
            var handler = new HttpClientHandler();
            handler.ClientCertificates.Add(certificate);
            client = new HttpClient(handler);
        }
        
        client.DefaultRequestHeaders.Add("User-Agent", "NexoraSIM-Enterprise/1.0");
        client.DefaultRequestHeaders.Add("X-Compliance-Level", config.ComplianceLevel);
        
        return client;
    }

    private static TransferStatus MapCarrierStatus(string? carrierStatus)
    {
        return carrierStatus?.ToLower() switch
        {
            "initiated" => TransferStatus.Initiated,
            "in_progress" => TransferStatus.InProgress,
            "completed" => TransferStatus.Completed,
            "failed" => TransferStatus.Failed,
            "cancelled" => TransferStatus.Cancelled,
            _ => TransferStatus.Failed
        };
    }
}

public record CarrierTransferResponse(string OperationId, string Status, string? Message);
public record CarrierActivationResponse(string IMSI, string ActivationCode, string Status);