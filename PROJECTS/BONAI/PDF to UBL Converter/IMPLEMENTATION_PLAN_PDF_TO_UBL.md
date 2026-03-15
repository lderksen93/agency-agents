# PDF to UBL Converter — Implementation Plan voor Claude Code

## Project Overzicht

**Product**: Procai PDF-to-UBL Converter
**Klant**: Basecone (Wolters Kluwer) — zoekt externe partij voor PDF naar UBL conversie
**Contact bij vragen**: info@procai.nl
**Doelgroep**: Accountantskantoren en bedrijven die PDF-facturen willen omzetten naar UBL XML (Peppol BIS Billing 3.0)

### Kernfunctionaliteit
Een SaaS-platform dat PDF-facturen omzet naar gevalideerde UBL XML (Peppol BIS 3.0 / EN 16931), aangedreven door AI (Google Document AI of OpenRouter LLM-modellen). Het platform biedt zowel een web-interface als een REST API, met gebruikersbeheer, credit-systeem en zekerheidsscores per dataveld.

### Privacy & Compliance
- **Zero Data Retention**: Er worden GEEN documenten of data opgeslagen na verwerking. Dit moet prominent zichtbaar zijn in de UI en documentatie.
- **Europese Servers**: Alle AI-verwerking draait uitsluitend op Europese servers. Dit moet duidelijk vermeld worden in het admin-dashboard en op de landingspagina.

---

## Tech Stack

| Component | Technologie |
|-----------|-------------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| **Backend API** | Next.js API Routes (of aparte Express.js server) |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Auth** | NextAuth.js (credentials + email magic link) |
| **AI Extractie** | Google Document AI Invoice Parser EN/OF OpenRouter API |
| **UBL Generatie** | Custom XML builder (xmlbuilder2) |
| **UBL Validatie** | Schematron validatie (PEPPOL-EN16931-UBL.sch + CEN-EN16931-UBL.sch) |
| **File Handling** | Multer (upload) + Sharp (image processing) |
| **Queue** | BullMQ + Redis (voor async PDF-verwerking) |
| **Deployment** | Docker containers op EU-based hosting (Hetzner/Scaleway) |

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER & AUTH
// ============================================

enum Role {
  ADMIN
  USER
  VIEWER
}

model Organization {
  id            String    @id @default(cuid())
  name          String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Credit systeem
  creditBalance Int       @default(1000) // Begint met 1000 gratis credits
  totalUsed     Int       @default(0)
  
  // AI Provider configuratie
  aiProvider          String  @default("document_ai") // "document_ai" | "openrouter"
  documentAiProjectId String?
  documentAiLocation  String? @default("eu")
  documentAiProcessorId String?
  documentAiApiKey    String? // Encrypted opslaan
  openrouterApiKey    String? // Encrypted opslaan
  openrouterModel     String? @default("google/gemini-2.0-flash-001")
  
  // Administratie standaard-info (optioneel mee te geven)
  defaultAdminName    String?
  defaultAdminAddress String?
  defaultAdminKvk     String?
  defaultAdminIban    String?
  
  users         User[]
  apiKeys       ApiKey[]
  conversions   Conversion[]
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String?
  passwordHash   String?
  role           Role     @default(USER)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  conversions    Conversion[]
}

model ApiKey {
  id             String   @id @default(cuid())
  key            String   @unique // "prc_" prefix + random
  name           String   // Door gebruiker gekozen naam
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  lastUsedAt     DateTime?
  createdAt      DateTime @default(now())
  isActive       Boolean  @default(true)
}

// ============================================
// CONVERSIONS & RESULTS
// ============================================

enum ConversionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  FLAGGED // Niet-factuur gedetecteerd (aanmaning, bankafschrift, etc.)
}

enum DocumentType {
  INVOICE           // Standaard factuur
  CREDIT_NOTE       // Creditnota
  NOT_INVOICE       // Geen factuur (aanmaning, bankafschrift, etc.)
  MULTI_INVOICE     // PDF bevat meerdere facturen
}

model Conversion {
  id               String           @id @default(cuid())
  organizationId   String
  organization     Organization     @relation(fields: [organizationId], references: [id])
  userId           String?
  user             User?            @relation(fields: [userId], references: [id])
  
  status           ConversionStatus @default(PENDING)
  documentType     DocumentType     @default(INVOICE)
  
  // Input metadata (GEEN bestanden opslaan — zero data retention)
  originalFilename String
  pageCount        Int?
  fileSize         Int?             // in bytes
  
  // Administratie context (meegegeven bij upload)
  adminName        String?
  adminAddress     String?
  adminKvk         String?
  adminIban        String?
  
  // AI resultaat
  overallConfidence Float?          // 0.0 - 1.0 totale zekerheid
  flaggedForReview  Boolean         @default(false)
  flagReason        String?         // "not_invoice:aanmaning" / "low_confidence" / etc.
  
  // Detectie info
  detectedInvoiceCount Int          @default(1)
  
  // Processing metadata
  aiProvider        String?         // Welk AI model is gebruikt
  processingTimeMs  Int?
  creditsUsed       Int             @default(1)
  
  createdAt         DateTime        @default(now())
  completedAt       DateTime?
  
  // Resultaten (meerdere UBLs per conversie mogelijk bij multi-invoice)
  results           ConversionResult[]
}

