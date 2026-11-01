# ශ්‍රී ලංකාවේ සෞඛ්‍ය තොරතුරු පද්ධති සඳහා දත්ත ආරක්ෂණ සහ ආරක්ෂක ප්‍රමිති ලේඛනය
## (Sri Lanka Healthcare Data Protection & Security Compliance Framework: PDPA + HIPAA)

**අනුවාදය (Version):** 1.0  
**අදාළත්වය:** ශ්‍රී ලංකාව තුළ ක්‍රියාත්මක වන රෝහල්, සායන (Clinics), රසායනාගාර, ෆාමසි සහ සෞඛ්‍ය මෘදුකාංග (Health-Tech / Medical Software) සංවර්ධනය කරන ආයතන සඳහා.

---

## 1. හැඳින්වීම සහ අරමුණ (Introduction & Purpose)
මෙම ලේඛනයේ අරමුණ වන්නේ **ශ්‍රී ලංකාවේ 2022 අංක 9 දරන පෞද්ගලික දත්ත ආරක්ෂණ පනතේ (PDPA)** නීතිමය අවශ්‍යතාවයන් සහ ජාත්‍යන්තර **HIPAA (Health Insurance Portability and Accountability Act)** හි දැඩි තාක්ෂණික ආරක්ෂණ ප්‍රමිතීන් (Technical & Security Standards) ඒකාබද්ධ කරමින්, රෝගීන්ගේ සෞඛ්‍ය දත්ත උපරිම ආරක්ෂාවක් සහිතව හැසිරවීම සඳහා පොදු ප්‍රතිපත්තියක් (Standard Policy & Technical Checklist) සැකසීමයි.

---

## 2. නීතිමය සහ නියාමන පදනම (Legal & Regulatory Baseline)
ශ්‍රී ලංකාව තුළ ක්‍රියාත්මක වන ඕනෑම ඩිජිටල් සෞඛ්‍ය පද්ධතියක් පහත නීති සහ ප්‍රමිතීන්ට අනුකූල විය යුතුය:
1. **2022 අංක 9 දරන පෞද්ගලික දත්ත ආරක්ෂණ පනත (PDPA - Sri Lanka):** නීතිමය අනුකූලතාවය සහ රෝගීන්ගේ අයිතිවාසිකම්.
2. **HIPAA Security & Privacy Rules (USA Best Practices):** දත්ත ගබඩා කිරීම, හුවමාරු කිරීම සහ පද්ධති ආරක්ෂාව පිළිබඳ තාක්ෂණික මාර්ගෝපදේශ.
3. **2007 අංක 24 දරන පරිගණක අපරාධ පනත (Computer Crimes Act - Sri Lanka):** අනවසර ඇතුළුවීම් සහ දත්ත අවභාවිතයට එරෙහි නීතිමය පියවර.
4. **Ministry of Health (SL) Digital Health Guidelines & SLMC Ethics:** වෛද්‍ය ආචාරධර්ම සහ ජාතික ඩිජිටල් සෞඛ්‍ය ප්‍රමිතීන්.

---

## 3. ප්‍රධාන අර්ථ දැක්වීම් (Key Definitions - PDPA & HIPAA Mapping)

| සංකල්පය (Concept) | ශ්‍රී ලංකා PDPA යෙදුම | HIPAA යෙදුම | සරල පැහැදිලි කිරීම |
| :--- | :--- | :--- | :--- |
| **සෞඛ්‍ය දත්ත** | Special Categories of Personal Data (විශේෂ කාණ්ඩයේ දත්ත) | PHI / ePHI (Electronic Protected Health Information) | රෝගියෙකු හඳුනාගත හැකි ඕනෑම වෛද්‍ය වාර්තාවක්, බෙහෙත් තුණ්ඩුවක්, පරීක්ෂණ වාර්තාවක් හෝ පෞද්ගලික තොරතුරක්. |
| **රෝගියා** | Data Subject (දත්ත හිමිකරු) | Patient / Individual | දත්තවල නීත්‍යානුකූල අයිතිකරු (රෝගියා). |
| **රෝහල / වෛද්‍ය ආයතනය** | Data Controller (දත්ත පාලක) | Covered Entity | රෝගියාගේ දත්ත එකතු කරන සහ ඒ පිළිබඳ තීරණ ගන්නා ප්‍රධාන ආයතනය. |
| **Software සමාගම / Hosting** | Data Processor (දත්ත සකසන්නා) | Business Associate | රෝහල වෙනුවෙන් මෘදුකාංග හදන, නඩත්තු කරන හෝ දත්ත ගබඩා කරන තුන්වන පාර්ශවය. |
| **ගිවිසුම** | Data Processing Agreement (DPA) | Business Associate Agreement (BAA) | රෝහල සහ Software සමාගම අතර අත්සන් කළ යුතු රහස්‍යභාවය සහ වගකීම් පිළිබඳ නීතිමය ගිවිසුම. |

