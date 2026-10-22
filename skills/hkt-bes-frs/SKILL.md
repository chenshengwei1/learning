---
name: hkt-bes-frs
description: Generate HKT-PE BES FRS (Functional Requirements Specification) Word documents using the standard template. Use when the user asks to create or write a requirements document, FRS, functional spec, CR (Change Request) document for the HKT-PE BES / PCCW-HKT / Huawei billing & charging system (CBS, CSP, ESP, CRM, MDS-C, vUGW, vPCRF, Gy/Gx/Sy interface, roaming, offer, VAS, CDR, rating & charging, bill presentation, GL booking) in the standard HKT-PE BES FRS format. Triggers include "生成FRS", "写需求文档", "按模板出FRS", "HKT BES 需求", "CR 需求文档", "Functional Requirements Specification", and any request to produce a document matching the uploaded "HKT-PE BES FRS" template.
---

# HKT-PE BES FRS Generator

Generate a new HKT-PE BES FRS `.docx` document by filling the bundled standard template.

## Template asset

- Path: `assets/HKT-PE BES FRS Template.dotx` (relative to this skill directory).
- This is the source `.dotx` (Word template). Always work on a **copy**, never modify the original.
- The template is in **English**; all FRS body text must remain English unless the user explicitly asks otherwise.
- The template carries Huawei cover page, copyright/notice block, Change History table, auto TOC, and the 11-section FRS skeleton.

## Workflow

1. **Load the word skill** before touching any `.docx`/`.dotx` — read `word/SKILL.md` and follow its "新建 Word → Option 1 有模板创建" flow. This skill only provides the FRS-specific template and section rules; the word skill owns all docx editing mechanics.
2. **Copy the template to a working `.docx`**:
   - `.dotx` cannot be opened directly by `python-docx`. Convert first:
     ```bash
     libreoffice --headless --convert-to docx "<skill_dir>/assets/HKT-PE BES FRS Template.dotx" --outdir <work_dir>
     ```
   - Rename the output to the target filename, e.g. `HKT-PE BES FRS <FeatureName> v1.0.docx`. This is `TARGET_DOCX`.
3. **Collect FRS inputs from the user**. If any of the following are missing, ask once (do not fabricate):
   - Feature / offer / CR name (e.g. "ABC Offers")
   - CR Number (e.g. `PE_CR2019056`)
   - Issue / version (e.g. `V1.0`) and date
   - Author(s) / revised-by names
   - Business rules, GUI elements, integration flows, interfaces, charging/bill/GL impacts
4. **Fill the document** following the section rules below. Use the word skill's template-filling rules (same-position replace, copy-like-structure to extend, preserve styles).
5. **Run the word skill's audit + render + catalogue verification** before delivery. Run `scripts/catalogue.py --file TARGET_DOCX` to refresh the TOC.
6. **Deliver** the final `.docx` via `present_files`.

## Standard FRS section structure

The template body (under heading `# <Feature Name>`) must follow this exact outline. Renumber freely for multiple features, but keep the hierarchy and section purposes.