model ConversionResult {
  id             String     @id @default(cuid())
  conversionId   String
  conversion     Conversion @relation(fields: [conversionId], references: [id])
  
  invoiceIndex   Int        @default(0) // 0-based index bij multi-invoice PDFs
  
  // Geëxtraheerde data met confidence scores
  extractedData  Json       // Volledige gestructureerde data
  fieldScores    Json       // Per-veld confidence: { "invoiceNumber": 0.98, "totalAmount": 0.75, ... }
  
  // Gegenereerde UBL XML (tijdelijk in memory, NIET persistent)
  // Bij API response wordt dit direct teruggestuurd
  ublXml         String?    @db.Text // Tijdelijk voor response, wordt na levering gewist
  
  // Validatie resultaten
  isValid        Boolean    @default(false)
  validationErrors Json?    // Array van Schematron fouten
  
  // Velden die handmatige controle vereisen
  flaggedFields  Json?      // ["totalAmount", "vatRate", ...] — alles onder threshold
  
  createdAt      DateTime   @default(now())
}
```

---

## Architectuur & Mappenstructuur

```
pdf-to-ubl/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Overzicht conversies
│   │   │   ├── convert/page.tsx      # Upload & conversie UI
│   │   │   ├── results/[id]/page.tsx # Resultaat met review UI
│   │   │   ├── api-keys/page.tsx     # API key beheer
│   │   │   └── settings/page.tsx     # Org instellingen
│   │   └── admin/
│   │       ├── page.tsx              # Admin dashboard
│   │       ├── users/page.tsx        # Gebruikersbeheer & rollen
│   │       ├── ai-config/page.tsx    # AI provider configuratie
│   │       └── credits/page.tsx      # Credit overzicht
│   │
│   ├── api/                          # API Routes
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── v1/
│   │   │   ├── convert/route.ts      # POST: PDF upload + conversie
│   │   │   ├── convert/[id]/route.ts # GET: Status + resultaat ophalen
│   │   │   ├── convert/[id]/ubl/route.ts  # GET: Download UBL XML
│   │   │   └── credits/route.ts      # GET: Credit balans
│   │   ├── admin/
│   │   │   ├── users/route.ts
│   │   │   ├── ai-config/route.ts
│   │   │   └── api-keys/route.ts
│   │   └── webhooks/
│   │       └── conversion-complete/route.ts
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── provider-factory.ts        # Factory voor AI provider selectie
│   │   │   ├── document-ai-client.ts      # Google Document AI integratie
│   │   │   ├── openrouter-client.ts       # OpenRouter API integratie
│   │   │   ├── extraction-prompt.ts       # LLM prompt voor factuur-extractie
│   │   │   └── document-classifier.ts     # Classificatie: factuur/bon/aanmaning/etc.
│   │   │
│   │   ├── ubl/
│   │   │   ├── ubl-builder.ts             # UBL XML generatie (xmlbuilder2)
│   │   │   ├── ubl-validator.ts           # Schematron + XSD validatie
│   │   │   ├── ubl-templates.ts           # Template structuur Peppol BIS 3.0
│   │   │   ├── code-lists.ts             # ISO codes, UN/CEFACT codes, etc.
│   │   │   └── schemas/                   # XSD + Schematron bestanden
│   │   │       ├── UBL-Invoice-2.1.xsd
│   │   │       ├── PEPPOL-EN16931-UBL.sch
│   │   │       └── CEN-EN16931-UBL.sch
│   │   │
│   │   ├── pdf/
│   │   │   ├── pdf-splitter.ts            # Detectie + split multi-invoice PDFs
│   │   │   ├── pdf-analyzer.ts            # Pagina-analyse voor splitting
│   │   │   └── pdf-to-image.ts            # PDF naar image voor AI processing
│   │   │
│   │   ├── processing/
│   │   │   ├── conversion-pipeline.ts     # Hoofd orchestratie pipeline
│   │   │   ├── confidence-scorer.ts       # Berekening zekerheidsscores
│   │   │   ├── field-validator.ts         # Business rules validatie per veld
│   │   │   └── credit-manager.ts          # Credit check & deductie
│   │   │
│   │   ├── auth/
│   │   │   ├── auth-options.ts
│   │   │   └── api-key-auth.ts            # API key authenticatie middleware
│   │   │
│   │   └── db/
│   │       └── prisma.ts                  # Prisma client singleton
│   │
│   ├── components/
│   │   ├── ui/                            # shadcn/ui components
│   │   ├── upload/
│   │   │   ├── DropZone.tsx               # PDF upload drag & drop
│   │   │   ├── AdminInfoForm.tsx          # Administratie gegevens invoer
│   │   │   └── UploadProgress.tsx
│   │   ├── results/
│   │   │   ├── FieldConfidenceTable.tsx   # Tabel met per-veld scores
│   │   │   ├── FlaggedFieldsBanner.tsx    # Waarschuwing voor onzekere velden
│   │   │   ├── UblPreview.tsx             # XML preview met syntax highlighting
│   │   │   └── InvoiceDataCard.tsx        # Visuele weergave geëxtraheerde data
│   │   ├── admin/
│   │   │   ├── AiProviderConfig.tsx       # Toggle Document AI / OpenRouter
│   │   │   ├── UserRoleManager.tsx
│   │   │   └── CreditOverview.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── ZeroDataBanner.tsx         # "Zero Data Retention" indicator
│   │
│   └── types/
│       ├── extraction.ts                  # Types voor geëxtraheerde factuurdata
│       ├── ubl.ts                         # Types voor UBL structuur
│       └── api.ts                         # API request/response types
│
├── scripts/
│   └── seed.ts                            # Database seeding
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## Module 1: AI Extractie Layer

### 1A: Provider Factory (`src/lib/ai/provider-factory.ts`)