---

## 4. ආරක්ෂා කළ යුතු සෞඛ්‍ය දත්ත (Protected Health Data Scope)
පද්ධතිය මගින් පහත සඳහන් දත්ත **ඉහළම සංවේදී දත්ත (Highly Sensitive / ePHI)** ලෙස සලකා ආරක්ෂා කළ යුතුය:
* **පුද්ගල හඳුනාගැනීමේ දත්ත:** සම්පූර්ණ නම, ජාතික හැඳුනුම්පත් අංකය (NIC), විදේශ ගමන් බලපත්‍ර අංකය, ලිපිනය, දුරකථන අංක, Email ලිපින, උපන්දිනය.
* **වෛද්‍යමය දත්ත:** රෝග විනිශ්චයන් (Diagnoses), බෙහෙත් තුණ්ඩු (Prescriptions), රසායනාගාර වාර්තා (Lab Reports), X-Ray/Scan ඡායාරූප, අසාත්මිකතා (Allergies), මානසික සෞඛ්‍ය වාර්තා.
* **ජෛවමිතික සහ තාක්ෂණික දත්ත:** ඇඟිලි සලකුණු (Biometrics), මුහුණේ ඡායාරූප, රෝගියා පද්ධතියට සම්බන්ධ වන IP ලිපින සහ Device IDs.
* **මූල්‍ය දත්ත:** රෝහල් බිල්පත්, රක්ෂණ (Insurance) විස්තර සහ ගෙවීම් තොරතුරු.

---

## 5. රෝගියාගේ අයිතිවාසිකම් සහ කැමැත්ත (Patient Rights & Consent - PDPA Rules)
1. **පැහැදිලි අවසරය (Explicit Consent):** 
   * රෝගියාගේ දත්ත ලබා ගැනීමට පෙර ඒවා භාවිත කරන අරමුණ පැහැදිලිව (සිංහල, දෙමළ හෝ ඉංග්‍රීසි භාෂාවෙන්) දන්වා රෝගියාගේ කැමැත්ත ලබාගත යුතුය.
2. **අරමුණට පමණක් සීමා වීම (Purpose Limitation):** 
   * වෛද්‍ය ප්‍රතිකාර සඳහා ලබාගත් දත්ත රෝගියාගේ වෙනම අවසරයකින් තොරව වෙළඳ ප්‍රචාරණ (Marketing SMS/Emails) හෝ වෙනත් වාණිජ කටයුතු සඳහා භාවිත කිරීම සපුරා තහනම් වේ.
3. **දත්ත බැලීමේ සහ නිවැරදි කිරීමේ අයිතිය (Right to Access & Rectification):** 
   * තමන්ගේ වෛද්‍ය වාර්තාවල පිටපතක් ඉල්ලා සිටීමටත්, පෞද්ගලික තොරතුරුවල දෝෂ ඇත්නම් ඒවා නිවැරදි කර ගැනීමටත් රෝගියාට අයිතිය ඇත.
4. **අවම දත්ත භාවිතය (Minimum Necessary Rule / Data Minimization):** 
   * අදාළ වෛද්‍ය කටයුත්තට අත්‍යවශ්‍යම දත්ත පමණක් එකතු කළ යුතු අතර, අනවශ්‍ය පෞද්ගලික තොරතුරු එකතු නොකළ යුතුය.

---

## 6. තාක්ෂණික ආරක්ෂණ ප්‍රමිතීන් (Technical Safeguards - HIPAA + PDPA)
මෘදුකාංග සංවර්ධකයින් (Developers) සහ System Administrators විසින් පද්ධතිය නිර්මාණය කිරීමේදී පහත තාක්ෂණික නිර්දේශ අනිවාර්යයෙන්ම ක්‍රියාත්මක කළ යුතුය:

