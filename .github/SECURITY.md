# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

### English

If you discover a security vulnerability in NexoraSIM Enterprise, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. Email security@nexorasim.com with details
3. Include steps to reproduce the vulnerability
4. Provide your contact information for follow-up

**Response Timeline:**
- Initial acknowledgment: Within 24 hours
- Preliminary assessment: Within 72 hours
- Resolution timeline: Communicated within 1 week

### Myanmar (မြန်မာ)

NexoraSIM Enterprise တွင် လုံခြုံရေး အားနည်းချက် တွေ့ရှိပါက တာဝန်ယူစွာ အစီရင်ခံပေးပါ:

1. GitHub issue အများပြည်သူမြင်ရအောင် **မဖန်တီးပါနှင့်**
2. security@nexorasim.com သို့ အသေးစိတ်များ ပေးပို့ပါ
3. အားနည်းချက် ပြန်လည်ဖြစ်ပေါ်စေရန် အဆင့်များ ထည့်သွင်းပါ
4. နောက်ဆက်တွဲ ဆက်သွယ်မှုအတွက် သင့်ဆက်သွယ်ရေး အချက်အလက်များ ပေးပါ

**တုံ့ပြန်မှု အချိန်ဇယား:**
- ကနဦး အသိအမှတ်ပြုမှု: ၂၄ နာရီအတွင်း
- ကနဦး အကဲဖြတ်မှု: ၇၂ နာရီအတွင်း
- ဖြေရှင်းမှု အချိန်ဇယား: ၁ ပတ်အတွင်း ဆက်သွယ်မည်

## Security Standards

### Compliance
- GSMA SGP.22/SGP.32 security requirements
- Myanmar PTD telecommunications security standards
- GDPR data protection requirements
- SOC 2 Type II security controls
- ISO 27001 information security management

### Encryption
- AES-256 encryption for data at rest
- TLS 1.3 for data in transit
- Azure Key Vault for key management
- Certificate-based authentication for carrier integration

### Access Control
- Multi-factor authentication required
- Role-based access control (RBAC)
- Conditional access policies
- Privileged access management (PAM)

### Monitoring
- Real-time security monitoring
- Immutable audit logs
- Automated threat detection
- Incident response procedures

## Responsible Disclosure

We follow responsible disclosure practices:

1. **Coordination**: Work with security researchers to understand and validate issues
2. **Timeline**: Provide reasonable time for fixes before public disclosure
3. **Credit**: Acknowledge security researchers in our security advisories
4. **Updates**: Keep reporters informed of progress and resolution

## Security Contact

- **Primary**: security@nexorasim.com
- **Emergency**: +95-9-xxx-xxx-xxx (24/7 security hotline)
- **PGP Key**: Available at https://nexorasim.com/.well-known/security.txt

## Bug Bounty Program

We operate a private bug bounty program for qualified security researchers. Contact security@nexorasim.com for program details and eligibility requirements.

### Scope
- NexoraSIM Enterprise platform
- eSIM entitlement server
- Management portal
- API endpoints
- Infrastructure components

### Out of Scope
- Third-party carrier systems
- Social engineering attacks
- Physical security
- Denial of service attacks
- Spam or phishing attacks