```typescript
// Abstractie laag die schakelt tussen Document AI en OpenRouter
// Admin kiest in het dashboard welke provider actief is

export interface ExtractionResult {
  documentType: 'invoice' | 'credit_note' | 'not_invoice' | 'multi_invoice';
  notInvoiceReason?: string; // "aanmaning" | "bankafschrift" | "transactieoverzicht" | etc.
  invoiceCount: number; // Aantal facturen gedetecteerd in PDF
  invoices: ExtractedInvoice[];
  rawConfidence: number;
}

export interface ExtractedInvoice {
  fields: Record<string, ExtractedField>;
}

export interface ExtractedField {
  value: string | number | null;
  confidence: number;       // 0.0 - 1.0
  needsReview: boolean;     // true als confidence < threshold (configureerbaar, default 0.85)
  source: string;           // "ai_extracted" | "admin_provided" | "calculated"
}

export function createAiProvider(config: OrgAiConfig): AiProvider {
  if (config.aiProvider === 'document_ai') {
    return new DocumentAiProvider(config);
  } else {
    return new OpenRouterProvider(config);
  }
}
```

### 1B: Google Document AI Client (`src/lib/ai/document-ai-client.ts`)

```typescript
// Integreert met Google Document AI Invoice Parser
// BELANGRIJK: Gebruik ALTIJD eu-documentai.googleapis.com endpoint (EU servers)

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

export class DocumentAiProvider implements AiProvider {
  private client: DocumentProcessorServiceClient;
  
  constructor(config: OrgAiConfig) {
    this.client = new DocumentProcessorServiceClient({
      apiEndpoint: `${config.documentAiLocation || 'eu'}-documentai.googleapis.com`,
    });
  }

  async extract(pdfBuffer: Buffer): Promise<ExtractionResult> {
    // 1. Stuur PDF naar Document AI Invoice Parser
    // 2. Parse entities uit response (supplier_name, invoice_date, total_amount, etc.)
    // 3. Map naar ExtractionResult met confidence scores per entity
    // 4. Classificeer document type (check of het daadwerkelijk een factuur is)
    // 5. Detecteer meerdere facturen (check page breaks, herhaalde header patterns)
  }
}
```

**Relevante Document AI Invoice Parser velden om te mappen:**
- `supplier_name`, `supplier_address`, `supplier_tax_id` → UBL AccountingSupplierParty
- `receiver_name`, `receiver_address`, `receiver_tax_id` → UBL AccountingCustomerParty
- `invoice_id` → UBL cbc:ID
- `invoice_date` → UBL cbc:IssueDate
- `due_date` → UBL cbc:DueDate
- `total_amount`, `net_amount`, `total_tax_amount` → UBL LegalMonetaryTotal
- `currency` → UBL cbc:DocumentCurrencyCode
- `line_item` (herhaald) → UBL InvoiceLine
  - `line_item/description` → cac:Item/cbc:Name
  - `line_item/quantity` → cbc:InvoicedQuantity
  - `line_item/unit_price` → cac:Price/cbc:PriceAmount
  - `line_item/amount` → cbc:LineExtensionAmount
- `payment_terms` → UBL cac:PaymentTerms
- `iban`, `bic` → UBL cac:PaymentMeans
- `vat_rate`, `vat_amount` → UBL cac:TaxTotal/cac:TaxSubtotal

### 1C: OpenRouter Client (`src/lib/ai/openrouter-client.ts`)

```typescript
// OpenAI-compatible API via OpenRouter
// Admin selecteert model in dashboard (bv. google/gemini-2.0-flash, anthropic/claude-sonnet-4, etc.)

export class OpenRouterProvider implements AiProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  async extract(pdfBuffer: Buffer): Promise<ExtractionResult> {
    // 1. Converteer PDF naar base64 images (per pagina)
    // 2. Stuur naar OpenRouter met gestructureerde extractie-prompt
    // 3. Parse JSON response
    // 4. Map naar ExtractionResult
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://procai.nl',
        'X-Title': 'Procai PDF-to-UBL Converter',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: [
              { type: 'image_url', image_url: { url: `data:image/png;base64,${pageImages[0]}` } },
              { type: 'text', text: EXTRACTION_USER_PROMPT }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    });
  }
}
```

### 1D: Extractie Prompt (`src/lib/ai/extraction-prompt.ts`)

```typescript
export const EXTRACTION_SYSTEM_PROMPT = `
Je bent een expert factuur-data extractie systeem. Je analyseert afbeeldingen van documenten en extraheert gestructureerde factuurgegevens.

## STAP 1: DOCUMENT CLASSIFICATIE
Bepaal EERST het type document:
- "invoice" — Standaard inkoopfactuur of verkoopfactuur
- "credit_note" — Creditnota / creditfactuur
- "not_invoice" — Dit is GEEN factuur. Voorbeelden:
  - Aanmaning / betalingsherinnering
  - Bankafschrift / transactieoverzicht
  - Offerte / proforma
  - Pakbon / afleverbon
  - Reclame / brief
  - Onleesbaar document
  Als het geen factuur is, geef dan "notInvoiceReason" met een beschrijving.

## STAP 2: MULTI-FACTUUR DETECTIE
Controleer of de PDF MEERDERE facturen bevat. Signalen:
- Herhaalde factuurnummers op verschillende pagina's
- Verschillende leveranciersnamen
- Meerdere "Factuurdatum" of "Invoice Date" vermeldingen
- Duidelijke scheiding tussen documenten

## STAP 3: DATA EXTRACTIE
Extraheer voor elke factuur de volgende velden. Geef per veld een confidence score (0.0-1.0):

### Verplichte velden:
- invoiceNumber (factuurnummer)
- issueDate (factuurdatum, formaat YYYY-MM-DD)
- invoiceTypeCode ("380" voor factuur, "381" voor creditnota)
- currencyCode (ISO 4217, bv. "EUR")
- buyerReference (referentie koper, indien aanwezig)

### Leverancier (Seller):
- sellerName (bedrijfsnaam leverancier)
- sellerAddress (straat + huisnummer)
- sellerCity
- sellerPostalCode
- sellerCountryCode (ISO 3166-1 alpha-2, bv. "NL")
- sellerVatNumber (BTW-nummer, bv. "NL123456789B01")
- sellerKvkNumber (KVK-nummer)
- sellerIban
- sellerBic