### 6.1 ප්‍රවේශ පාලනය (Access Control)
* **Role-Based Access Control (RBAC):** වෛද්‍යවරයාට, හෙදියට, ෆාමසියට සහ පිළිගැනීමේ නිලධාරියාට (Receptionist) පෙනිය යුත්තේ තම රාජකාරියට අදාළ දත්ත කොටස පමණි. (උදා: Receptionist ට රෝගියාගේ වෛද්‍ය වාර්තා බැලීමට අවසර නොතිබිය යුතුය).
* **Multi-Factor Authentication (MFA/2FA):** වෛද්‍යවරුන් සහ කාර්ය මණ්ඩලය පද්ධතියට ඇතුළු වීමේදී 2FA/OTP භාවිතය අනිවාර්ය කළ යුතුය.
* **Automatic Logoff:** පද්ධතිය විනාඩි 5-10ක් වැනි කාලයක් භාවිත නොකර පවතින විට (Idle state) ඉබේම Log out වන ලෙස සැකසිය යුතුය.

### 6.2 දත්ත ගුප්තකේතනය (Data Encryption)
* **Encryption at Rest (ගබඩා කර ඇති දත්ත):** Database එකේ සහ File Storage (S3/Local Disks) වල තැන්පත් කරන සියලුම ePHI දත්ත සහ Backups **AES-256** වැනි ප්‍රබල ක්‍රමවේදයකින් Encrypt කළ යුතුය. ඉතා සංවේදී ක්ෂේත්‍ර (NIC, දුරකථන අංක, රෝග විනිශ්චය) Application මට්ටමෙන්ද (Field-level encryption) Encrypt කිරීම නිර්දේශ කෙරේ.
* **Encryption in Transit (හුවමාරු වන දත්ත):** Web, Mobile App සහ API අතර සිදුවන සියලුම දත්ත හුවමාරු සඳහා **HTTPS (TLS 1.2 හෝ TLS 1.3)** භාවිතය අනිවාර්ය වේ.

### 6.3 විගණන වාර්තා (Audit Logs & Integrity)
* **Tamper-Proof Audit Trails:** රෝගියෙකුගේ දත්තයක් කවුරුන් විසින් බැලුවේද (Viewed), ඇතුළත් කළේද (Created), වෙනස් කළේද (Updated) හෝ මැකුවේද (Deleted) යන්න පිළිබඳව **User ID, IP Address, Timestamp, සහ Action** සමඟ වෙනස් කළ නොහැකි (Immutable) Log සටහනක් තබා ගත යුතුය.
* **Soft Deletes & Versioning:** වෛද්‍ය වාර්තා කිසිවිටෙකත් Database එකෙන් සම්පූර්ණයෙන්ම මැකී නොයන ලෙස (Soft Delete) සහ පෙර පැවති දත්ත කුමක්දැයි බලාගත හැකි ලෙස (Version History) සැකසිය යුතුය.

### 6.4 ආරක්ෂිත පණිවිඩ යැවීම (Secure Communications - SMS / Email / WhatsApp)
* සාමාන්‍ය SMS හෝ අනාරක්ෂිත Email මගින් රෝගියාගේ රෝග විනිශ්චයන් හෝ සංවේදී වෛද්‍ය වාර්තා කෙලින්ම යැවීම නොකළ යුතුය.
* වාර්තාවක් යැවිය යුතු නම්, ආරක්ෂිත සබැඳියක් (Secure Link) හරහා OTP එකක් හෝ මුරපදයක් ලබා දී Patient Portal එකට ඇතුළු වී බාගත කරගැනීමට සැලැස්විය යුතුය.

---

## 7. දත්ත රඳවා තබා ගැනීම සහ රටින් පිටත ගබඩා කිරීම (Data Retention & Cross-Border Hosting)
1. **Cloud Hosting (Cross-Border Data Transfer - PDPA Sec. 26):**
   * AWS, Google Cloud, Azure හෝ DigitalOcean වැනි විදේශීය Cloud Server එකක දත්ත ගබඩා කරන්නේ නම්, එම සේවාදායකයන් **ISO 27001, SOC 2 සහ HIPAA Compliant** විය යුතු අතර නිසි ආරක්ෂණ ගිවිසුම් (DPA/BAA) සහිත විය යුතුය.
2. **Backups & Disaster Recovery:**
   * දිනපතා ස්වයංක්‍රීයව Encrypted Backups ලබාගත යුතු අතර, හදිසි බිඳවැටීමකදී දත්ත නැවත ලබාගැනීමේ හැකියාව (Disaster Recovery Plan) පරීක්ෂා කළ යුතුය.

---

