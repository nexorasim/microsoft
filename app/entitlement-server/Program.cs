using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using NexoraSIM.EntitlementServer.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services.AddHttpClient();
        services.AddScoped<IEntitlementService, EntitlementService>();
        services.AddScoped<ICarrierService, CarrierService>();
        services.AddScoped<IAuditService, AuditService>();
    })
    .Build();

host.Run();