### Afnemer (Buyer):
- buyerName
- buyerAddress
- buyerCity
- buyerPostalCode
- buyerCountryCode
- buyerVatNumber
- buyerKvkNumber

### Bedragen:
- totalNetAmount (totaal exclusief BTW)
- totalVatAmount (totaal BTW)
- totalGrossAmount (totaal inclusief BTW)
- payableAmount (te betalen bedrag)
- dueDate (vervaldatum, formaat YYYY-MM-DD)

### Factuurregels (line items):
Per regel:
- lineNumber
- description (omschrijving)
- quantity (aantal)
- unitCode (eenheid: "C62" = stuk, "HUR" = uur, "DAY" = dag, "MON" = maand, etc.)
- unitPrice (prijs per eenheid excl. BTW)
- lineNetAmount (regeltotaal excl. BTW)
- vatRate (BTW-percentage, bv. 21.00)
- vatCategoryCode ("S" = standaard, "Z" = nultarief, "E" = vrijgesteld, "AE" = btw-verlegd)

### BTW Specificatie:
Per BTW-tarief:
- vatCategoryCode
- vatRate
- taxableAmount (grondslag)
- taxAmount (BTW-bedrag)

### Betaling:
- paymentMeansCode ("30" = overboeking, "58" = SEPA)
- iban
- bic
- paymentReference (betalingskenmerk)

## OUTPUT FORMAAT
Reageer UITSLUITEND met geldig JSON in deze structuur:
{
  "documentType": "invoice" | "credit_note" | "not_invoice" | "multi_invoice",
  "notInvoiceReason": "beschrijving indien not_invoice",
  "invoiceCount": 1,
  "invoices": [
    {
      "fields": {
        "invoiceNumber": { "value": "2024-001", "confidence": 0.98 },
        "issueDate": { "value": "2024-03-15", "confidence": 0.95 },
        // ... alle velden
      },
      "lineItems": [
        {
          "lineNumber": { "value": "1", "confidence": 1.0 },
          "description": { "value": "Consultancy uren maart", "confidence": 0.92 },
          // ... alle regel-velden
        }
      ],
      "vatBreakdown": [
        {
          "vatCategoryCode": { "value": "S", "confidence": 0.99 },
          "vatRate": { "value": 21.00, "confidence": 0.97 },
          "taxableAmount": { "value": 1000.00, "confidence": 0.90 },
          "taxAmount": { "value": 210.00, "confidence": 0.90 }
        }
      ]
    }
  ]
}
`;
```

### 1E: Document Classifier (`src/lib/ai/document-classifier.ts`)

```typescript
// Classificeert of een document een factuur, creditnota of iets anders is
// Detecteert ook aanmaningen, bankafschriften, etc.

export const NON_INVOICE_PATTERNS = {
  aanmaning: [
    'aanmaning', 'betalingsherinnering', 'herinnering', 'payment reminder',
    'eerste aanmaning', 'tweede aanmaning', 'laatste aanmaning',
    'incasso', 'sommatie'
  ],
  bankafschrift: [
    'bankafschrift', 'rekeningoverzicht', 'bank statement',
    'transactieoverzicht', 'dagafschrift', 'account statement'
  ],
  offerte: [
    'offerte', 'quotation', 'quote', 'aanbieding', 'proforma'
  ],
  pakbon: [
    'pakbon', 'afleverbon', 'delivery note', 'packing slip'
  ]
};

// De classifier wordt VOOR de AI extractie uitgevoerd als snelle pre-check,
// en NOGMAALS door de AI bevestigd in de extractie-stap.
```

---

## Module 2: PDF Verwerking

### 2A: PDF Splitter (`src/lib/pdf/pdf-splitter.ts`)

```typescript
// Detecteert meerdere facturen in één PDF en splitst deze

import { PDFDocument } from 'pdf-lib';

export class PdfSplitter {
  /**
   * Analyseert een PDF op meerdere facturen.
   * Signalen voor splitting:
   * 1. AI detecteert meerdere factuurheaders
   * 2. Pagina-analyse: herhaalde patronen (logo posities, "Factuurnummer" headers)
   * 3. Expliciete page breaks tussen documenten
   * 
   * Returns: Array van PDF buffers (elk één factuur)
   */
  async detectAndSplit(pdfBuffer: Buffer): Promise<SplitResult> {
    // Stap 1: Tel pagina's
    // Stap 2: Als >1 pagina, analyseer elke pagina met AI
    // Stap 3: Groepeer pagina's per factuur
    // Stap 4: Splits in aparte PDF buffers
  }
}

interface SplitResult {
  invoiceCount: number;
  pdfBuffers: Buffer[]; // Eén buffer per gedetecteerde factuur
  splitConfidence: number;
}
```

### 2B: PDF naar Image (`src/lib/pdf/pdf-to-image.ts`)

```typescript
// Converteert PDF pagina's naar images voor OpenRouter vision models
// Google Document AI accepteert PDF direct

import { fromBuffer } from 'pdf2pic';

export async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  // Converteer elke pagina naar PNG base64
  // Resolutie: 300 DPI voor goede OCR kwaliteit
  // Max formaat: 20MB per image (OpenRouter limiet)
}
```

---

## Module 3: UBL XML Generatie

### 3A: UBL Builder (`src/lib/ubl/ubl-builder.ts`)

