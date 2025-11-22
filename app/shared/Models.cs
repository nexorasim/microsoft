using System.ComponentModel.DataAnnotations;

namespace NexoraSIM.Shared.Models;

public record ESIMProfile
{
    public string ICCID { get; init; } = string.Empty;
    public string IMSI { get; init; } = string.Empty;
    public string CarrierCode { get; init; } = string.Empty;
    public string DeviceId { get; init; } = string.Empty;
    public ProfileStatus Status { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? ActivatedAt { get; init; }
    public string? ActivationCode { get; init; }
    public string? SMDPAddress { get; init; }
}

public enum ProfileStatus
{
    Created,
    Downloaded,
    Installed,
    Enabled,
    Disabled,
    Deleted
}

public record Device
{
    public string DeviceId { get; init; } = string.Empty;
    public string EID { get; init; } = string.Empty;
    public string DeviceType { get; init; } = string.Empty;
    public string Platform { get; init; } = string.Empty;
    public string? Model { get; init; }
    public string? OSVersion { get; init; }
    public DeviceCapability Capability { get; init; }
    public DateTime RegisteredAt { get; init; }
    public string UserId { get; init; } = string.Empty;
}

public enum DeviceCapability
{
    SingleESIM,
    DualESIM,
    MultipleESIM
}

public record Carrier
{
    public string CarrierCode { get; init; } = string.Empty;
    public string CarrierName { get; init; } = string.Empty;
    public string MCC { get; init; } = string.Empty;
    public string MNC { get; init; } = string.Empty;
    public string Country { get; init; } = string.Empty;
    public bool Supports5G { get; init; }
    public bool SupportsVoLTE { get; init; }
    public string SMDPAddress { get; init; } = string.Empty;
}

public record AuditLog
{
    public Guid LogId { get; init; }
    public DateTime Timestamp { get; init; }
    public string UserId { get; init; } = string.Empty;
    public string Action { get; init; } = string.Empty;
    public string ResourceType { get; init; } = string.Empty;
    public string ResourceId { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Details { get; init; }
    public string? IPAddress { get; init; }
    public string? UserAgent { get; init; }
}

public record TransferOperation
{
    public Guid OperationId { get; init; }
    public string SourceDeviceId { get; init; } = string.Empty;
    public string TargetDeviceId { get; init; } = string.Empty;
    public string ProfileId { get; init; } = string.Empty;
    public TransferStatus Status { get; init; }
    public DateTime InitiatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string UserId { get; init; } = string.Empty;
    public string? ErrorMessage { get; init; }
}

public enum TransferStatus
{
    Initiated,
    InProgress,
    Completed,
    Failed,
    Cancelled
}

public record OperationMetrics
{
    public DateTime Timestamp { get; init; }
    public string CarrierCode { get; init; } = string.Empty;
    public string Operation { get; init; } = string.Empty;
    public int SuccessCount { get; init; }
    public int FailureCount { get; init; }
    public double AverageLatency { get; init; }
    public string Region { get; init; } = string.Empty;
}