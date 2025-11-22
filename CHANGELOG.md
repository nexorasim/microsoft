# Changelog | ပြောင်းလဲမှု မှတ်တမ်း

All notable changes to NexoraSIM Enterprise will be documented in this file.

NexoraSIM Enterprise ၏ အရေးကြီးသော ပြောင်းလဲမှုများ အားလုံးကို ဤဖိုင်တွင် မှတ်တမ်းတင်ထားပါမည်။

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

ပုံစံသည် [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) ကို အခြေခံထားပြီး၊ ဤပရောဂျက်သည် [Semantic Versioning](https://semver.org/spec/v2.0.0.html) ကို လိုက်နာပါသည်။

## [Unreleased] | [မထုတ်ဝေရသေး]

### Added | ထပ်ထည့်ထားသည်
- Comprehensive security audit workflows | ပြည့်စုံသော လုံခြုံရေး စာရင်းစစ်မှု လုပ်ငန်းစဉ်များ
- Bilingual UI support (English/Myanmar) | ဘာသာစကား နှစ်ခု UI ပံ့ပိုးမှု (အင်္ဂလိပ်/မြန်မာ)
- OIDC authentication for Azure deployment | Azure အသုံးချမှုအတွက် OIDC အထောက်အထား စစ်ဆေးမှု
- Signed artifact generation and attestation | လက်မှတ်ရေးထိုးထားသော artifact ထုတ်လုပ်မှုနှင့် အတည်ပြုမှု
- SBOM (Software Bill of Materials) generation | SBOM (Software Bill of Materials) ထုတ်လုပ်မှု
- SARIF security scan results | SARIF လုံခြုံရေး စကင်န် ရလဒ်များ
- Accessibility validation with axe and Lighthouse | axe နှင့် Lighthouse ဖြင့် အသုံးပြုနိုင်မှု အတည်ပြုမှု
- Immutable audit logging with Azure SQL Ledger | Azure SQL Ledger ဖြင့် မပြောင်းလဲနိုင်သော စာရင်းစစ် မှတ်တမ်းများ
- Private endpoint security hardening | Private endpoint လုံခြုံရေး မာကျောမှု
- Dependabot automated dependency updates | Dependabot အလိုအလျောက် dependency အပ်ဒိတ်များ

### Changed | ပြောင်းလဲထားသည်
- Updated GitHub workflows to use OIDC instead of service principals | GitHub လုပ်ငန်းစဉ်များကို service principal များအစား OIDC အသုံးပြုရန် အပ်ဒိတ်လုပ်မှု
- Enhanced Bicep templates with security best practices | လုံခြုံရေး အကောင်းဆုံး အလေ့အကျင့်များဖြင့် Bicep template များ မြှင့်တင်မှု
- Improved error handling and logging | အမှား ကိုင်တွယ်မှုနှင့် မှတ်တမ်းတင်မှု တိုးတက်မှု
- Updated compliance documentation for Myanmar PTD requirements | မြန်မာ PTD လိုအပ်ချက်များအတွက် လိုက်နာမှု စာရွက်စာတမ်းများ အပ်ဒိတ်လုပ်မှု

### Security | လုံခြုံရေး
- Implemented branch protection rules | ဘရန်ခ် ကာကွယ်မှု စည်းမျဉ်းများ အကောင်အထည်ဖော်မှု
- Added secret scanning and detection | လျှို့ဝှက်ချက် စကင်န်လုပ်မှုနှင့် ရှာဖွေတွေ့ရှိမှု ထပ်ထည့်မှု
- Enhanced RBAC with least privilege principle | အနည်းဆုံး အခွင့်အရေး နိယာမဖြင့် RBAC မြှင့်တင်မှု
- Implemented Zero Trust network architecture | Zero Trust ကွန်ယက် ဗိသုကာ အကောင်အထည်ဖော်မှု
- Added comprehensive audit trails | ပြည့်စုံသော စာရင်းစစ် လမ်းကြောင်းများ ထပ်ထည့်မှု

### Compliance | လိုက်နာမှု
- GSMA SGP.22/SGP.32 compliance validation | GSMA SGP.22/SGP.32 လိုက်နာမှု အတည်ပြုမှု
- Myanmar PTD telecommunications requirements | မြန်မာ PTD ဆက်သွယ်ရေး လိုအပ်ချက်များ
- GDPR data protection controls | GDPR ဒေတာ ကာကွယ်မှု ထိန်းချုပ်မှုများ
- SOC 2 Type II security controls | SOC 2 Type II လုံခြုံရေး ထိန်းချုပ်မှုများ
- ISO 27001 information security management | ISO 27001 သတင်းအချက်အလက် လုံခြုံရေး စီမံခန့်ခွဲမှု

## [1.0.0] - 2024-01-15

### Added | ထပ်ထည့်ထားသည်
- Initial release of NexoraSIM Enterprise | NexoraSIM Enterprise ၏ ကနဦး ထုတ်ဝေမှု
- eSIM profile management system | eSIM ပရိုဖိုင်း စီမံခန့်ခွဲမှု စနစ်
- Multi-carrier support (MPT, ATOM, U9, MYTEL) | ဆက်သွယ်ရေး ကုမ္ပဏီ များစွာ ပံ့ပိုးမှု
- Device lifecycle management | ကိရိယာ အသက်တာ စီမံခန့်ခွဲမှု
- Azure-based cloud infrastructure | Azure အခြေခံ cloud အခြေခံ အဆောက်အအုံ
- Cloudflare edge integration | Cloudflare edge ချိတ်ဆက်မှု
- Basic audit logging | အခြေခံ စာရင်းစစ် မှတ်တမ်းတင်မှု
- User management and RBAC | အသုံးပြုသူ စီမံခန့်ခွဲမှုနှင့် RBAC
- REST API endpoints | REST API endpoints များ
- Web-based management portal | ဝဘ်အခြေခံ စီမံခန့်ခွဲမှု ပေါ်တယ်

### Security | လုံခြုံရေး
- TLS 1.3 encryption for all communications | ဆက်သွယ်မှု အားလုံးအတွက် TLS 1.3 ကုဒ်ဝှက်ခြင်း
- Azure Key Vault integration | Azure Key Vault ချိတ်ဆက်မှု
- Multi-factor authentication | အများအပြား အချက် အထောက်အထား စစ်ဆေးမှု
- Role-based access control | အခန်းကဏ္ဍအခြေခံ ဝင်ရောက်ခွင့် ထိန်းချုပ်မှု

### Compliance | လိုက်နာမှု
- GSMA SGP.22 compliance | GSMA SGP.22 လိုက်နာမှု
- Basic GDPR controls | အခြေခံ GDPR ထိန်းချုပ်မှုများ
- Myanmar telecommunications regulations | မြန်မာ ဆက်သွယ်ရေး စည်းမျဉ်းများ

---

## Version History | ဗားရှင်း သမိုင်း

### Version Numbering | ဗားရှင်း နံပါတ်စနစ်

This project follows Semantic Versioning (SemVer):
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes | အကြီးအကျယ် ပြောင်းလဲမှုများ
- **MINOR**: New features (backward compatible) | အသစ် လုပ်ဆောင်ချက်များ (နောက်ပြန် လိုက်ဖက်မှု)
- **PATCH**: Bug fixes (backward compatible) | အမှား ပြုပြင်မှုများ (နောက်ပြန် လိုက်ဖက်မှု)

### Release Schedule | ထုတ်ဝေမှု အချိန်ဇယား

- **Major releases**: Quarterly | အဓိက ထုတ်ဝေမှုများ: သုံးလတစ်ကြိမ်
- **Minor releases**: Monthly | အသေးစား ထုတ်ဝေမှုများ: လစဉ်
- **Patch releases**: As needed | ပြုပြင်မှု ထုတ်ဝေမှုများ: လိုအပ်သလို

### Support Policy | ပံ့ပိုးမှု မူဝါဒ

- **Current version**: Full support | လက်ရှိ ဗားရှင်း: အပြည့်အဝ ပံ့ပိုးမှု
- **Previous major version**: Security updates only | ယခင် အဓိက ဗားရှင်း: လုံခြုံရေး အပ်ဒိတ်များသာ
- **End of life**: 12 months after major release | သက်တမ်း ကုန်ဆုံးမှု: အဓိက ထုတ်ဝေမှုပြီး ၁၂ လ

---

## Migration Guides | ရွှေ့ပြောင်းမှု လမ်းညွှန်များ

### Upgrading from v0.x to v1.0 | v0.x မှ v1.0 သို့ အဆင့်မြှင့်တင်မှု

1. **Database Migration** | **ဒေတာဘေ့စ် ရွှေ့ပြောင်းမှု**
   - Run migration scripts in `/scripts/migrations/` | `/scripts/migrations/` တွင်ရှိသော ရွှေ့ပြောင်းမှု script များကို လုပ်ဆောင်ပါ
   - Backup existing data before migration | ရွှေ့ပြောင်းမှုမပြုလုပ်မီ ရှိပြီးသား ဒေတာများကို backup လုပ်ပါ

2. **Configuration Updates** | **ဖွဲ့စည်းမှု အပ်ဒိတ်များ**
   - Update environment variables | ပတ်ဝန်းကျင် ကိန်းရှင်များကို အပ်ဒိတ်လုပ်ပါ
   - Migrate to new authentication system | အသစ် အထောက်အထား စစ်ဆေးမှု စနစ်သို့ ရွှေ့ပြောင်းပါ

3. **API Changes** | **API ပြောင်းလဲမှုများ**
   - Review breaking changes in API documentation | API စာရွက်စာတမ်းတွင် ပျက်စီးစေနိုင်သော ပြောင်းလဲမှုများကို ပြန်လည်စစ်ဆေးပါ
   - Update client applications accordingly | client အပ္ပလီကေးရှင်းများကို သက်ဆိုင်ရာအတိုင်း အပ်ဒိတ်လုပ်ပါ

---

For more detailed information about each release, please refer to the GitHub releases page.

ထုတ်ဝေမှု တစ်ခုစီ၏ အသေးစိတ် အချက်အလက်များအတွက်၊ GitHub releases စာမျက်နှာကို ကြည့်ရှုပါ။