```typescript
import { create } from 'xmlbuilder2';

/**
 * Genereert Peppol BIS Billing 3.0 compliant UBL Invoice XML.
 * 
 * Referenties:
 * - Syntax: https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/tree/
 * - Namespaces:
 *   xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
 *   xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 *   xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
 */
export class UblInvoiceBuilder {
  
  build(data: ExtractedInvoice, adminContext: AdminContext): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', {
        'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      });

    // === HEADER ===
    doc.ele('cbc:CustomizationID')
       .txt('urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0').up();
    doc.ele('cbc:ProfileID')
       .txt('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0').up();
    doc.ele('cbc:ID').txt(data.fields.invoiceNumber.value).up();
    doc.ele('cbc:IssueDate').txt(data.fields.issueDate.value).up();
    
    if (data.fields.dueDate?.value) {
      doc.ele('cbc:DueDate').txt(data.fields.dueDate.value).up();
    }
    
    doc.ele('cbc:InvoiceTypeCode').txt(data.fields.invoiceTypeCode?.value || '380').up();
    doc.ele('cbc:DocumentCurrencyCode').txt(data.fields.currencyCode?.value || 'EUR').up();
    
    if (data.fields.buyerReference?.value) {
      doc.ele('cbc:BuyerReference').txt(data.fields.buyerReference.value).up();
    }

    // === ACCOUNTING SUPPLIER PARTY (Seller) ===
    this.buildSupplierParty(doc, data, adminContext);
    
    // === ACCOUNTING CUSTOMER PARTY (Buyer) ===
    this.buildCustomerParty(doc, data, adminContext);
    
    // === PAYMENT MEANS ===
    this.buildPaymentMeans(doc, data, adminContext);
    
    // === TAX TOTAL ===
    this.buildTaxTotal(doc, data);
    
    // === LEGAL MONETARY TOTAL ===
    this.buildMonetaryTotal(doc, data);
    
    // === INVOICE LINES ===
    for (const line of data.lineItems) {
      this.buildInvoiceLine(doc, line);
    }

    return doc.end({ prettyPrint: true });
  }

  private buildSupplierParty(doc, data, adminContext) {
    const supplier = doc.ele('cac:AccountingSupplierParty').ele('cac:Party');
    
    // EndpointID is VERPLICHT per Peppol (PEPPOL-EN16931-R020)
    // Gebruik BTW-nummer als endpoint als er geen GLN/Peppol ID is
    const endpointId = data.fields.sellerVatNumber?.value || '0000000000';
    supplier.ele('cbc:EndpointID', { schemeID: '9944' }) // 9944 = NL BTW
            .txt(endpointId).up();
    
    // Party Name
    supplier.ele('cac:PartyName')
            .ele('cbc:Name').txt(data.fields.sellerName?.value || '').up().up();
    
    // Postal Address
    const address = supplier.ele('cac:PostalAddress');
    if (data.fields.sellerAddress?.value)
      address.ele('cbc:StreetName').txt(data.fields.sellerAddress.value).up();
    if (data.fields.sellerCity?.value)
      address.ele('cbc:CityName').txt(data.fields.sellerCity.value).up();
    if (data.fields.sellerPostalCode?.value)
      address.ele('cbc:PostalZone').txt(data.fields.sellerPostalCode.value).up();
    address.ele('cac:Country')
           .ele('cbc:IdentificationCode').txt(data.fields.sellerCountryCode?.value || 'NL').up().up();
    address.up();
    
    // PartyTaxScheme (BTW registratie)
    if (data.fields.sellerVatNumber?.value) {
      supplier.ele('cac:PartyTaxScheme')
              .ele('cbc:CompanyID').txt(data.fields.sellerVatNumber.value).up()
              .ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up()
              .up();
    }
    
    // PartyLegalEntity
    supplier.ele('cac:PartyLegalEntity')
            .ele('cbc:RegistrationName').txt(data.fields.sellerName?.value || '').up()
            .ele('cbc:CompanyID').txt(data.fields.sellerKvkNumber?.value || adminContext.kvk || '').up()
            .up();
    
    supplier.up().up(); // Close Party and AccountingSupplierParty
  }

  // buildCustomerParty, buildPaymentMeans, buildTaxTotal, 
  // buildMonetaryTotal, buildInvoiceLine — analoge structuur
}
```

### 3B: UBL Validator (`src/lib/ubl/ubl-validator.ts`)

```typescript
// Valideert gegenereerde UBL XML tegen:
// 1. UBL 2.1 XSD Schema
// 2. CEN-EN16931-UBL Schematron regels
// 3. PEPPOL-EN16931-UBL Schematron regels

export class UblValidator {
  async validate(ublXml: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Stap 1: XSD Schema validatie
    const xsdErrors = await this.validateXsd(ublXml);
    errors.push(...xsdErrors);
    
    // Stap 2: Schematron Business Rules
    // Gebruik xslt3 of saxon-js voor schematron transformatie
    const schematronErrors = await this.validateSchematron(ublXml);
    errors.push(...schematronErrors);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: errors.filter(e => e.severity === 'warning'),
      fatal: errors.filter(e => e.severity === 'fatal'),
    };
  }
}

// Alternatief: gebruik de KoSIT validator (Java) of een online validatie API
// zoals https://peppol.helger.com/public/locale-en_US/menuitem-validation-bis3
```

---

## Module 4: Confidence Scoring & Flagging

### 4A: Confidence Scorer (`src/lib/processing/confidence-scorer.ts`)