| # | Section | Purpose | Typical content |
|---|---|---|---|
| 1.1 | CR Number | Record the CR ID | One line, e.g. `PE_CR2019056` |
| 1.2 | Overview → 1.2.1 Requirement Introduction | What the feature does, who can subscribe what | Short paragraphs + offer/subscription matrix table (`Offer \| Subscribe in SOP/CSP \| Subscribe in ESP \| Subscribe in ABC Platform`) |
| 1.3 | Business Rules and Assumptions | Enumerated rules table | Table: `Seq. \| Rule Name (Rule_001…) \| Rule Description \| Remark` |
| 1.4 | Solution Design (CRM/GUI Layout) | GUI / offer configuration design | 1.4.1 Solution Overview + subsections per offer/screen. Each UI field uses the **Element table**: `Element \| Type \| Description \| Validation Rule \| Action \| Action Description \| Remarks`. Insert UI screenshots as images where the template has "UI example as below" placeholders. |
| 1.5 | Solution Design (Integration Context) | End-to-end call flows across CBS / vUGW / vPCRF / CSP-DB / external platform | Numbered step-by-step flow text per scenario (subscription, roaming then subscribe, expiry, quota used up, cancel). Reference interfaces Gy / Gx / Sy / RAR / CCR/CCA / SOAP WorkOrderRequest. |
| 1.6 | Solution Design (Interface Specification) | External API contract | Reference to Unified API ICD section; list subscriptive attributes (`C_Rental_Fee`, `C_End_Time`, `C_MCCMNC`, `C_Top_Up_Volume`, etc.) with attribute codes. |
| 1.7 | Solution Design (CBS & MDS-C) | Charging / mediation / billing | 1.7.1 Rating & Charging (CDR format tables: input/output CDR type, protocol, service condition); 1.7.2 Bill Presentation (Summary Bill / Detail Bill layout notes + screenshots); 1.7.3 GL Booking (mapping factors like `C_CONTENT_CHARGECODE` + Service ID); 1.7.4 Offer Relationship. |
| 1.8 | Impact on the System | Cross-system impact summary | Usually `None` or bullet list. |
| 1.9 | Application Limitations | Known gaps / out-of-scope / deferred to later release | Numbered list. Items pending confirmation are marked `Out of Scope in this CR`. |
| 1.10 | References | Linked documents / offer lists | Document titles like `<< HKT-PE BES ICD-R1.3 Unified API V2.8.docx >>`. |
| 1.11 | Appendix | Attached specs | 1.11.1 Unified API Interface Specification; 1.11.2 KJava Interface Specification & Sample; 1.11.3 CBS API Interface Specification. Attach as embedded content or leave placeholder. |

## Cover page & front matter

Fill exactly these fields on the cover/front matter (do not add or remove blocks):

- Cover title row: `HKT-PE BES FRS <FeatureName> v<x.y>`
- `Issue`: `<version>` (e.g. `V1.0`)
- `Date`: `<YYYY-MM-DD>`
- Company block: keep `HUAWEI TECHNOLOGIES CO., LTD.` and the Huawei address/website/email block unchanged.
- Copyright / Trademarks / Notice paragraphs: **keep verbatim**, do not rewrite.

## Change History table

The template ships with historical rows from the sample ABC CR. **Clear all sample rows and insert one row for the current document**:

| Version | Date | Revised By | Section Modified | Description |
|---|---|---|---|---|
| `0.1` | `<DD/MM/YYYY>` | `<author>` | `All` | `Initial draft version.` |

As revisions happen, append rows (e.g. `0.2`, `0.3` … up to `1.0`). Use date format `DD/MM/YYYY` in this table (matches template).

## Content rules

- **Language**: English, formal telecom/engineering tone. No emoji. No marketing fluff.
- **Attribute codes**: always wrap in backticks/quotes, e.g. `C_ABC_MODE`, `C_Rental_Fee`, `C_End_Time`, `C_MCCMNC`, `C_Top_Up_Volume`, `C_CONTENT_CHARGECODE`, `C_RENT_CHARGE_CODE`.
- **Interfaces**: name interfaces exactly — `Gy`, `Gx`, `Sy`, `RAR`, `RAA`, `CCR`, `CCA`, `CCRi`, `CCRu`, `CCAu`, `SOAP:WorkOrderRequest`, `CHANGESERVICE` provisioning.
- **Result codes**: call out dedicated codes explicitly (e.g. `Result Code 4777` for ABC wall-garden redirect, `2001` for lift).
- **Out-of-scope items**: mark with the exact phrase `Out Of Scope in this CR as requirement is not confirmed yet` when deferring.
- **References to other FRS/ICD docs**: use the `<< Doc Name vX.Y >>` convention.
- **Tables**: reuse the template's existing table styles. When adding rows, copy the nearest existing row's formatting.
- **Screenshots**: insert UI/bill screenshots at the "UI example as below" / "illustrated screenshot" placeholders; preserve original aspect ratio.
- **Placeholders**: for unknown values use `<TBD>` or `TBD` (template convention), never invent values.

## Do not

- Do not translate the Huawei copyright, notice, or address block.
- Do not restructure the 11-section skeleton. If a section is not applicable, keep the heading and write `None` or `N/A` with a one-line reason.
- Do not use Chinese in the FRS body unless the user explicitly requests a bilingual or Chinese document.
- Do not deliver the file as `.dotx`; always deliver `.docx`.
