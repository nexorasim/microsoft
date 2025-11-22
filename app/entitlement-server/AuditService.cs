using Microsoft.Extensions.Logging;

namespace NexoraSIM.EntitlementServer.Services;

public interface IAuditService
{
    Task LogAsync(string action, string status, string resourceId, string userId, string details = null);
}

public class AuditService : IAuditService
{
    private readonly ILogger<AuditService> _logger;

    public AuditService(ILogger<AuditService> logger)
    {
        _logger = logger;
    }

    public async Task LogAsync(string action, string status, string resourceId, string userId, string details = null)
    {
        var auditLog = new
        {
            Timestamp = DateTime.UtcNow,
            Action = action,
            Status = status,
            ResourceId = resourceId,
            UserId = userId,
            Details = details
        };

        _logger.LogInformation("Audit: {@AuditLog}", auditLog);
        await Task.CompletedTask;
    }
}