```typescript
export const CONFIDENCE_THRESHOLD = 0.85; // Default, configureerbaar per org

export interface ScoredField {
  value: string | number | null;
  confidence: number;
  needsReview: boolean;
  reviewReason?: string;
}

export class ConfidenceScorer {
  
  scoreExtraction(extraction: ExtractionResult): ScoredConversion {
    const flaggedFields: string[] = [];
    
    for (const [fieldName, field] of Object.entries(extraction.invoices[0].fields)) {
      if (field.confidence < CONFIDENCE_THRESHOLD) {
        flaggedFields.push(fieldName);
        field.needsReview = true;
        field.reviewReason = `Zekerheid ${Math.round(field.confidence * 100)}% — onder drempel van ${Math.round(CONFIDENCE_THRESHOLD * 100)}%`;
      }
    }
    
    // Cross-validatie checks:
    this.validateTotals(extraction);      // Controleer of regeltotalen optellen tot factuurtotaal
    this.validateVatCalculation(extraction); // Controleer BTW berekeningen
    this.validateDates(extraction);        // Controleer of datums logisch zijn
    this.validateIban(extraction);         // IBAN checksum validatie
    this.validateVatNumber(extraction);    // BTW-nummer formaat check (VIES)
    
    return {
      overallConfidence: this.calculateOverallConfidence(extraction),
      flaggedFields,
      flaggedForReview: flaggedFields.length > 0,
    };
  }
}
```

---

## Module 5: API Endpoints

### 5A: Conversie API (`src/api/v1/convert/route.ts`)

```typescript
// POST /api/v1/convert
// Content-Type: multipart/form-data
// Headers: Authorization: Bearer <api_key> OF session cookie

// Request body:
// - file: PDF bestand (max 20MB)
// - adminName?: string (administratienaam)
// - adminAddress?: string
// - adminKvk?: string
// - adminIban?: string

// Response (202 Accepted — async processing):
{
  "id": "conv_abc123",
  "status": "processing",
  "estimatedTimeMs": 5000,
  "pollUrl": "/api/v1/convert/conv_abc123"
}

// GET /api/v1/convert/:id
// Response (200 OK — completed):
{
  "id": "conv_abc123",
  "status": "completed",
  "documentType": "invoice",
  "invoiceCount": 1,
  "creditsUsed": 1,
  "creditsRemaining": 999,
  "results": [
    {
      "invoiceIndex": 0,
      "overallConfidence": 0.92,
      "flaggedForReview": true,
      "flaggedFields": ["sellerKvkNumber", "dueDate"],
      "extractedData": {
        "invoiceNumber": { "value": "2024-001", "confidence": 0.99, "needsReview": false },
        "sellerName": { "value": "Bol.com B.V.", "confidence": 0.97, "needsReview": false },
        "sellerKvkNumber": { "value": "32128908", "confidence": 0.72, "needsReview": true },
        // ... alle velden met scores
      },
      "ublXml": "<?xml version=\"1.0\"...>",  // Of via apart endpoint
      "validationResult": {
        "isValid": true,
        "errors": [],
        "warnings": []
      }
    }
  ],
  "zeroDataRetention": true,
  "processedOnEuServers": true
}

// GET /api/v1/convert/:id/ubl?index=0
// Response: application/xml
// Direct download van UBL XML bestand

// Foutafhandeling bij credit limiet:
// 402 Payment Required
{
  "error": "credit_limit_reached",
  "message": "Uw credit limiet van 1000 facturen is bereikt. Neem contact op met info@procai.nl om meer credits aan te schaffen.",
  "creditsUsed": 1000,
  "creditsRemaining": 0,
  "contactEmail": "info@procai.nl"
}
```

### 5B: Credit Management

```typescript
// Elke conversie kost 1 credit, ongeacht aantal pagina's
// Multi-invoice PDFs kosten 1 credit per gedetecteerde factuur
// Startbalans: 1000 credits per organisatie
// Bij 0 credits: blokkeer conversies, toon contactbericht

export class CreditManager {
  async checkAndDeduct(orgId: string, invoiceCount: number): Promise<CreditResult> {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    
    if (org.creditBalance < invoiceCount) {
      return {
        allowed: false,
        message: 'Credit limiet bereikt. Neem contact op met info@procai.nl voor meer credits.',
        remaining: org.creditBalance,
      };
    }
    
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        creditBalance: { decrement: invoiceCount },
        totalUsed: { increment: invoiceCount },
      },
    });
    
    return { allowed: true, remaining: org.creditBalance - invoiceCount };
  }
}
```

---

## Module 6: Web Interface

### 6A: AI Provider Configuratie Pagina (`src/app/admin/ai-config/page.tsx`)

Dit is een cruciaal scherm waar de admin eenvoudig kan:
1. Kiezen tussen Google Document AI en OpenRouter (radio buttons / toggle)
2. Credentials invullen voor de gekozen provider
3. Model selecteren (bij OpenRouter: dropdown met populaire modellen)
4. Connectie testen met een test-factuur

```
┌─────────────────────────────────────────────────────────┐
│  AI Provider Configuratie                               │
│                                                         │
│  ○ Google Document AI        ● OpenRouter               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ OpenRouter Instellingen                          │   │
│  │                                                   │   │
│  │ API Key: [sk-or-v1-***************] [👁 Toon]    │   │
│  │                                                   │   │
│  │ Model:  [▼ google/gemini-2.0-flash-001      ]    │   │
│  │         Populaire keuzes:                         │   │
│  │         • google/gemini-2.0-flash-001 (goedkoop)  │   │
│  │         • anthropic/claude-sonnet-4 (nauwkeurig)  │   │
│  │         • meta-llama/llama-3.3-70b (open source)  │   │
│  │                                                   │   │
│  │ [🔗 Test Verbinding]  ✅ Verbonden               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ℹ️ Alle verwerking vindt plaats op Europese servers.   │
│  ℹ️ Wij hanteren Zero Data Retention — geen documenten  │
│     worden opgeslagen na verwerking.                     │
│                                                         │
│  [Opslaan]                                              │
└─────────────────────────────────────────────────────────┘
```

