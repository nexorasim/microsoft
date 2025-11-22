using System.ComponentModel.DataAnnotations;

namespace NexoraSIM.EntitlementServer.Configuration;

public static class CarrierConfigurations
{
    public static readonly Dictionary<string, CarrierConfig> Carriers = new()
    {
        ["MPT"] = new CarrierConfig
        {
            CarrierCode = "MPT",
            CarrierName = "Myanmar Posts and Telecommunications",
            MCC = "414",
            MNC = "01",
            Country = "Myanmar",
            SMDPAddress = "smdp.mpt.com.mm",
            Supports5G = true,
            SupportsVoLTE = true,
            ProfileTemplate = "mpt-profile-template",
            AuthenticationMethod = "certificate",
            CertificatePath = "certificates/mpt-client.p12",
            ApiEndpoint = "https://api.mpt.com.mm/esim/v1",
            TimeoutSeconds = 30,
            RetryAttempts = 3,
            ComplianceLevel = "GSMA-SGP22"
        },
        ["ATOM"] = new CarrierConfig
        {
            CarrierCode = "ATOM",
            CarrierName = "Atom Myanmar",
            MCC = "414",
            MNC = "09",
            Country = "Myanmar",
            SMDPAddress = "smdp.atom.com.mm",
            Supports5G = true,
            SupportsVoLTE = true,
            ProfileTemplate = "atom-profile-template",
            AuthenticationMethod = "certificate",
            CertificatePath = "certificates/atom-client.p12",
            ApiEndpoint = "https://api.atom.com.mm/esim/v1",
            TimeoutSeconds = 30,
            RetryAttempts = 3,
            ComplianceLevel = "GSMA-SGP22"
        },
        ["U9"] = new CarrierConfig
        {
            CarrierCode = "U9",
            CarrierName = "U9 Networks",
            MCC = "414",
            MNC = "99",
            Country = "Myanmar",
            SMDPAddress = "smdp.u9.com.mm",
            Supports5G = false,
            SupportsVoLTE = true,
            ProfileTemplate = "u9-profile-template",
            AuthenticationMethod = "certificate",
            CertificatePath = "certificates/u9-client.p12",
            ApiEndpoint = "https://api.u9.com.mm/esim/v1",
            TimeoutSeconds = 30,
            RetryAttempts = 3,
            ComplianceLevel = "GSMA-SGP22"
        },
        ["MYTEL"] = new CarrierConfig
        {
            CarrierCode = "MYTEL",
            CarrierName = "MyTel",
            MCC = "414",
            MNC = "05",
            Country = "Myanmar",
            SMDPAddress = "smdp.mytel.com.mm",
            Supports5G = true,
            SupportsVoLTE = true,
            ProfileTemplate = "mytel-profile-template",
            AuthenticationMethod = "certificate",
            CertificatePath = "certificates/mytel-client.p12",
            ApiEndpoint = "https://api.mytel.com.mm/esim/v1",
            TimeoutSeconds = 30,
            RetryAttempts = 3,
            ComplianceLevel = "GSMA-SGP22"
        }
    };
}

public record CarrierConfig
{
    [Required] public string CarrierCode { get; init; } = string.Empty;
    [Required] public string CarrierName { get; init; } = string.Empty;
    [Required] public string MCC { get; init; } = string.Empty;
    [Required] public string MNC { get; init; } = string.Empty;
    [Required] public string Country { get; init; } = string.Empty;
    [Required] public string SMDPAddress { get; init; } = string.Empty;
    public bool Supports5G { get; init; }
    public bool SupportsVoLTE { get; init; }
    [Required] public string ProfileTemplate { get; init; } = string.Empty;
    [Required] public string AuthenticationMethod { get; init; } = string.Empty;
    [Required] public string CertificatePath { get; init; } = string.Empty;
    [Required] public string ApiEndpoint { get; init; } = string.Empty;
    public int TimeoutSeconds { get; init; } = 30;
    public int RetryAttempts { get; init; } = 3;
    [Required] public string ComplianceLevel { get; init; } = string.Empty;
}