## 8. පරිපාලන සහ භෞතික ආරක්ෂාව (Administrative & Physical Safeguards)
* **දත්ත ආරක්ෂණ නිලධාරියා (Data Protection Officer - DPO):** PDPA පනතට අනුව විශාල පරිමාණයෙන් සෞඛ්‍ය දත්ත හසුරුවන ආයතනයක් විසින් DPO නිලධාරියෙකු පත් කළ යුතුය.
* **Non-Disclosure Agreements (NDA) & DPA:** කාර්ය මණ්ඩලය සහ මෘදුකාංග සංවර්ධන කණ්ඩායම් සමඟ රහස්‍යභාවය රැකීමේ ගිවිසුම් අත්සන් කළ යුතුය.
* **Production Data භාවිතය තහනම් කිරීම:** මෘදුකාංග පරීක්ෂා කිරීම (Testing / Staging) සඳහා සැබෑ රෝගීන්ගේ දත්ත භාවිත නොකළ යුතු අතර, ඒ සඳහා ව්‍යාජ දත්ත (Dummy / Anonymized Data) පමණක් භාවිත කළ යුතුය.

---

## 9. දත්ත පිටවීමකදී ගත යුතු පියවර (Data Breach Notification Protocol)
යම් හෙයකින් පද්ධතියට සයිබර් ප්‍රහාරයක් එල්ල වී හෝ අත්වැරදීමකින් රෝගී දත්ත පිටවීමක් (Data Breach) සිදුවුවහොත්:
1. **වහාම පාලනය කිරීම (Containment):** අදාළ Server/API ප්‍රවේශයන් වහාම අවහිර කර දත්ත තවදුරටත් පිටවීම නැවැත්වීම.
2. **නීතිමය දැනුම්දීම (DPA Notification):** ශ්‍රී ලංකා PDPA නීතියට අනුව **ශ්‍රී ලංකා දත්ත ආරක්ෂණ අධිකාරියට (Data Protection Authority of Sri Lanka)** නියමිත කාලසීමාව තුළ (සාමාන්‍යයෙන් පැය 72ක් ඇතුළත) දැනුම් දීම.
3. **රෝගීන් දැනුවත් කිරීම:** එම දත්ත පිටවීමෙන් රෝගීන්ගේ පෞද්ගලිකත්වයට දැඩි අවදානමක් ඇත්නම් අදාළ රෝගීන්ව දැනුවත් කිරීම.

---

## 10. මෘදුකාංග සංවර්ධකයින් සඳහා පිරික්සුම් ලැයිස්තුව (Developer Compliance Checklist)

පද්ධතිය Live (Production) දැමීමට පෙර පහත කරුණු සම්පූර්ණ කර ඇත්දැයි පරීක්ෂා කරන්න:

- [ ] රෝගියා ලියාපදිංචි වීමේදී Privacy Policy සහ Consent ලබාගැනීමේ Checkbox එකක් සහ එහි Timestamp එක Database එකේ සටහන් වේද?
- [ ] HTTPS (SSL/TLS) නිවැරදිව ක්‍රියාත්මක වේද?
- [ ] Database එකේ මුරපද (Bcrypt/Argon2) සහ සංවේදී වෛද්‍ය දත්ත (AES-256) Encrypt කර තිබේද?
- [ ] වෛද්‍යවරුන් සහ Admin වරුන් සඳහා 2FA (Two-Factor Authentication) සහ RBAC (Role-Based Access) ක්‍රියාත්මකද?
- [ ] ඕනෑම අයෙකු රෝගියෙකුගේ වාර්තාවක් Open කළ විට එය `audit_logs` table එකේ සටහන් වේද?
- [ ] API Endpoints සියල්ලටම නිසි Authentication (JWT/Sanctum/OAuth) සහ Rate Limiting යොදා තිබේද?
- [ ] Lab Reports / Prescriptions වැනි ගොනු Public Folder වල නොතබා Private / Signed URLs හරහා පමණක් ලබාගත හැකි ලෙස සකසා තිබේද?
- [ ] Error Logs (උදා: Laravel Log / Sentry) තුළ රෝගීන්ගේ පෞද්ගලික තොරතුරු (PHI) ලියැවීම වළක්වා තිබේද?
- [ ] ස්වයංක්‍රීය Encrypted Database Backups ක්‍රියාත්මකද?
- [ ] Client (රෝහල/සායනය) සහ Software සමාගම අතර Data Processing Agreement (DPA) ගිවිසුම අත්සන් කර තිබේද?

---
*සටහන: මෙම ලේඛනය තාක්ෂණික සහ පරිපාලනමය මාර්ගෝපදේශයක් ලෙස සකස් කර ඇති අතර, ආයතනයේ ස්වභාවය අනුව නීතිඥවරයෙකු හෝ Data Protection Officer (DPO) මගින් අවසන් නීතිමය සමාලෝචනයක් සිදු කර ගැනීම නිර්දේශ කෙරේ.*