### 6B: Conversie Resultaat Pagina (`src/app/dashboard/results/[id]/page.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│  Conversie Resultaat — factuur-2024-001.pdf              │
│  Status: ✅ Voltooid  |  Zekerheid: 92%                 │
│                                                         │
│  ⚠️ 2 velden vereisen handmatige controle               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Veld              │ Waarde        │ Score │ ⚠️  │   │
│  │───────────────────│───────────────│───────│─────│   │
│  │ Factuurnummer     │ 2024-001      │  99%  │     │   │
│  │ Leverancier       │ Bol.com B.V.  │  97%  │     │   │
│  │ Factuurdatum      │ 2024-03-15    │  95%  │     │   │
│  │ Totaal excl BTW   │ €1.000,00     │  93%  │     │   │
│  │ BTW               │ €210,00       │  90%  │     │   │
│  │ Vervaldatum       │ 2024-04-15    │  78%  │ ⚠️  │   │
│  │ KVK Leverancier   │ 32128908      │  72%  │ ⚠️  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [📄 Download UBL XML]  [📋 Kopieer XML]  [👁 Preview]  │
│                                                         │
│  ┌─ UBL XML Preview ──────────────────────────────┐    │
│  │ <?xml version="1.0" encoding="UTF-8"?>          │    │
│  │ <Invoice xmlns="urn:oasis:names:spec...">       │    │
│  │   <cbc:CustomizationID>urn:cen.eu:...           │    │
│  │   ...                                           │    │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 6C: API Keys Dashboard (`src/app/dashboard/api-keys/page.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│  API Keys                                               │
│                                                         │
│  Gebruik deze keys om de API programmatisch aan te      │
│  roepen. Documentatie: /api/docs                        │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Naam         │ Key                │ Laatst      │    │
│  │──────────────│────────────────────│─────────────│    │
│  │ Productie    │ prc_sk_***...a4f  │ 2 uur geleden│   │
│  │ Test         │ prc_sk_***...b7e  │ Nooit        │   │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  [+ Nieuwe API Key Aanmaken]                            │
│                                                         │
│  Credits: 847 / 1000 resterend                          │
│  Meer credits nodig? Mail info@procai.nl                │
└─────────────────────────────────────────────────────────┘
```

---

## Module 7: Processing Pipeline

### Orchestratie Flow (`src/lib/processing/conversion-pipeline.ts`)

```
PDF Upload
    │
    ▼
┌─────────────────┐
│ Credit Check     │──── 402: Credit limiet bereikt
│ (≥1 credit?)    │      → "Neem contact op met info@procai.nl"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Document         │──── Type: "not_invoice"
│ Classificatie    │      → Flag: aanmaning/bankafschrift/etc.
│ (snelle pre-     │      → Return met flag, GEEN UBL
│  check + AI)     │
└────────┬────────┘
         │ Type: invoice/credit_note
         ▼
┌─────────────────┐
│ Multi-Invoice    │──── Meerdere facturen gedetecteerd?
│ Detectie         │      → Split PDF in individuele facturen
└────────┬────────┘      → Verwerk elk apart (1 credit per factuur)
         │
         ▼
┌─────────────────┐
│ AI Extractie     │     Provider: Document AI OF OpenRouter
│ (per factuur)    │     → Gestructureerde data + confidence scores
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Confidence       │     Per veld: score 0.0-1.0
│ Scoring &        │     Cross-validatie: totalen, BTW, IBAN
│ Flagging         │     Flag alles < threshold (default 85%)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Context    │     Merge meegegeven admin-info:
│ Merge            │     → adminName, adminAddress, KVK, IBAN
│                  │     als buyer-gegevens (indien ontbrekend)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UBL XML          │     Peppol BIS 3.0 compliant XML
│ Generatie        │     Alle verplichte velden ingevuld
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UBL Validatie    │     XSD + Schematron regels
│ (Peppol BIS 3.0)│     → isValid + array van fouten
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Response         │     → API: JSON met UBL XML + scores
│ Delivery         │     → UI: Resultaat pagina met review
│                  │     → Zero Data Retention: wis PDF uit memory
└─────────────────┘
```

---

## Implementatie Volgorde (Fases)

### Fase 1: Fundament (Week 1-2)
1. Project setup: Next.js + Prisma + PostgreSQL + Docker
2. Database schema migraties
3. Authenticatie (NextAuth.js) + API key systeem
4. Basis UI layout (sidebar, header, pagina's)
5. Landing page met Zero Data Retention en EU servers messaging

### Fase 2: AI Extractie (Week 3-4)
1. Google Document AI client implementatie
2. OpenRouter client implementatie
3. Extractie prompt engineering en testen
4. Document classificatie (factuur vs. niet-factuur detectie)
5. Multi-invoice PDF detectie en splitting
6. AI provider configuratie UI (admin scherm)

### Fase 3: UBL Generatie (Week 5-6)
1. UBL Invoice builder (xmlbuilder2)
2. UBL CreditNote builder
3. Mapping van ExtractedInvoice → UBL XML
4. Schematron + XSD validatie setup
5. Admin context merge (KVK, IBAN, adres meegeven)
6. Code lists implementatie (ISO landen, valuta, BTW codes, eenheden)

### Fase 4: Confidence & Review (Week 7)
1. Per-veld confidence scoring
2. Cross-validatie regels (totalen check, BTW check, IBAN check)
3. Flagging systeem (drempel configureerbaar)
4. Review UI met veld-per-veld tabel en scores

### Fase 5: Web Interface (Week 8-9)
1. Upload pagina (drag & drop + admin info formulier)
2. Conversie resultaat pagina met confidence tabel
3. UBL XML preview + download
4. API keys beheer pagina
5. Admin: gebruikersbeheer + rollen
6. Admin: credit overzicht
7. Admin: AI provider configuratie (koppelscherm)

### Fase 6: API & Credits (Week 10)
1. REST API endpoints (convert, status, download)
2. API key authenticatie middleware
3. Credit management (check, deduct, limiet melding)
4. Rate limiting
5. API documentatie (Swagger/OpenAPI)

### Fase 7: Testing & Polish (Week 11-12)
1. Unit tests (extractie, UBL generatie, validatie)
2. Integration tests (volledige pipeline)
3. Test met echte facturen (Nederlands, diverse leveranciers)
4. Performance optimalisatie
5. Docker productie configuratie
6. Security audit (encrypted secrets, input sanitization)

---

## Belangrijke UBL Peppol BIS 3.0 Regels

### Verplichte elementen (cardinality 1..1):
- `cbc:CustomizationID` — altijd `urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0`
- `cbc:ProfileID` — altijd `urn:fdc:peppol.eu:2017:poacc:billing:01:1.0`
- `cbc:ID` — factuurnummer
- `cbc:IssueDate` — factuurdatum (YYYY-MM-DD)
- `cbc:InvoiceTypeCode` — 380 (factuur) of 381 (creditnota)
- `cbc:DocumentCurrencyCode` — EUR (of ander ISO 4217)
- `cac:AccountingSupplierParty` — leverancier met EndpointID (PEPPOL-EN16931-R020)
- `cac:AccountingCustomerParty` — afnemer
- `cac:TaxTotal` — BTW totaal
- `cac:LegalMonetaryTotal` — financiële totalen
- `cac:InvoiceLine` (1..n) — minstens één factuurregel

### Verplicht: BuyerReference OF OrderReference
- `cbc:BuyerReference` OF `cac:OrderReference/cbc:ID` moet aanwezig zijn
- Als geen van beide beschikbaar: gebruik "NA" als OrderReference

### InvoiceTypeCode waarden:
- 380 = Commercial invoice (standaard factuur)
- 381 = Credit note
- 384 = Corrected invoice
- 389 = Self-billed invoice
- 751 = Invoice information for accounting purposes

### BTW categorie codes (cac:TaxCategory/cbc:ID):
- S = Standard rate (standaardtarief, bv. 21%)
- Z = Zero rated (nultarief)
- E = Exempt (vrijgesteld)
- AE = Reverse charge (BTW verlegd)
- K = Intra-community supply (intracommunautaire levering)
- G = Export (export buiten EU)
- O = Not subject to VAT (niet onderworpen)
- L = Canary Islands
- M = Ceuta and Melilla

### Payment Means codes:
- 30 = Credit transfer (overboeking)
- 58 = SEPA credit transfer
- 49 = Direct debit (automatische incasso)

### Unit codes (UN/ECE Rec 20):
- C62 = Unit (stuk)
- HUR = Hour (uur)
- DAY = Day (dag)
- MON = Month (maand)
- KGM = Kilogram
- MTR = Metre
- LTR = Litre
- EA = Each

---

## Environment Variables (.env.example)

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/pdf_to_ubl"

# Redis (voor BullMQ queue)
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<random-secret>"

# Google Document AI (standaard EU endpoint)
GOOGLE_DOCUMENT_AI_PROJECT_ID=""
GOOGLE_DOCUMENT_AI_LOCATION="eu"
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=""
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# OpenRouter
OPENROUTER_API_KEY=""
OPENROUTER_DEFAULT_MODEL="google/gemini-2.0-flash-001"

# Applicatie
APP_URL="https://app.procai.nl"
CONFIDENCE_THRESHOLD="0.85"
MAX_FILE_SIZE_MB="20"
DEFAULT_CREDITS="1000"
CONTACT_EMAIL="info@procai.nl"

# Encryptie
ENCRYPTION_KEY="<32-byte-hex-key>"
```

---

## Docker Configuratie

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/pdf_to_ubl
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pdf_to_ubl
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    
volumes:
  pgdata:
```

---

## Notities voor Claude Code

### Prioriteiten
1. **Zero Data Retention** is niet-onderhandelbaar. PDF buffers moeten direct na verwerking uit het geheugen worden gewist. Geen tijdelijke bestanden op disk.
2. **EU Servers** — alle API calls naar Google Document AI via `eu-documentai.googleapis.com`. Bij OpenRouter: controleer of het model EU routing ondersteunt.
3. **Credit limiet** is hard — bij 0 credits moet de API 402 retourneren met het contact e-mailadres.
4. **Confidence scores** zijn het kern-onderscheidend kenmerk. Elke waarde onder de threshold moet visueel opvallen in de UI.
5. **Multi-invoice detectie** is belangrijk voor Basecone-gebruik. Accountants scannen vaak stapels facturen in één PDF.

### Dependencies om te installeren
```bash
npm install next@14 react react-dom typescript
npm install @prisma/client prisma
npm install next-auth
npm install xmlbuilder2        # UBL XML generatie
npm install pdf-lib             # PDF manipulatie (splitting)
npm install pdf2pic sharp       # PDF naar image conversie
npm install bullmq ioredis      # Async job queue
npm install multer              # File upload handling
npm install @google-cloud/documentai  # Google Document AI
npm install zod                 # Input validatie
npm install bcryptjs            # Wachtwoord hashing
npm install uuid                # API key generatie
npm install tailwindcss @tailwindcss/forms
npm install -D @types/node @types/react
```

### Test Strategie
- Unit test elke UBL builder functie met bekende invoice data
- Test document classificatie met sample aanmaningen en bankafschriften
- Valideer gegenereerde UBL XML tegen de officiële Peppol BIS 3.0 schematron regels
- Test multi-invoice splitting met 2-3 factuur PDFs
- Load test de API met 100 gelijktijdige conversies

---

*Dit document is het complete implementatieplan. Claude Code kan hiermee direct starten met ontwikkeling, te beginnen bij Fase 1.*
