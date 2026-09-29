const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const pesoDetailed = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const settings = {
  targetGrossMargin: 0.30,
  liquidationDeadlineMetroDays: 7,
  liquidationDeadlineProvincialDays: 14,
  incidentalPerDayThreshold: 5000,
  incidentalPerProjectThreshold: 20000,
  cashAdvanceBlockOverdue: true,
  projectCodeFormat: "YEAR-CLIENTCODE-SEQ",
  vatDefault: 0.12,
  asfDefault: 0.12,
  crpExpenseThreshold: 0.60
};

const dashboardToday = "2026-09-03";

const ceoCardOptions = [
  "Revenue YTD",
  "Accounts Receivables",
  "Accounts Payable",
  "Total Unliquidated Amount"
];

const defaultCeoCardConfig = [
  "Revenue YTD",
  "Accounts Receivables",
  "Accounts Payable",
  "Total Unliquidated Amount"
];
const storedCeoCardConfig = JSON.parse(localStorage.getItem("spotlightCeoCards") || "null");
const ceoCardConfig = Array.from({ length: 4 }, (_, index) => {
  const selected = storedCeoCardConfig?.[index];
  return ceoCardOptions.includes(selected) ? selected : defaultCeoCardConfig[index];
});

const widgetSizeOptions = ["Compact", "Default", "Wide", "Tall", "Full"];
const widgetLayoutConfig = JSON.parse(localStorage.getItem("spotlightWidgetLayout") || "{}");
const widgetHeightConfig = JSON.parse(localStorage.getItem("spotlightWidgetHeights") || "{}");
const expandedProjectCards = new Set(JSON.parse(localStorage.getItem("spotlightExpandedProjects") || "[]"));
const expandedApprovalItems = new Set(JSON.parse(localStorage.getItem("spotlightExpandedApprovals") || "[]"));
const uploadedCeFiles = new Map();
const ceUploadStorageKey = "spotlightUploadedCeVersions";
const ceUploadFileStorageKey = "spotlightUploadedCeFileRecords";
const uploadedCrpFiles = new Map();
const crpUploadStorageKey = "spotlightUploadedCrpBatches";
const crpUploadFileStorageKey = "spotlightUploadedCrpFileRecords";
const crpDecisionStorageKey = "spotlightCrpLineDecisions";
const crpLineDecisions = readStoredJson(crpDecisionStorageKey, {});
const crpCounterpartyStorageKey = "spotlightCrpCounterparties";
const crpCounterparties = readStoredJson(crpCounterpartyStorageKey, {});
const crpOpenStateStorageKey = "spotlightOpenCrpRows";
const openCrpDetails = new Set(readStoredJson(crpOpenStateStorageKey, []));
const fundReleaseReceiptStorageKey = "spotlightFundReleaseReceiptRecords";
const fundReleaseReceiptRecords = readStoredJson(fundReleaseReceiptStorageKey, {});
const fundReleaseManualStorageKey = "spotlightFundReleaseManualItems";
const fundReleaseManualItems = readStoredJson(fundReleaseManualStorageKey, []);
const fundReleaseNoteStorageKey = "spotlightFundReleaseLineNotes";
const fundReleaseLineNotes = readStoredJson(fundReleaseNoteStorageKey, {});
const liquidationScenarioRecordStorageKey = "spotlightLiquidationScenarioRecords";
const liquidationScenarioRecords = readStoredJson(liquidationScenarioRecordStorageKey, []);
const liquidationScenarioActionStorageKey = "spotlightLiquidationScenarioActions";
const liquidationScenarioActions = readStoredJson(liquidationScenarioActionStorageKey, {});
const liquidationSupplierActionStorageKey = "spotlightLiquidationSupplierActions";
const liquidationSupplierActions = readStoredJson(liquidationSupplierActionStorageKey, {});
const liquidationManualSupplierStorageKey = "spotlightLiquidationManualSuppliers";
const liquidationManualSuppliers = readStoredJson(liquidationManualSupplierStorageKey, []);
const liquidationPayeeStorageKey = "spotlightLiquidationPayeeClassifications";
const liquidationPayeeClassifications = readStoredJson(liquidationPayeeStorageKey, {});
const billingInvoiceStorageKey = "spotlightGeneratedBillingInvoices";
const billingGeneratedInvoices = readStoredJson(billingInvoiceStorageKey, []);
const billingArchiveStorageKey = "spotlightArchivedBillingInvoices";
const billingArchivedInvoices = readStoredJson(billingArchiveStorageKey, []);
const billingCollectionStorageKey = "spotlightBillingCollections";
const billingRecordedCollections = readStoredJson(billingCollectionStorageKey, []);
const billingInvoiceSequenceStorageKey = "spotlightBillingInvoiceSequence";
const postAuditScoreStorageKey = "spotlightPostAuditScorecards";
const postAuditScorecards = readStoredJson(postAuditScoreStorageKey, {});
const creativeDeliverableStorageKey = "spotlightCreativeDeliverables";
const creativeDeliverableEdits = readStoredJson(creativeDeliverableStorageKey, {});
const counterpartyTypes = {
  "supplier-business": "Store supplier",
  "supplier-individual": "Individual supplier",
  professional: "Professional fee",
  other: "Other",
  employee: "Spotlight employee",
  unclassified: "Unclassified"
};

function counterpartyTypeLabel(value = "") {
  return counterpartyTypes[value] || counterpartyTypes.unclassified;
}

function counterpartyTypeOptions(selected = "", includePrompt = false, expenseOnly = false) {
  const entries = Object.entries(counterpartyTypes).filter(([value]) => !expenseOnly || ["supplier-business", "supplier-individual", "professional", "other", selected].includes(value));
  return `${includePrompt ? `<option value="">Select payee type</option>` : ""}${entries.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("")}`;
}
const crpRescanAttempted = new Set();
const uiStateStorageKey = "spotlightUiState";
const accountStorageKey = "spotlightUserAccounts";
const accountActivityStorageKey = "spotlightAccountActivity";
const accountSessionStorageKey = "spotlightAuthenticatedAccount";
let selectedRevenueYear = JSON.parse(localStorage.getItem("spotlightRevenueYear") || "null");
let adaptiveWidgetObserver;
let crpBufferTooltipAnchor = null;
let crpBufferTooltipEventsBound = false;
let crpOpenStateTouched = localStorage.getItem(crpOpenStateStorageKey) !== null;

const roles = {
  "SUPER ADMIN / CEO": ["Dashboard", "Approve", "Override", "Finance", "Audit", "Settings", "Close"],
  "MANAGEMENT": ["Dashboard", "Approve", "Override", "Finance", "Audit", "Close"],
  "COO / OPERATIONS HEAD": ["Dashboard", "Projects", "Operations", "Approve", "Suppliers"],
  "ACCOUNTS LEAD": ["Dashboard", "Clients", "Projects", "Pipeline", "Billing", "Team workload"],
  "OPERATIONS LEAD": ["Dashboard", "Projects", "Operations", "Traffic"],
  "DIRECTOR / HEAD OF CLIENT GROWTH": ["Dashboard", "Clients", "Projects", "Pipeline", "Billing"],
  "CLIENT PARTNER / ACCOUNT EXECUTIVE": ["Clients", "Projects", "Pipeline", "Billing"],
  "ACCOUNTS MANAGER / EXECUTIVE": ["Clients", "Projects", "Pipeline", "Billing"],
  "CLIENT SUCCESS PARTNER": ["Clients", "Projects", "Follow-ups"],
  "CREATIVE DIRECTOR": ["Briefs", "Creative review", "Projects", "Team workload"],
  "ART LEAD / CREATIVE DIRECTOR": ["Briefs", "Creative review", "Projects"],
  "ART DIRECTOR": ["Briefs", "Creative review", "Projects"],
  "GRAPHIC DESIGNER / MULTIMEDIA ARTIST": ["Briefs", "Creative jobs", "Read project context"],
  "COPY LEAD": ["Briefs", "Copy review", "Creative jobs"],
  "COPYWRITER": ["Briefs", "Copy jobs", "Read project context"],
  "3D DESIGNER": ["Briefs", "3D jobs", "Read project context"],
  "DIRECTOR FOR IMPLEMENTATION": ["Projects", "Operations", "Budget", "Suppliers", "Liquidation"],
  "PRODUCTION HEAD": ["Projects", "Operations", "Budget", "Suppliers", "Liquidation"],
  "EVENT MANAGER": ["Projects", "Budget", "Suppliers", "Liquidation", "Operations"],
  "EVENT OFFICER": ["Projects", "Operations", "Liquidation"],
  "PROJECT COORDINATOR": ["Projects", "Follow-ups", "Liquidation"],
  "PROCUREMENT": ["Suppliers", "Budget", "Project supplier expenses"],
  "PROCUREMENT OFFICER": ["Suppliers", "Budget", "Project supplier expenses"],
  "FIELD CASHIER": ["Manpower releases", "Liquidation"],
  "FINANCE LEAD": ["CE audit", "Liquidation audit", "Reconciliation", "Profitability", "Billing", "Collection"],
  "FINANCE OFFICER": ["CE audit", "Liquidation audit", "Reconciliation", "Profitability", "Billing"],
  "FINANCE & COMPLIANCE ASSISTANT": ["CE", "Budget", "Release", "Liquidation", "Reimbursement"],
  "HR & ADMIN OFFICER": ["Directory", "Admin support", "Projects"],
  "WAREHOUSE ASSISTANT": ["Warehouse", "Turnover", "Projects"],
  "SOCIAL MEDIA MANAGER / CONTENT TEAM": ["Documentation", "Content opportunities", "Read project context"],
  "ACCOUNTS": ["Clients", "Projects", "Pipeline", "Billing"],
  "IMPLEMENTATION / PRODUCTION": ["Projects", "Budget", "Suppliers", "Liquidation"],
  "CREATIVE": ["Briefs", "Creative status", "Read project context"],
  "FINANCE OPERATIONS": ["CE", "Budget", "Release", "Billing", "Reimbursement"],
  "FINANCE CONTROL": ["CE audit", "Liquidation audit", "Reconciliation", "Profitability"]
};

const roleDepartments = [
  { name:"System Administration", roles:["SUPER ADMIN"] },
  { name:"Executive Department", roles:["CEO", "COO"] },
  { name:"New Business & Accounts", roles:["ACCOUNTS HEAD", "ACCOUNT MANAGER", "ACCOUNT EXECUTIVE"] },
  { name:"Production & Implementation", roles:["PRODUCTION HEAD", "PROJECT MANAGER", "PROJECT COORDINATOR"] },
  { name:"Creatives", roles:["CREATIVE DIRECTOR", "ASSOCIATE CREATIVE DIRECTOR", "ART LEAD", "COPYWRITER", "GRAPHIC ARTIST", "3D ARTIST"] },
  { name:"Admin & HR", roles:["ADMIN & HR OFFICER"] },
  { name:"Audit & Finance", roles:["FINANCE LEAD", "FINANCE OFFICER", "FINANCE COMPLIANCE & ASSISTANT"] }
];

const availableRoles = roleDepartments.flatMap(department => department.roles);

const defaultUserAccounts = [
  { id:"account-super-admin", name:"Mia Santos", email:"superadmin@spotlight.local", department:"System Administration", role:"SUPER ADMIN", scope:"ALL", status:"ACTIVE", switchable:true, createdAt:"2026-09-29", temporaryPassword:"SA!7K2Q9mX4", mustChangePassword:true },
  { id:"account-ceo", name:"Mia Santos", email:"ceo@spotlight.local", department:"Executive Department", role:"CEO", scope:"ALL", status:"ACTIVE", switchable:true, createdAt:"2026-09-29", temporaryPassword:"CEO!9M4rX2K", mustChangePassword:true }
];
const userAccounts = readStoredJson(accountStorageKey, defaultUserAccounts).map(account => ({
  scope:"ASSIGNED",
  status:"ACTIVE",
  mustChangePassword:true,
  ...account
}));
const accountActivity = readStoredJson(accountActivityStorageKey, []);

userAccounts.forEach(account => {
  if (!account.passwordHash && !account.temporaryPassword) account.temporaryPassword = generateTemporaryPassword();
  if (account.mustChangePassword === undefined) account.mustChangePassword = !account.passwordHash;
});

function persistUserAccounts() {
  localStorage.setItem(accountStorageKey, JSON.stringify(userAccounts));
  localStorage.setItem(accountActivityStorageKey, JSON.stringify(accountActivity));
}

function activeAccount() {
  const accountId = state.authenticatedAccountId || state.activeAccountId;
  return userAccounts.find(account => account.id === accountId) || userAccounts.find(account => account.id === "account-ceo") || userAccounts[0];
}

function isSuperAdminMode() {
  return activeAccount()?.role === "SUPER ADMIN";
}

function switchableAccountOptions() {
  return userAccounts.filter(account => account.switchable && account.status === "ACTIVE").map(account => `<option value="${escapeHtml(account.id)}" ${account.id === state.activeAccountId ? "selected" : ""}>${escapeHtml(account.role)}</option>`).join("");
}

function generateTemporaryPassword() {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%"];
  const randomIndex = length => {
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      globalThis.crypto.getRandomValues(value);
      return value[0] % length;
    }
    return Math.floor(Math.random() * length);
  };
  const required = groups.map(group => group[randomIndex(group.length)]);
  const pool = groups.join("");
  while (required.length < 12) required.push(pool[randomIndex(pool.length)]);
  for (let index = required.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    [required[index], required[swap]] = [required[swap], required[index]];
  }
  return required.join("");
}

async function digestPassword(password) {
  const value = new TextEncoder().encode(`spotlight-os:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function accountPasswordMatches(account, password) {
  if (account.temporaryPassword) return account.temporaryPassword === password;
  if (!account.passwordHash) return false;
  return account.passwordHash === await digestPassword(password);
}

function recordAccountActivity(action, detail, subjectId = "") {
  accountActivity.unshift({
    action,
    detail,
    subjectId,
    actor:activeAccount()?.email || "System",
    at:new Date().toLocaleString("en-PH", { dateStyle:"medium", timeStyle:"short" })
  });
  persistUserAccounts();
}

function activateAccount(accountId) {
  const nextAccount = userAccounts.find(account => account.id === accountId && account.switchable && account.status === "ACTIVE");
  if (!nextAccount) return;
  state.activeAccountId = nextAccount.id;
  state.role = canonicalRole(nextAccount.role);
  state.view = "Dashboard";
  state.tab = "Overview";
  state.search = "";
  state.reviewSnapshot = null;
  state.crpDecisionModal = null;
  state.crpCounterpartyModal = null;
  state.fundReleaseNoteModal = null;
  state.fundReleaseOverrideModal = null;
  state.liquidationSubmitOpen = false;
  state.liquidationReviewId = null;
  state.liquidationSupplierReviewId = null;
  state.liquidationSupplierBatchOpen = false;
  state.supplierPayableCreateOpen = false;
  state.liquidationNoteId = null;
  state.liquidationAttachmentId = null;
  state.liquidationPayeeId = null;
  state.billingFormOpen = false;
  state.billingPreviewId = null;
  state.billingArchiveId = null;
  state.billingCollectionId = null;
  state.billingCollectionProofId = null;
  state.postAuditFormOpen = false;
  persistUiState();
  render();
}

function roleSelectOptions() {
  return roleDepartments.map(department => `<optgroup label="${escapeHtml(department.name)}">${department.roles.map(role => `<option value="${escapeHtml(role)}" ${role === state.role ? "selected" : ""}>${escapeHtml(role)}</option>`).join("")}</optgroup>`).join("");
}

const roleMigrations = {
  "SUPER ADMIN / CEO":"CEO",
  "MANAGEMENT":"CEO",
  "COO / OPERATIONS HEAD":"COO",
  "ACCOUNTS LEAD":"ACCOUNTS HEAD",
  "DIRECTOR / HEAD OF CLIENT GROWTH":"ACCOUNTS HEAD",
  "CLIENT PARTNER / ACCOUNT EXECUTIVE":"ACCOUNT EXECUTIVE",
  "ACCOUNTS MANAGER / EXECUTIVE":"ACCOUNT MANAGER",
  "CLIENT SUCCESS PARTNER":"ACCOUNT EXECUTIVE",
  "OPERATIONS LEAD":"PRODUCTION HEAD",
  "DIRECTOR FOR IMPLEMENTATION":"PRODUCTION HEAD",
  "EVENT MANAGER":"PROJECT MANAGER",
  "EVENT OFFICER":"PROJECT COORDINATOR",
  "ART LEAD / CREATIVE DIRECTOR":"ART LEAD",
  "ART DIRECTOR":"ART LEAD",
  "GRAPHIC DESIGNER / MULTIMEDIA ARTIST":"GRAPHIC ARTIST",
  "3D DESIGNER":"3D ARTIST",
  "HR & ADMIN OFFICER":"ADMIN & HR OFFICER",
  "FINANCE & COMPLIANCE ASSISTANT":"FINANCE COMPLIANCE & ASSISTANT",
  "FINANCE CONTROL":"FINANCE COMPLIANCE & ASSISTANT",
  "FINANCE OPERATIONS":"FINANCE OFFICER",
  "ACCOUNTS":"ACCOUNT MANAGER",
  "IMPLEMENTATION / PRODUCTION":"PROJECT MANAGER",
  "CREATIVE":"CREATIVE DIRECTOR"
};

function canonicalRole(role = state?.role || "CEO") {
  return roleMigrations[role] || role;
}

function roleMatches(pattern, role = state.role) {
  return pattern.test(canonicalRole(role));
}

const stages = ["LEAD", "QUALIFICATION", "BRIEFED", "COSTING", "PITCHING", "NEGOTIATION", "AWARDED", "ONBOARDING", "PRE-PRODUCTION", "LIVE / IMPLEMENTATION", "POST-PRODUCTION", "FOR BILLING", "BILLED", "COLLECTION", "CLOSURE", "CLOSED"];

const db = {
  users: [
    { id: "u1", name: "Mia Santos", role: "SUPER ADMIN / CEO" },
    { id: "u2", name: "Paolo Reyes", role: "ACCOUNTS" },
    { id: "u3", name: "Lara Cruz", role: "IMPLEMENTATION / PRODUCTION" },
    { id: "u4", name: "June Ramos", role: "FINANCE CONTROL" },
    { id: "u5", name: "Marco Dela Paz", role: "FIELD CASHIER" },
    { id: "u6", name: "Iya Salcedo", role: "PROJECT COORDINATOR" },
    { id: "u7", name: "Carlo Mendoza", role: "EVENT OFFICER" },
    { id: "u8", name: "Bea Aquino", role: "PROCUREMENT OFFICER" },
    { id: "u9", name: "Gia Flores", role: "PRODUCTION HEAD" },
    { id: "u10", name: "Mika Reyes", role: "PROJECT COORDINATOR" },
    { id: "u11", name: "Nico Tan", role: "EVENT MANAGER" }
  ],
  clients: [
    { id: "c1", code: "UNILAB", company: "Unilab", unit: "Consumer Health", brand: "Alaxan", industry: "Healthcare", status: "Active", owner: "Paolo Reyes", paymentTerms: 60, firstWorked: "2022-03-14", lastWorked: "2026-08-21" },
    { id: "c2", code: "AYALA", company: "Ayala Land", unit: "Commercial", brand: "Mall Activations", industry: "Real Estate", status: "Active", owner: "Paolo Reyes", paymentTerms: 60, firstWorked: "2024-05-02", lastWorked: "2026-07-28" },
    { id: "c3", code: "JFC", company: "Jollibee Foods", unit: "Brand Experience", brand: "Campus Roadshow", industry: "Food", status: "Active", owner: "Nina Lim", paymentTerms: 30, firstWorked: "2025-01-19", lastWorked: "2026-08-10" }
  ],
  contacts: [
    { id: "ct1", clientId: "c1", name: "Angela Tan", type: "Marketing", email: "angela.tan@example.com", mobile: "+63 917 000 1021", birthday: "May 18" },
    { id: "ct2", clientId: "c1", name: "Rico Mercado", type: "Finance", email: "rico.m@example.com", mobile: "+63 917 000 1099", birthday: "November 7" },
    { id: "ct3", clientId: "c2", name: "Bea Lacson", type: "Procurement", email: "bea.l@example.com", mobile: "+63 918 000 2320", birthday: "March 22" }
  ],
  projects: [
    { id: "p1", code: "2026-UNILAB-0001", name: "2026 Annual Brand Summit", clientId: "c1", owner: "Paolo Reyes", implementationOwner: "Lara Cruz", projectCoordinator: "Mika Reyes", creativeOwner: "Andrea Valdez", copywriter: "Sofia Mercado", graphicArtist: "Jules Navarro", service: "PR / Big Event", opportunity: "Pitch", competingAgencies: 3, stage: "CLOSURE", status: "Awaiting closure", value: 2250000, approvedCe: 2250000, expectedRevenue: 2250000, estimatedCost: 1485000, actualRevenue: 2250000, actualCost: 1552500, liveDate: "2026-08-18", pitchDate: "2026-06-22", awardedDate: "2026-07-12", venue: "BGC Convention Hall", totalBudget: 2250000, asf: 260000, savings: 697500, location: "Metro Manila", provincial: false, created: "2026-06-04", brief: "Annual brand summit covering stage design, technical production, registration flow, live documentation, post-event report, and executive client hosting." },
    { id: "p2", code: "2026-AYALA-0002", name: "Holiday Mall Spectacular", clientId: "c2", owner: "Paolo Reyes", implementationOwner: "Lara Cruz", projectCoordinator: "Carlo Mendoza", creativeOwner: "Andrea Valdez", copywriter: "Ruth Genebaan", graphicArtist: "Ken Arevalo", service: "Brand Activation", opportunity: "Competitive Bidding", competingAgencies: 4, stage: "PITCHING", status: "Active", value: 4800000, approvedCe: 0, expectedRevenue: 2400000, estimatedCost: 1700000, actualRevenue: 0, actualCost: 0, liveDate: "2026-09-08", pitchDate: "2026-09-04", awardedDate: "", venue: "Ayala Center Activity Area", totalBudget: 4800000, asf: 520000, savings: 1420000, location: "Metro Manila", provincial: false, created: "2026-08-15", brief: "Competitive pitch for a holiday mall activation with hero installation, shopper engagement zones, supplier-heavy fabrication, and full creative presentation." },
    { id: "p3", code: "2026-JFC-0003", name: "Campus Roadshow", clientId: "c3", owner: "Nina Lim", implementationOwner: "Marco Dela Paz", projectCoordinator: "Iya Salcedo", creativeOwner: "Andrea Valdez", copywriter: "Mar Bequio", graphicArtist: "Gio Santos", service: "Trade Marketing", opportunity: "Direct Award", competingAgencies: 0, stage: "PRE-PRODUCTION", status: "Active", value: 1850000, approvedCe: 1850000, expectedRevenue: 1850000, estimatedCost: 1184000, actualRevenue: 0, actualCost: 310000, liveDate: "2026-08-05", pitchDate: "2026-08-05", awardedDate: "2026-08-09", venue: "Cebu University Circuit", totalBudget: 1850000, asf: 210000, savings: 666000, location: "Cebu", provincial: true, created: "2026-08-01", brief: "Multi-run campus roadshow requiring provincial logistics, manpower deployment, booth setup, sampling flow, and per-run liquidation discipline." },
    { id: "p4", code: "2026-UNILAB-0004", name: "RiteMed Retail Visibility Sprint", clientId: "c1", owner: "Paolo Reyes", implementationOwner: "Gia Flores", projectCoordinator: "Nico Tan", creativeOwner: "Andrea Valdez", copywriter: "Camille Ong", graphicArtist: "Drew Lim", service: "Fabrication", opportunity: "Existing Program / Renewal", competingAgencies: 1, stage: "COLLECTION", status: "Active", value: 980000, approvedCe: 980000, expectedRevenue: 980000, estimatedCost: 660000, actualRevenue: 980000, actualCost: 720000, liveDate: "2026-07-10", pitchDate: "2026-05-26", awardedDate: "2026-06-02", venue: "Metro Manila Retail Network", totalBudget: 980000, asf: 95000, savings: 260000, location: "Metro Manila", provincial: false, created: "2026-05-20", brief: "Retail visibility sprint across selected stores, focused on fabrication, installation, documentation, and collection closeout." },
    { id: "p5", code: "2026-AYALA-0005", name: "Tenant Content Capsules", clientId: "c2", owner: "Nina Lim", implementationOwner: "Creative Studio", projectCoordinator: "Bea Aquino", creativeOwner: "Creative Studio", copywriter: "Luis Gabriel", graphicArtist: "Pat Reyes", service: "Content / Video", opportunity: "Pitch", competingAgencies: 2, stage: "LOST", status: "Lost", value: 650000, approvedCe: 0, expectedRevenue: 0, estimatedCost: 0, actualRevenue: 0, actualCost: 0, liveDate: "2026-08-30", pitchDate: "2026-08-12", awardedDate: "", venue: "Ayala Malls", totalBudget: 650000, asf: 78000, savings: 0, location: "Metro Manila", provincial: false, created: "2026-07-21", brief: "Content capsule pitch for tenant social content and mall-led digital features." }
  ],
  qualifications: [
    { projectId: "p1", commercial: 82, probability: 65, clientValue: 86, complexity: 58, resourceLoad: 52, override: false },
    { projectId: "p2", commercial: 68, probability: 42, clientValue: 74, complexity: 72, resourceLoad: 70, override: true, approver: "Mia Santos", reason: "Strategic year-end visibility with high repeat potential." },
    { projectId: "p3", commercial: 78, probability: 92, clientValue: 72, complexity: 66, resourceLoad: 64, override: false }
  ],
  ceVersions: [
    { id: "ce1", projectId: "p1", version: "CE V1", status: "for revision", revenue: 2380000, subTotal: 2120000, asf: 260000, directCost: 1590000, file: "2026-UNILAB-0001_CE-V1.xlsx", approved: false, addendum: false },
    { id: "ce2", projectId: "p1", version: "CE V2 / FINAL", status: "approved - signed", revenue: 2250000, subTotal: 1990000, asf: 260000, directCost: 1485000, file: "2026-UNILAB-0001_CE-V2-signed.xlsx", approved: true, addendum: false },
    { id: "ce2a", projectId: "p1", version: "Addendum CE A", status: "approved - verbal", revenue: 180000, subTotal: 155000, asf: 25000, directCost: 112000, file: "2026-UNILAB-0001_Addendum-A.xlsx", approved: true, addendum: true },
    { id: "ce3", projectId: "p2", version: "CE V1", status: "for revision", revenue: 4800000, subTotal: 4280000, asf: 520000, directCost: 3380000, file: "2026-AYALA-0002_CE-V1.xlsx", approved: false, addendum: false },
    { id: "ce4", projectId: "p3", version: "CE V1 / FINAL", status: "approved - signed", revenue: 1850000, subTotal: 1640000, asf: 210000, directCost: 1184000, file: "2026-JFC-0003_CE-V1-signed.xlsx", approved: true, addendum: false }
  ],
  ceLines: [
    { ceId: "ce2", category: "Creative Fee", description: "Concept development, graphics, and copywriting", qty: 1, unitCost: 140000, selling: 210000, supplier: "Spotlight Creative Studio" },
    { ceId: "ce2", category: "Production & Talents", description: "Project management and core production team", qty: 1, unitCost: 170000, selling: 220000, supplier: "Spotlight Production" },
    { ceId: "ce2", category: "Production & Talents", description: "Event manpower and field operations", qty: 40, unitCost: 3375, selling: 180000, supplier: "FieldForce PH" },
    { ceId: "ce2", category: "Setup, Staging, and Technicals", description: "Stage build and scenic elements", qty: 1, unitCost: 410000, selling: 560000, supplier: "BuildRight Fabrication", remarks: "c/o Venue" },
    { ceId: "ce2", category: "Setup, Staging, and Technicals", description: "Lights, sound, and LED wall", qty: 1, unitCost: 380000, selling: 520000, supplier: "ProAV Manila", remarks: "Medium scale" },
    { ceId: "ce2", category: "Miscellaneous", description: "Meals, trucking, service vehicle, and contingency", qty: 1, unitCost: 250000, selling: 300000, supplier: "Multiple suppliers", remarks: "indicative" },
    { ceId: "ce4", category: "Logistics", description: "Provincial transport and accommodation", qty: 1, unitCost: 360000, selling: 510000, supplier: "Island Movers" }
  ],
  approvals: [
    { id: "a1", projectId: "p1", type: "Finance Validation", status: "Approved", approver: "June Ramos", at: "2026-07-03 10:11", comments: "VAT, ASF, and totals checked." },
    { id: "a2", projectId: "p1", type: "Implementation Validation", status: "Approved", approver: "Lara Cruz", at: "2026-07-03 16:34", comments: "Supplier costs realistic; added ingress buffer." },
    { id: "a3", projectId: "p1", type: "Management Approval", status: "Approved", approver: "Mia Santos", at: "2026-07-04 09:22", comments: "Margin acceptable." },
    { id: "a4", projectId: "p2", type: "Management Approval", status: "Pending", approver: "Mia Santos", at: "", comments: "Below benchmark pending strategic approval." }
  ],
  budgetRequests: [
    { id: "br1", projectId: "p1", holder: "PRODUCTION / IMPLEMENTATION", requestor: "Lara Cruz", category: "Fabrication", amount: 100000, qty: 1, unitCost: 100000, expectedAmount: 100000, releaseType: "Cheque", recipient: "BuildRight Fabrication", quotation: "BuildRight quotation.pdf", status: "RELEASED", dateRequired: "2026-08-10", exception: false, sourceUploadId: "crp1", sourceVersion: "CRP V1", sourceFile: "2026-UNILAB-0001_CRP-V1.xlsx" },
    { id: "br2", projectId: "p1", holder: "PROCUREMENT", requestor: "Mia Santos", category: "Supplier Downpayment", amount: 200000, qty: 1, unitCost: 200000, expectedAmount: 200000, releaseType: "Cheque", recipient: "ProAV Manila", quotation: "ProAV Manila quotation.pdf", status: "RELEASED", dateRequired: "2026-08-11", exception: false, sourceUploadId: "crp1", sourceVersion: "CRP V1", sourceFile: "2026-UNILAB-0001_CRP-V1.xlsx" },
    { id: "br3", projectId: "p1", holder: "FIELD CASHIER", requestor: "Marco Dela Paz", category: "Manpower", amount: 50000, qty: 1, unitCost: 50000, expectedAmount: 50000, releaseType: "Cash", recipient: "Marco Dela Paz", quotation: "", status: "RELEASED", dateRequired: "2026-08-17", exception: false, sourceUploadId: "crp1", sourceVersion: "CRP V1", sourceFile: "2026-UNILAB-0001_CRP-V1.xlsx" },
    { id: "br4", projectId: "p3", holder: "FIELD CASHIER", requestor: "Marco Dela Paz", category: "Manpower", amount: 90000, qty: 1, unitCost: 90000, expectedAmount: 90000, releaseType: "Cash", recipient: "Marco Dela Paz", quotation: "", status: "UNDER REVIEW", dateRequired: "2026-09-04", exception: false, sourceUploadId: "crp2", sourceVersion: "CRP V1", sourceFile: "2026-JFC-0003_CRP-V1.xlsx" },
    { id: "br5", projectId: "p2", holder: "PRODUCTION / IMPLEMENTATION", requestor: "Lara Cruz", category: "Creative", amount: 180000, qty: 1, unitCost: 180000, expectedAmount: 180000, releaseType: "Cash", recipient: "Lara Cruz", quotation: "", status: "REQUESTED", dateRequired: "2026-09-02", exception: false, sourceUploadId: "crp3", sourceVersion: "CRP V1", sourceFile: "2026-AYALA-0002_CRP-V1.xlsx" },
    { id: "br6", projectId: "p3", holder: "PRODUCTION / IMPLEMENTATION", requestor: "Lara Cruz", category: "Fabrication", amount: 1090000, qty: 1, unitCost: 1090000, expectedAmount: 1090000, releaseType: "Cheque", recipient: "BuildRight Fabrication", quotation: "", status: "REQUESTED", dateRequired: "2026-09-04", exception: true, reason: "CRP savings guardrail needs management review against the signed CE.", sourceUploadId: "crp2", sourceVersion: "CRP V1", sourceFile: "2026-JFC-0003_CRP-V1.xlsx" }
  ],
  crpUploads: [
    { id: "crp1", projectId: "p1", version: "CRP V1", status: "released", file: "2026-UNILAB-0001_CRP-V1.xlsx", uploadedAt: "2026-08-08T09:30:00.000Z", uploadedBy: "Lara Cruz", requestIds: ["br1","br2","br3"], scanStatus: "Manual", issueCount: 0 },
    { id: "crp2", projectId: "p3", version: "CRP V1", status: "for checking", file: "2026-JFC-0003_CRP-V1.xlsx", uploadedAt: "2026-08-18T10:15:00.000Z", uploadedBy: "Marco Dela Paz", requestIds: ["br4","br6"], scanStatus: "1 support issue", issueCount: 1 },
    { id: "crp3", projectId: "p2", version: "CRP V1", status: "requested", file: "2026-AYALA-0002_CRP-V1.xlsx", uploadedAt: "2026-09-02T08:20:00.000Z", uploadedBy: "Lara Cruz", requestIds: ["br5"], scanStatus: "Manual", issueCount: 0 }
  ],
  releases: [
    { id: "rel1", projectId: "p1", requestId: "br1", employee: "Lara Cruz", payee: "BuildRight Fabrication", amount: 100000, date: "2026-08-10", mode: "Bank transfer", category: "Fabrication", status: "FOR LIQUIDATION" },
    { id: "rel2", projectId: "p1", requestId: "br2", employee: "Mia Santos", payee: "ProAV Manila", amount: 200000, date: "2026-08-11", mode: "Bank transfer", category: "Technical", status: "DOCUMENTED" },
    { id: "rel3", projectId: "p1", requestId: "br3", employee: "Marco Dela Paz", payee: "Field manpower", amount: 50000, date: "2026-08-17", mode: "Cash", category: "Manpower", status: "FOR LIQUIDATION" },
    { id: "rel4", projectId: "p3", requestId: "br4", employee: "Marco Dela Paz", payee: "Field manpower", amount: 70000, date: "2026-08-20", mode: "Cash", category: "Manpower", status: "OVERDUE" }
  ],
  liquidations: [
    { id: "liq1", releaseId: "rel1", projectId: "p1", employee: "Lara Cruz", released: 100000, liquidated: 92000, returned: 8000, reimbursable: 0, due: "2026-08-25", submitted: "2026-08-22", status: "Cleared", findings: "" },
    { id: "liq2", releaseId: "rel3", projectId: "p1", employee: "Marco Dela Paz", released: 50000, liquidated: 55000, returned: 0, reimbursable: 5000, due: "2026-08-24", submitted: "2026-08-25", status: "For Reimbursement", findings: "Two missing official receipts require declaration." },
    { id: "liq3", releaseId: "rel4", projectId: "p3", employee: "Marco Dela Paz", released: 70000, liquidated: 0, returned: 0, reimbursable: 0, due: "2026-08-27", submitted: "", status: "Under Audit", findings: "Overdue submission under finance audit." },
    { id: "liq4", releaseId: "rel1", projectId: "p1", employee: "Lara Cruz", released: 30000, liquidated: 22000, returned: 8000, reimbursable: 0, due: "2026-08-26", submitted: "2026-08-28", status: "For Cash Return", findings: "Unused petty cash to be returned." }
  ],
  suppliers: [
    { id: "s1", name: "BuildRight Fabrication", category: "fabrication", contact: "Erwin Co", terms: "50/50", spent: 780000, quality: 4.6, reliability: 4.3, status: "Preferred", notes: "Strong scenic finish; watch rush pricing." },
    { id: "s2", name: "ProAV Manila", category: "technical", contact: "Sam Lee", terms: "DP required", spent: 990000, quality: 4.8, reliability: 4.7, status: "Preferred", notes: "Reliable for LED and hybrid events." },
    { id: "s3", name: "Island Movers", category: "logistics", contact: "Mae Yu", terms: "COD", spent: 240000, quality: 3.9, reliability: 3.4, status: "Watchlist", notes: "One late delivery on Cebu route." }
  ],
  invoices: [
    { id: "inv1", projectId: "p1", invoiceNo: "SI-2026-0819", amount: 2250000, issued: "2026-08-20", due: "2026-10-04", collected: 0, status: "BILLED" },
    { id: "inv2", projectId: "p4", invoiceNo: "SI-2026-0712", amount: 980000, issued: "2026-07-12", due: "2026-08-26", collected: 350000, status: "PARTIALLY PAID" }
  ],
  collections: [
    { id: "col1", invoiceId: "inv2", date: "2026-08-18", amount: 350000, mode: "Bank transfer" }
  ],
  closure: [
    { projectId: "p1", items: [
      ["Event completed", "Done"], ["Liquidations cleared", "Open"], ["Supplier obligations cleared", "Done"], ["Post-event report completed", "Done"], ["Billing issued", "Done"], ["Client sign-off completed", "Done"], ["Project financials finalized", "Open"], ["Post-audit completed", "Done"], ["Files archived", "Open"]
    ]},
    { projectId: "p4", items: [
      ["Event completed", "Done"], ["Liquidations cleared", "Done"], ["Billing issued", "Done"], ["Collection completed", "Open"], ["Post-audit completed", "Open"]
    ]}
  ],
  postAudits: [
    { projectId: "p1", varianceCause: "Rush fabrication revisions increased manpower and late-night transport.", worked: "Supplier coordination and client approval cadence.", failed: "Receipt discipline during egress.", repeat: "Daily budget snapshot in ingress week.", never: "No unassigned petty cash pouch." }
  ],
  activity: [
    { projectId: "p1", at: "2026-06-04 09:10", user: "Paolo Reyes", action: "Project created", from: "", to: "LEAD", comment: "Generated 2026-UNILAB-0001." },
    { projectId: "p1", at: "2026-07-04 09:22", user: "Mia Santos", action: "CE approved", from: "MANAGEMENT APPROVAL", to: "APPROVED FOR CLIENT", comment: "Approved CE V2." },
    { projectId: "p1", at: "2026-08-17 11:43", user: "Finance Ops", action: "Fund released", from: "READY FOR RELEASE", to: "RELEASED", comment: "Cash advance released to Marco Dela Paz." },
    { projectId: "p1", at: "2026-08-25 14:06", user: "June Ramos", action: "Audit finding raised", from: "Submitted", to: "Under Audit", comment: "Missing receipt declaration required." },
    { projectId: "p3", at: "2026-08-28 09:00", user: "System", action: "Policy block", from: "For liquidation", to: "For Cash Return", comment: "New cash advance blocked until liquidation cleared or overridden." }
  ],
  notifications: [
    { id: "n1", type: "CE awaiting review", text: "Holiday Mall Spectacular CE V1 needs management approval.", severity: "warn", target: "p2" },
    { id: "n2", type: "Liquidation overdue", text: "Marco Dela Paz has overdue liquidation for Campus Launch Caravan.", severity: "risk", target: "p3" },
    { id: "n3", type: "Project event approaching", text: "Campus Launch Caravan live date is within 7 days.", severity: "warn", target: "p3" },
    { id: "n4", type: "Project awaiting closure", text: "Annual Brand Summit has 3 closure checklist items open.", severity: "active", target: "p1" }
  ],
  documents: [
    { projectId: "p1", type: "Brief", name: "Annual Brand Summit Client Brief", status: "Attached" },
    { projectId: "p1", type: "Post-event report", name: "Summit Documentation Deck", status: "Attached" },
    { projectId: "p3", type: "Permits", name: "Cebu Campus Permit Tracker", status: "Pending" }
  ]
};

billingGeneratedInvoices.forEach(invoice => {
  if (invoice.source === "generated" && !invoice.document?.dataUrl) {
    if (!billingArchivedInvoices.some(item => item.id === invoice.id)) billingArchivedInvoices.push({
      ...invoice,
      archivedAt:new Date().toISOString(),
      archivedBy:"System migration",
      archiveReason:"Legacy non-accredited draft archived when Billing changed to manual BIR-accredited invoice uploads."
    });
    return;
  }
  if (!db.invoices.some(item => item.id === invoice.id)) db.invoices.push(invoice);
});
billingArchivedInvoices.forEach(invoice => {
  const index = db.invoices.findIndex(item => item.id === invoice.id);
  if (index >= 0) db.invoices.splice(index, 1);
});
billingRecordedCollections.forEach(collection => {
  if (!db.collections.some(item => item.id === collection.id)) db.collections.push(collection);
});
db.invoices.forEach(invoice => {
  const recorded = db.collections.filter(collection => collection.invoiceId === invoice.id).reduce((sum, collection) => sum + Number(collection.amount || 0), 0);
  if (recorded > Number(invoice.collected || 0)) invoice.collected = recorded;
});
try {
  localStorage.setItem(billingInvoiceStorageKey, JSON.stringify(billingGeneratedInvoices.filter(invoice => invoice.source !== "generated" || invoice.document?.dataUrl)));
  localStorage.setItem(billingArchiveStorageKey, JSON.stringify(billingArchivedInvoices));
} catch (error) {
  // The current session still reflects the migration if browser storage is full.
}

const dashboardSeed = {
  monthlyRevenue: {
    2024: [480000, 620000, 710000, 540000, 860000, 930000, 780000, 990000, 1120000, 980000, 1260000, 1440000],
    2025: [690000, 740000, 820000, 760000, 1040000, 1160000, 980000, 1210000, 1320000, 1490000, 1560000, 1810000],
    2026: [820000, 910000, 970000, 860000, 1180000, 1320000, 1090000, 1260000, 0, 0, 0, 0]
  },
  calendarItems: [
    { date: "2026-09-03", projectId: "p2", item: "Holiday Mall presentation checkpoint", type: "Checkpoint" },
    { date: "2026-09-07", projectId: "p3", item: "Campus Roadshow production checkpoint", type: "Checkpoint" },
    { date: "2026-09-16", projectId: "p1", item: "Annual Brand Summit closure checkpoint", type: "Checkpoint" },
    { date: "2026-09-22", projectId: "p4", item: "RiteMed collection checkpoint", type: "Checkpoint" }
  ],
  creativeJobs: [
    { projectId: "p2", deliverable: "Holiday pitch master deck", owner: "Andrea Valdez", role: "Graphic Designer", priority: "High", due: "2026-09-02", status: "Due today", round: 2, waitingOn: "Copy", nextAction: "Lock headline system" },
    { projectId: "p2", deliverable: "Retail KV adaptation set", owner: "Andrea Valdez", role: "Graphic Designer", priority: "High", due: "2026-09-02", status: "Due today", round: 1, waitingOn: "Client", nextAction: "Export presentation-ready layouts" },
    { projectId: "p3", deliverable: "Campus booth layout", owner: "Andrea Valdez", role: "Graphic Designer", priority: "Critical", due: "2026-08-31", status: "Overdue", round: 1, waitingOn: "Dimensions", nextAction: "Request final booth measurements" },
    { projectId: "p1", deliverable: "Post-event report polish", owner: "Andrea Valdez", role: "Graphic Designer", priority: "Medium", due: "2026-09-04", status: "Waiting", round: 0, waitingOn: "Copy", nextAction: "Wait for final captions" },
    { projectId: "p4", deliverable: "Retail shelf talker revisions", owner: "Andrea Valdez", role: "Graphic Designer", priority: "Medium", due: "2026-09-05", status: "For revision", round: 3, waitingOn: "Creative", nextAction: "Apply client comments" },
    { projectId: "p3", deliverable: "Campus event wayfinding", owner: "Andrea Valdez", role: "Graphic Designer", priority: "Medium", due: "2026-09-07", status: "Upcoming", round: 0, waitingOn: "Production", nextAction: "Prepare FA after production specs" },
    { projectId: "p2", deliverable: "3D render art cards", owner: "Andrea Valdez", role: "Graphic Designer", priority: "Low", due: "2026-09-09", status: "Upcoming", round: 1, waitingOn: "3D", nextAction: "Place render crops into deck" },
    { projectId: "p3", deliverable: "Main stage 3D render", owner: "Ramon Uy", role: "3D Designer", priority: "High", due: "2026-09-03", status: "Waiting", round: 1, waitingOn: "Floor plan", nextAction: "Confirm dimensions and sightlines" },
    { projectId: "p2", deliverable: "Activation copy blocks", owner: "Isa Garcia", role: "Copywriter", priority: "High", due: "2026-09-02", status: "For review", round: 1, waitingOn: "Copy Lead", nextAction: "Review deck copy" }
  ],
  operationsTasks: [
    { projectId: "p3", owner: "Lara Cruz", type: "Supplier readiness", status: "At risk", due: "2026-09-02", waitingOn: "Supplier", nextAction: "Confirm Cebu logistics delivery window" },
    { projectId: "p3", owner: "Lara Cruz", type: "Budget readiness", status: "Blocked", due: "2026-09-02", waitingOn: "Finance", nextAction: "Release remaining PHP 80K field budget" },
    { projectId: "p3", owner: "Lara Cruz", type: "Call sheet", status: "Incomplete", due: "2026-09-02", waitingOn: "Production", nextAction: "Submit final call sheet" },
    { projectId: "p3", owner: "Lara Cruz", type: "Manpower", status: "Confirmed", due: "2026-09-03", waitingOn: "None", nextAction: "Brief team leads" },
    { projectId: "p3", owner: "Lara Cruz", type: "Artwork", status: "Approved", due: "2026-09-01", waitingOn: "None", nextAction: "Send final files to printer" },
    { projectId: "p2", owner: "Lara Cruz", type: "Pre-production meeting", status: "Due soon", due: "2026-09-06", waitingOn: "Client", nextAction: "Confirm attendee list" }
  ],
  clientActions: [
    { projectId: "p2", owner: "Paolo Reyes", action: "Client presentation follow-up", status: "This week", due: "2026-09-03", waitingOn: "Client", nextAction: "Get decision timeline" },
    { projectId: "p2", owner: "Paolo Reyes", action: "CE approval follow-up", status: "Overdue", due: "2026-08-31", waitingOn: "Client", nextAction: "Follow up revised CE" },
    { projectId: "p4", owner: "Paolo Reyes", action: "PO balance request", status: "Missing", due: "2026-09-02", waitingOn: "Procurement", nextAction: "Ask procurement for corrected PO" },
    { projectId: "p1", owner: "Paolo Reyes", action: "Closure acceptance", status: "Due soon", due: "2026-09-04", waitingOn: "Client", nextAction: "Secure client sign-off email" },
    { projectId: "p3", owner: "Nina Lim", action: "Creative approval", status: "Overdue", due: "2026-09-01", waitingOn: "Client", nextAction: "Push artwork approval" }
  ],
  procurementItems: [
    { projectId: "p3", requirement: "Cebu transport vans", category: "Transportation", requestedBy: "Lara Cruz", needBy: "2026-09-03", status: "Quotation pending" },
    { projectId: "p2", requirement: "Holiday mall truss supplier", category: "Technical", requestedBy: "Lara Cruz", needBy: "2026-09-05", status: "No supplier yet" },
    { projectId: "p1", requirement: "Final supplier invoice", category: "Fabrication", requestedBy: "June Ramos", needBy: "2026-09-02", status: "Missing document" }
  ],
  warehouseItems: [
    { projectId: "p3", item: "Portable counters", qty: 6, date: "2026-09-03", status: "For release", owner: "Lara Cruz" },
    { projectId: "p1", item: "LED acrylic signage", qty: 4, date: "2026-08-20", status: "Outstanding return", owner: "Marco Dela Paz" },
    { projectId: "p4", item: "Retail display modules", qty: 12, date: "2026-09-04", status: "Expected incoming", owner: "Gia Flores" }
  ],
  contentItems: [
    { projectId: "p3", milestone: "Fabrication starts tomorrow", status: "Missing documentation owner", contentType: "Client/Event", mix: 70, nextAction: "Assign documentation owner" },
    { projectId: "p1", milestone: "Event photos ready", status: "Content ready", contentType: "Client/Event", mix: 70, nextAction: "Select case-study cuts" },
    { projectId: "p2", milestone: "Pitch creative development", status: "Capture process", contentType: "Systems/Culture", mix: 30, nextAction: "Request behind-the-scenes shots" }
  ],
  adminItems: [
    { projectId: "p3", requirement: "Cebu hotel booking support", owner: "Admin", due: "2026-09-02", status: "Due today" },
    { projectId: "p2", requirement: "Freelancer equipment assignment", owner: "Admin", due: "2026-09-05", status: "Upcoming" }
  ]
};

const state = {
  view: "Dashboard",
  role: "CEO",
  activeAccountId: "account-ceo",
  authenticatedAccountId: sessionStorage.getItem(accountSessionStorageKey) || "",
  authMessage: "",
  generatedAccountCredentials: null,
  accountEditId: null,
  selectedProjectId: "p1",
  tab: "Overview",
  search: "",
  reviewSnapshot: null,
  crpDecisionModal: null,
  crpCounterpartyKey: null,
  fundReleaseNoteModal: null,
  fundReleaseOverrideOpen: false,
  fundReleaseScenarioPreview: true,
  liquidationScenarioPreview: true,
  liquidationSubmitOpen: false,
  liquidationFinancePreview: false,
  liquidationFormCompact: false,
  liquidationReviewId: null,
  liquidationSupplierReviewId: null,
  liquidationSupplierBatchOpen: false,
  supplierPayableCreateOpen: false,
  billingFormOpen: false,
  billingPreviewId: null,
  billingArchiveId: null,
  billingArchivedOpen: false,
  billingCollectionInvoiceId: null,
  billingCollectionPreviewId: null,
  postAuditFormOpen: false,
  liquidationNoteId: null,
  liquidationPendingAction: null,
  liquidationAttachment: null,
  liquidationPayeeReview: null,
  liquidationReviewHistory: [],
  liquidationFocusId: null,
  liquidationPageProjectId: "",
  liquidationPageRecordId: "",
  liquidationReturnView: "",
  supplierSourceReturn: false,
  sidebarHidden: false,
  projectsNavOpen: true,
  projectDraftOpen: false,
  ...readStoredJson(uiStateStorageKey, {})
};

if (!userAccounts.some(account => account.id === state.activeAccountId && account.switchable && account.status === "ACTIVE")) state.activeAccountId = "account-ceo";
if (!userAccounts.some(account => account.id === state.authenticatedAccountId && account.status === "ACTIVE")) state.authenticatedAccountId = "";
if (state.authenticatedAccountId) state.activeAccountId = state.authenticatedAccountId;
state.role = canonicalRole(activeAccount()?.role || "CEO");
if (!availableRoles.includes(state.role)) state.role = "CEO";
persistUserAccounts();
if (!db.projects.some(item => item.id === state.selectedProjectId)) {
  state.selectedProjectId = db.projects.find(item => item.stage !== "LOST")?.id || db.projects[0]?.id || "";
}

const projectDraftMedia = {};

function persistUiState() {
  try {
    localStorage.setItem(uiStateStorageKey, JSON.stringify({
      view: state.view,
      role: state.role,
      activeAccountId: state.activeAccountId,
      selectedProjectId: state.selectedProjectId,
      tab: state.tab,
      fundReleaseScenarioPreview: state.fundReleaseScenarioPreview,
      liquidationScenarioPreview: state.liquidationScenarioPreview,
      sidebarHidden: state.sidebarHidden,
      projectsNavOpen: state.projectsNavOpen
    }));
  } catch (error) {
    // The preview still works if browser storage is unavailable.
  }
}

function client(id) { return db.clients.find(c => c.id === id); }
function project(id) { return db.projects.find(p => p.id === id); }
function recordYear(value) {
  const match = String(value || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : 0;
}
function projectRecordYear(item) {
  return recordYear(item.created) || recordYear(item.liveDate);
}
function currentClientYear() { return new Date().getFullYear(); }
function canCreateProject() {
  return roleMatches(/CEO|COO|ACCOUNTS HEAD|ACCOUNT MANAGER|ACCOUNT EXECUTIVE/);
}
function financeAccessProfile(role = state.role) {
  const canonical = canonicalRole(role);
  if (/^(CEO|COO)$/.test(canonical)) return { scope:"full", label:"Executive Finance", readOnly:true };
  if (/FINANCE LEAD|FINANCE OFFICER/.test(canonical)) return { scope:"full", label:"Finance Operations", readOnly:false };
  if (/FINANCE COMPLIANCE & ASSISTANT/.test(canonical)) return { scope:"compliance", label:"Finance Compliance", readOnly:false };
  if (/ACCOUNTS HEAD|ACCOUNT MANAGER|ACCOUNT EXECUTIVE/.test(canonical)) return { scope:"accounts", label:"Billing & Collection", readOnly:false };
  if (/ADMIN & HR OFFICER/.test(canonical)) return { scope:"compensation", label:"Compensation", readOnly:true };
  return { scope:"none", label:"Finance", readOnly:true };
}
function canViewFinance() { return financeAccessProfile().scope !== "none"; }
function clientAccessProfile(role = state.role) {
  const canonical = canonicalRole(role);
  if (/^(CEO|COO|ACCOUNTS HEAD)$/.test(canonical)) return { scope:"all", label:/ACCOUNT/.test(canonical) ? "Accounts portfolio" : "Executive portfolio" };
  if (/^ACCOUNT (MANAGER|EXECUTIVE)$/.test(canonical)) return { scope:"assigned", label:"Assigned clients" };
  return { scope:"none", label:"Clients" };
}
function supplierAccessProfile(role = state.role) {
  const canonical = canonicalRole(role);
  if (/^(CEO|COO)$/.test(canonical)) return { scope:"all", label:"Executive supplier view", canManage:false };
  if (/^FINANCE (LEAD|OFFICER)$/.test(canonical)) return { scope:"finance", label:"Supplier payables", canManage:true };
  if (/^FINANCE COMPLIANCE/.test(canonical)) return { scope:"audit", label:"Supplier compliance", canManage:false };
  if (/^(ACCOUNTS HEAD|PRODUCTION HEAD)$/.test(canonical)) return { scope:"all", label:"Supplier portfolio", canManage:true };
  if (/^(ACCOUNT MANAGER|ACCOUNT EXECUTIVE|PROJECT MANAGER|PROJECT COORDINATOR)$/.test(canonical)) return { scope:"assigned", label:"Project suppliers", canManage:true };
  return { scope:"none", label:"Suppliers", canManage:false };
}
function canViewApprovals(role = state.role) {
  return /^(CEO|COO|ACCOUNTS HEAD|PRODUCTION HEAD|CREATIVE DIRECTOR|ASSOCIATE CREATIVE DIRECTOR|FINANCE COMPLIANCE & ASSISTANT)$/.test(canonicalRole(role));
}
function visibleNavigationItems() {
  if (isSuperAdminMode()) return ["Dashboard", "Accounts"];
  const items = ["Dashboard"];
  if (canViewApprovals()) items.push("Approvals");
  if (!roleMatches(/^ADMIN & HR OFFICER$/)) items.push("Projects");
  if (clientAccessProfile().scope !== "none") items.push("Clients");
  if (canViewFinance()) items.push("Finance");
  items.push("Liquidations");
  if (supplierAccessProfile().scope !== "none") items.push("Suppliers");
  return items;
}
function margin(revenue, cost) { return revenue ? (revenue - cost) / revenue : 0; }
function score(q) { return Math.round((q.commercial + q.probability + q.clientValue + (100 - q.complexity) + (100 - q.resourceLoad)) / 5); }
function recommendation(q) {
  const s = score(q);
  if (s >= 70) return ["GREEN — ACCEPT", "good"];
  if (s >= 52) return ["YELLOW — MANAGEMENT REVIEW", "warn"];
  return ["RED — HIGH RISK", "risk"];
}
function daysUntil(date) {
  const today = new Date(`${dashboardToday}T00:00:00+08:00`);
  return Math.ceil((new Date(date + "T00:00:00+08:00") - today) / 86400000);
}
function arAging(invoice) {
  const outstanding = invoice.amount - invoice.collected;
  if (outstanding <= 0) return "Paid";
  const age = -daysUntil(invoice.due);
  if (age <= 0) return "Current";
  if (age <= 30) return "1–30";
  if (age <= 60) return "31–60";
  if (age <= 90) return "61–90";
  return "90+";
}
function health(p) {
  const actualMargin = margin(p.actualRevenue || p.expectedRevenue, p.actualCost || p.estimatedCost);
  const hasOverdueLiq = db.liquidations.some(l => l.projectId === p.id && /Under Audit|For Cash Return|For Reimbursement|Overdue|Findings|Correction/i.test(l.status));
  const eventSoon = daysUntil(p.liveDate) >= 0 && daysUntil(p.liveDate) <= 7 && !["CLOSED", "LOST", "CANCELLED"].includes(p.stage);
  const overdueAR = db.invoices.some(i => i.projectId === p.id && arAging(i) !== "Current" && arAging(i) !== "Paid");
  const belowMargin = actualMargin && actualMargin < settings.targetGrossMargin;
  if (hasOverdueLiq || overdueAR || belowMargin) return ["AT RISK", "risk"];
  if (eventSoon || p.status === "Awaiting closure") return ["ATTENTION", "warn"];
  if (["CLOSED", "LOST"].includes(p.stage)) return ["COMPLETED", "done"];
  return ["HEALTHY", "good"];
}
function statusClass(value) {
  if (/APPROVED|CLEARED|PAID|GREEN|HEALTHY|Done|CLIENT APPROVED|CLOSED|REVISED|DOCUMENTED|signed|COMPLETED/i.test(value)) return "good";
  if (/RISK|OVERDUE|BLOCKED|FINDINGS|LOST|RED|Critical|Missing/i.test(value)) return "risk";
  if (/REVIEW|revision|validation|collection|audit|approval/i.test(value)) return "purple";
  if (/PENDING|DUE|ATTENTION|YELLOW|PARTIALLY|Open|FOR|REQUESTED|VERBAL|waiting|follow.?up|incomplete/i.test(value)) return "warn";
  return "active";
}
function chip(value, forced) { return `<span class="status ${forced || statusClass(value)}">${value}</span>`; }
function stageTone(stage) {
  if (/CLOSURE|CLOSED/i.test(stage)) return "good";
  if (/COLLECTION/i.test(stage)) return "purple";
  return "active";
}
function fmt(n) { return peso.format(n || 0); }
function fmtDetailed(n) { return pesoDetailed.format(n || 0); }
function roundCent(n) { return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100; }
function ceFinancialsFromCost(projectCost) {
  const cost = roundCent(projectCost);
  const asf = roundCent(cost * settings.asfDefault);
  const subTotal = roundCent(cost + asf);
  const vat = roundCent(subTotal * settings.vatDefault);
  const grandTotal = roundCent(subTotal + vat);
  return { projectCost: cost, asf, subTotal, vat, grandTotal };
}
function ceFinancialsFromGross(gross) {
  const grandTotal = roundCent(gross);
  const divisor = (1 + settings.asfDefault) * (1 + settings.vatDefault);
  const projectCost = roundCent(grandTotal / divisor);
  const asf = roundCent(projectCost * settings.asfDefault);
  const subTotal = roundCent(projectCost + asf);
  const vat = roundCent(grandTotal - subTotal);
  return { projectCost, asf, subTotal, vat, grandTotal };
}
function ceFinancials(ce = {}) {
  if (Number.isFinite(ce.projectCost)) return ceFinancialsFromCost(ce.projectCost);
  return ceFinancialsFromGross(ce.revenue || 0);
}
function projectCost(p) { return db.liquidations.filter(l => l.projectId === p.id).reduce((s, l) => s + l.liquidated - l.returned, 0) || p.actualCost; }
function stageIndex(p) { return Math.max(0, stages.indexOf(p.stage)); }
function signedCe(projectId) {
  return db.ceVersions.find(ce => ce.projectId === projectId && /approved - signed/i.test(ce.status));
}
function crpRequests(projectId) {
  return db.budgetRequests.filter(request => request.projectId === projectId);
}
function crpTotal(projectId) {
  return crpRequests(projectId).reduce((sum, request) => sum + request.amount, 0);
}
function crpBudgetBasis(projectId) {
  const ce = signedCe(projectId) || currentCe(projectId);
  if (ce) return ceFinancials(ce).projectCost;
  const p = project(projectId);
  return p ? (p.totalBudget || p.value || 0) : 0;
}
function crpThresholdAmount(projectId) {
  return roundCent(crpBudgetBasis(projectId) * settings.crpExpenseThreshold);
}
function crpUsageRatio(projectId) {
  const basis = crpBudgetBasis(projectId);
  return basis ? crpTotal(projectId) / basis : 0;
}
function isCrpOverride(request) {
  const threshold = crpThresholdAmount(request.projectId);
  if (!threshold) return false;
  const requests = crpRequests(request.projectId);
  const index = requests.findIndex(item => item.id === request.id);
  const priorTotal = requests.slice(0, Math.max(0, index)).reduce((sum, item) => sum + item.amount, 0);
  const afterTotal = priorTotal + request.amount;
  return afterTotal > threshold && priorTotal <= threshold;
}

function metrics() {
  const active = db.projects.filter(p => !["CLOSED", "LOST", "CANCELLED", "DECLINED"].includes(p.stage));
  const awarded = db.projects.filter(p => ["AWARDED", "ONBOARDING", "PRE-PRODUCTION", "LIVE / IMPLEMENTATION", "POST-PRODUCTION", "FOR BILLING", "BILLED", "COLLECTION", "CLOSURE", "CLOSED"].includes(p.stage));
  const pitching = db.projects.filter(p => ["QUALIFICATION", "BRIEFED", "COSTING", "PITCHING", "NEGOTIATION"].includes(p.stage));
  const pipelineValue = pitching.reduce((s,p) => s + p.value, 0);
  const expectedRevenue = db.projects.reduce((s,p) => s + p.expectedRevenue, 0);
  const estCost = db.projects.reduce((s,p) => s + p.estimatedCost, 0);
  const actRevenue = db.projects.reduce((s,p) => s + p.actualRevenue, 0);
  const actCost = db.projects.reduce((s,p) => s + p.actualCost, 0);
  const outstandingAdvances = db.liquidations.reduce((s,l) => s + Math.max(0, l.released - l.liquidated - l.returned), 0);
  const ar = db.invoices.reduce((s,i) => s + (i.amount - i.collected), 0);
  return { active, awarded, pitching, pipelineValue, expectedRevenue, estCost, actRevenue, actCost, outstandingAdvances, ar };
}

function accountLoginPage() {
  const ownerAccess = userAccounts.filter(account => account.switchable && account.temporaryPassword);
  return `<main class="auth-shell">
    <section class="auth-panel">
      <div class="auth-brand"><div class="mark"><img src="assets/spotlight-logo.png?v=4" alt="" /></div><div><strong>Spotlight OS</strong><span>Secure workspace access</span></div></div>
      <div class="auth-heading"><span>Account Login</span><h1>Sign in</h1><p>Use your company-issued email address and password.</p></div>
      <form id="accountLoginForm" class="auth-form">
        <label><span>Email</span><input name="email" type="email" autocomplete="username" required placeholder="name@company.com" /></label>
        <label><span>Password</span><input name="password" type="password" autocomplete="current-password" required placeholder="Password" /></label>
        ${state.authMessage ? `<p class="auth-error" role="alert">${escapeHtml(state.authMessage)}</p>` : ""}
        <button class="btn primary" type="submit">Login</button>
      </form>
      ${ownerAccess.length ? `<details class="auth-bootstrap"><summary>Demo owner access</summary><p>This public prototype uses browser-only credentials. Replace these addresses when company authentication is connected.</p>${ownerAccess.map(account => `<div><span>${escapeHtml(account.role)}</span><b>${escapeHtml(account.email)}</b><code>${escapeHtml(account.temporaryPassword)}</code></div>`).join("")}</details>` : ""}
    </section>
  </main>`;
}

function passwordChangePage(account) {
  return `<main class="auth-shell">
    <section class="auth-panel">
      <div class="auth-brand"><div class="mark"><img src="assets/spotlight-logo.png?v=4" alt="" /></div><div><strong>Spotlight OS</strong><span>First-time security setup</span></div></div>
      <div class="auth-heading"><span>Password Required</span><h1>Create your password</h1><p>${escapeHtml(account.email)}</p></div>
      <section class="auth-notice"><b>Your temporary password worked.</b><span>Create a private password before entering your dashboard.</span></section>
      <form id="accountPasswordChangeForm" class="auth-form">
        <label><span>New Password</span><input name="password" type="password" autocomplete="new-password" required minlength="10" placeholder="At least 10 characters" /></label>
        <label><span>Confirm Password</span><input name="confirmPassword" type="password" autocomplete="new-password" required minlength="10" placeholder="Repeat password" /></label>
        <small>Use at least 10 characters with uppercase, lowercase, a number, and a symbol.</small>
        ${state.authMessage ? `<p class="auth-error" role="alert">${escapeHtml(state.authMessage)}</p>` : ""}
        <div class="auth-actions"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-account-logout>Logout</button></div>
      </form>
    </section>
  </main>`;
}

function passwordMeetsRequirements(password) {
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function resetWorkspaceForAccount(account) {
  state.authenticatedAccountId = account.id;
  state.activeAccountId = account.id;
  state.role = canonicalRole(account.role);
  state.view = "Dashboard";
  state.tab = "Overview";
  state.search = "";
  state.authMessage = "";
  state.generatedAccountCredentials = null;
  state.accountEditId = null;
  state.reviewSnapshot = null;
  state.billingFormOpen = false;
  state.billingPreviewId = null;
  state.liquidationSubmitOpen = false;
  sessionStorage.setItem(accountSessionStorageKey, account.id);
}

function logoutAccount() {
  const account = activeAccount();
  if (state.authenticatedAccountId && account) recordAccountActivity("Signed out", `${account.name} · ${account.role}`, account.id);
  sessionStorage.removeItem(accountSessionStorageKey);
  state.authenticatedAccountId = "";
  state.authMessage = "";
  state.generatedAccountCredentials = null;
  state.accountEditId = null;
  render();
}

function bindAuthentication() {
  const loginForm = document.getElementById("accountLoginForm");
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = normalizeCell(formData.get("email")).toLowerCase();
    const password = String(formData.get("password") || "");
    const account = userAccounts.find(item => keyCell(item.email) === keyCell(email));
    if (!account || !(await accountPasswordMatches(account, password))) {
      state.authMessage = "Email or password is incorrect.";
      render();
      return;
    }
    if (account.status !== "ACTIVE") {
      state.authMessage = "This account is suspended. Please contact the Super Admin.";
      render();
      return;
    }
    resetWorkspaceForAccount(account);
    recordAccountActivity("Signed in", `${account.name} · ${account.role}`, account.id);
    render();
  });
  const passwordForm = document.getElementById("accountPasswordChangeForm");
  passwordForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const account = activeAccount();
    const formData = new FormData(passwordForm);
    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("confirmPassword") || "");
    if (!passwordMeetsRequirements(password)) {
      state.authMessage = "Password does not meet the required format.";
      render();
      return;
    }
    if (password !== confirmation) {
      state.authMessage = "Passwords do not match.";
      render();
      return;
    }
    account.passwordHash = await digestPassword(password);
    delete account.temporaryPassword;
    account.mustChangePassword = false;
    state.authMessage = "";
    recordAccountActivity("Password created", `${account.name} completed first-time setup`, account.id);
    render();
  });
  document.querySelectorAll("[data-account-logout]").forEach(button => button.addEventListener("click", logoutAccount));
}

function render() {
  const app = document.getElementById("app");
  if (!state.authenticatedAccountId) {
    app.innerHTML = accountLoginPage();
    bindAuthentication();
    return;
  }
  const account = activeAccount();
  if (!account || account.status !== "ACTIVE") {
    sessionStorage.removeItem(accountSessionStorageKey);
    state.authenticatedAccountId = "";
    state.authMessage = "Your session is no longer active.";
    render();
    return;
  }
  if (account.mustChangePassword) {
    app.innerHTML = passwordChangePage(account);
    bindAuthentication();
    return;
  }
  persistUiState();
  const navItems = visibleNavigationItems();
  const projectViewAllowed = navItems.includes("Projects");
  if ((!navItems.includes(state.view) && state.view !== "Project 360") || (state.view === "Project 360" && !projectViewAllowed)) state.view = "Dashboard";
  app.innerHTML = `
    <div class="shell ${state.sidebarHidden ? "sidebar-hidden" : ""}">
      <aside class="side">
        <div class="brand"><div class="mark"><img src="assets/spotlight-logo.png?v=4" alt="" /></div><div><strong>Spotlight OS</strong><span>Project-first operating layer</span></div></div>
        <div class="rolebox account-session">
          <label>Signed in as</label>
          <b>${escapeHtml(account.role)}</b>
          <small>${escapeHtml(account.email)}</small>
          <button class="btn compact" type="button" data-account-logout>Switch</button>
        </div>
        ${isSuperAdminMode() ? "" : globalSearchField()}
        <nav class="nav">${navItems.map(v => v === "Projects" ? projectNavigationAccordion() : `<button class="${state.view === v ? "active" : ""}" data-view="${v}">${icon(v)} ${v}</button>`).join("")}</nav>
        <div class="sidefooter">Every client has history. Every project has an identity. Every peso has an owner and purpose.</div>
      </aside>
      <main class="main">
        <div class="topbar">
          <button class="sidebar-toggle" type="button" data-sidebar-toggle="true" aria-label="${state.sidebarHidden ? "Show navigation" : "Hide navigation"}" title="${state.sidebarHidden ? "Show navigation" : "Hide navigation"}" aria-pressed="${state.sidebarHidden}"><span aria-hidden="true">${state.sidebarHidden ? "›" : "‹"}</span></button>
          <div class="topbar-context"><span>${escapeHtml(state.view === "Project 360" ? project(state.selectedProjectId)?.name || "Project" : state.view)}</span></div>
          <div class="userpill"><div class="avatar">${state.role[0]}</div><div><strong>${escapeHtml(account?.name || currentUser())}</strong><br><small>${escapeHtml(account?.role || state.role)}</small></div></div>
        </div>
        ${state.view === "Dashboard" ? `<section class="hero"><div><h1>${dashboardTitle()}</h1><p>${dashboardProfile().question}</p></div></section>` : ""}
        <div class="content">${views[state.view]()}</div>
        ${reviewSnapshotModal()}
        ${crpDecisionModal()}
        ${crpCounterpartyModal()}
        ${fundReleaseNoteModal()}
        ${fundReleaseOverrideModal()}
        ${liquidationSubmitModal()}
        ${liquidationReviewModal()}
        ${liquidationSupplierReviewModal()}
        ${liquidationSupplierBatchModal()}
        ${supplierPayableCreateModal()}
        ${liquidationNoteModal()}
        ${liquidationAttachmentModal()}
        ${liquidationPayeeModal()}
        ${billingInvoiceFormModal()}
        ${billingInvoicePreviewModal()}
        ${billingArchiveModal()}
        ${billingCollectionModal()}
        ${billingCollectionProofModal()}
        ${postAuditFormModal()}
        ${projectDraftModal()}
        ${generatedAccountCredentialsModal()}
        ${accountEditModal()}
      </main>
    </div>`;
  bind();
}

function renderPreservingViewport() {
  const windowTop = window.scrollY || document.documentElement.scrollTop || 0;
  const main = document.querySelector(".main");
  const mainTop = main?.scrollTop || 0;
  render();
  const restore = () => {
    window.scrollTo(0, windowTop);
    const nextMain = document.querySelector(".main");
    if (nextMain) nextMain.scrollTop = mainTop;
  };
  restore();
  requestAnimationFrame(restore);
}

const projectBuckets = ["For Pitch/Bidding", "On-Going", "For Collection / Completion"];

function accessibleProjects(role = state.role) {
  const canonical = canonicalRole(role);
  const active = db.projects.filter(item => item.stage !== "LOST");
  if (/^(CEO|COO|ACCOUNTS HEAD|PRODUCTION HEAD|CREATIVE DIRECTOR|ASSOCIATE CREATIVE DIRECTOR|FINANCE LEAD|FINANCE OFFICER|FINANCE COMPLIANCE & ASSISTANT)$/.test(canonical)) return active;
  if (canonical === "ACCOUNT MANAGER") return active.filter(item => item.owner === "Paolo Reyes");
  if (canonical === "ACCOUNT EXECUTIVE") return active.filter(item => item.owner === "Nina Lim");
  if (canonical === "PROJECT MANAGER") return active.filter(item => item.implementationOwner === currentUser());
  if (canonical === "PROJECT COORDINATOR") return active.filter(item => item.projectCoordinator === currentUser());
  if (canonical === "ART LEAD") return active.filter(item => item.creativeOwner === currentUser());
  if (canonical === "COPYWRITER") return active.filter(item => item.copywriter === currentUser());
  if (canonical === "GRAPHIC ARTIST") return active.filter(item => item.graphicArtist === currentUser());
  if (canonical === "3D ARTIST") return active.filter(item => dashboardSeed.creativeJobs.some(job => job.projectId === item.id && job.owner === currentUser()));
  return [];
}

function projectNavigationAccordion() {
  const isProjectView = ["Projects", "Project 360"].includes(state.view);
  const open = state.projectsNavOpen;
  return `<div class="nav-project-group ${open ? "is-open" : ""}">
    <button class="nav-project-toggle ${isProjectView ? "active" : ""}" type="button" data-project-nav-root aria-expanded="${open}"><span>${icon("Projects")} Projects</span><i aria-hidden="true">‹</i></button>
    <div class="nav-project-pages" ${open ? "" : "hidden"}>${projectBuckets.map(bucket => {
      const projects = accessibleProjects().filter(item => projectBucket(item) === bucket).sort((a, b) => eventDate(a).localeCompare(eventDate(b)));
      return `<details class="nav-project-phase" open>
        <summary><span>${escapeHtml(bucket)}</span><i aria-hidden="true">‹</i></summary>
        <div class="nav-project-links">${projects.length ? projects.map(item => {
          const c = client(item.clientId);
          return `<button class="nav-project-link ${state.view === "Project 360" && state.selectedProjectId === item.id ? "active" : ""}" type="button" data-project="${item.id}" data-project-tab="Overview"><span>${escapeHtml(c?.company || "Client")}</span><b>${escapeHtml(item.name)}</b></button>`;
        }).join("") : `<small>No projects</small>`}</div>
      </details>`;
    }).join("")}</div>
  </div>`;
}

function icon(v) {
  return { Dashboard:"▦", Accounts:"⊙", Projects:"▤", "Project 360":"◎", Clients:"◫", Finance:"₱", Liquidations:"✓", Suppliers:"◇", Approvals:"●", Search:"⌕", Architect:"▧" }[v] || "•";
}
function globalSearchResultsMarkup(query = state.search) {
  const results = searchResults(String(query || "").trim().toLowerCase()).slice(0, 8);
  if (!String(query || "").trim()) return `<div class="nav-search-empty">Type a project, client, supplier, invoice, CE, or employee.</div>`;
  if (!results.length) return `<div class="nav-search-empty">No permitted records found.</div>`;
  return results.map(result => `<button type="button" class="nav-search-result" ${result.projectId ? `data-search-project="${escapeHtml(result.projectId)}"` : `data-search-view="${escapeHtml(result.view || "Dashboard")}"`}><span>${escapeHtml(result.type)}</span><b>${escapeHtml(result.name)}</b><small>${escapeHtml(result.context)}</small></button>`).join("");
}
function globalSearchField() {
  const open = Boolean(String(state.search || "").trim());
  return `<div class="nav-search" data-global-search-shell><label for="globalSearch">Search</label><div><span aria-hidden="true">⌕</span><input id="globalSearch" value="${escapeHtml(state.search)}" placeholder="Type anything" autocomplete="off" /></div><section id="globalSearchResults" ${open ? "" : "hidden"}>${globalSearchResultsMarkup()}</section></div>`;
}
function currentUser() {
  const account = activeAccount();
  if (account) return account.name;
  return {
    "CEO":"Mia Santos",
    "COO":"Lara Cruz",
    "ACCOUNTS HEAD":"Paolo Reyes",
    "ACCOUNT MANAGER":"Paolo Reyes",
    "ACCOUNT EXECUTIVE":"Nina Lim",
    "PRODUCTION HEAD":"Gia Flores",
    "PROJECT MANAGER":"Lara Cruz",
    "PROJECT COORDINATOR":"Iya Salcedo",
    "CREATIVE DIRECTOR":"Andrea Valdez",
    "ASSOCIATE CREATIVE DIRECTOR":"Andrea Valdez",
    "ART LEAD":"Andrea Valdez",
    "COPYWRITER":"Sofia Mercado",
    "GRAPHIC ARTIST":"Jules Navarro",
    "3D ARTIST":"Ramon Uy",
    "ADMIN & HR OFFICER":"Ana Villanueva",
    "FINANCE LEAD":"June Ramos",
    "FINANCE OFFICER":"Maricar Tinitigan-Opeña",
    "FINANCE COMPLIANCE & ASSISTANT":"June Ramos"
  }[canonicalRole()] || "Spotlight User";
}

function dashboardTitle() {
  if (isSuperAdminMode()) return "Super Admin Dashboard";
  const clean = state.role.replace("SUPER ADMIN / ", "").replace(" / MULTIMEDIA ARTIST", "");
  return `${clean} Dashboard`;
}

function dashboardProfile(role = state.role) {
  if (canonicalRole(role) === "SUPER ADMIN") return { question:"Are user accounts, access assignments, and system controls properly governed?", primary:[], secondary:[], restricted:"Business decisions remain under the separate CEO account." };
  const profileKey = {
    "CEO":"SUPER ADMIN / CEO",
    "COO":"COO / OPERATIONS HEAD",
    "ACCOUNTS HEAD":"ACCOUNTS LEAD",
    "ACCOUNT MANAGER":"ACCOUNTS MANAGER / EXECUTIVE",
    "ACCOUNT EXECUTIVE":"CLIENT PARTNER / ACCOUNT EXECUTIVE",
    "PRODUCTION HEAD":"PRODUCTION HEAD",
    "PROJECT MANAGER":"EVENT MANAGER",
    "PROJECT COORDINATOR":"PROJECT COORDINATOR",
    "CREATIVE DIRECTOR":"CREATIVE DIRECTOR",
    "ASSOCIATE CREATIVE DIRECTOR":"ART LEAD / CREATIVE DIRECTOR",
    "ART LEAD":"ART LEAD / CREATIVE DIRECTOR",
    "COPYWRITER":"COPYWRITER",
    "GRAPHIC ARTIST":"GRAPHIC DESIGNER / MULTIMEDIA ARTIST",
    "3D ARTIST":"3D DESIGNER",
    "ADMIN & HR OFFICER":"HR & ADMIN OFFICER",
    "FINANCE LEAD":"FINANCE OFFICER",
    "FINANCE OFFICER":"FINANCE OFFICER",
    "FINANCE COMPLIANCE & ASSISTANT":"FINANCE & COMPLIANCE ASSISTANT"
  }[canonicalRole(role)];
  return dashboardProfiles[profileKey] || dashboardProfiles["SUPER ADMIN / CEO"];
}

function dashboardAccessScope(itemIds, role = state.role) {
  const matrix = window.SPOTLIGHT_DASHBOARD_ACCESS;
  if (!matrix) return "L";
  const roleIndex = matrix.roles.indexOf(canonicalRole(role).toUpperCase());
  if (roleIndex < 0) return "N";
  const rank = { N:0, A:1, T:2, L:3 };
  return (Array.isArray(itemIds) ? itemIds : [itemIds]).reduce((best, itemId) => {
    const next = matrix.items[itemId]?.scopes?.[roleIndex] || "N";
    return rank[next] > rank[best] ? next : best;
  }, "N");
}

function canSeeDashboardItem(itemIds, role = state.role) {
  return dashboardAccessScope(itemIds, role) !== "N";
}

const dashboardProfiles = {
  "SUPER ADMIN / CEO": {
    question: "What requires my decision, and is the company operationally and financially healthy?",
    primary: ["executive_company_health", "executive_alerts", "ceo_approvals", "project_portfolio"],
    secondary: ["year_on_year_revenue", "client_portfolio", "organization_health"],
    restricted: "Does not show individual project tasks unless the project has been escalated."
  },
  "MANAGEMENT": {
    question: "Which projects, approvals, financial risks, and exceptions require management attention?",
    primary: ["approval_queue", "project_health", "financial_summary"],
    secondary: ["pipeline_summary", "capacity_load", "recent_activity"],
    restricted: "Detailed employee-only task chatter is minimized."
  },
  "COO / OPERATIONS HEAD": {
    question: "Can the organization successfully deliver every active project?",
    primary: ["portfolio_operations_view", "operational_risk_board", "resource_capacity"],
    secondary: ["deployment_calendar", "pending_internal_decisions", "project_escalations"],
    restricted: "Company AR and profit detail only appears as operational impact."
  },
  "ACCOUNTS LEAD": {
    question: "Are our clients being managed properly, and are all accounts and opportunities moving?",
    primary: ["accounts_client_portfolio", "accounts_team_workload", "opportunity_pipeline"],
    secondary: ["client_attention_required", "client_health", "pitch_performance"],
    restricted: "Cash exposure is shown only when it affects client delivery, billing, or collection."
  },
  "OPERATIONS LEAD": {
    question: "Who is working on what, what is coming next, and where should work be redistributed?",
    primary: ["active_job_board", "team_workload", "deadline_collisions"],
    secondary: ["unassigned_work", "implementation_risks", "recent_activity"],
    restricted: "No company financial command center."
  },
  "DIRECTOR / HEAD OF CLIENT GROWTH": {
    question: "What is happening with clients, pipeline, opportunities, accounts team, and revenue growth?",
    primary: ["accounts_client_portfolio", "opportunity_pipeline", "accounts_team_workload"],
    secondary: ["client_attention_required", "client_health", "revenue_forecast"],
    restricted: "Cash advance detail is not shown unless tied to client impact."
  },
  "CLIENT PARTNER / ACCOUNT EXECUTIVE": {
    question: "What do I owe the client today?",
    primary: ["my_action_center", "my_clients", "my_projects"],
    secondary: ["today_this_week", "waiting_for_client", "waiting_for_spotlight", "client_commitments"],
    restricted: "No company AR, company profit, or cash reserve detail."
  },
  "ACCOUNTS MANAGER / EXECUTIVE": {
    question: "What do I owe the client today?",
    primary: ["my_action_center", "my_clients", "my_projects"],
    secondary: ["today_this_week", "waiting_for_client", "waiting_for_spotlight", "client_commitments"],
    restricted: "No company AR, company profit, or cash reserve detail."
  },
  "CLIENT SUCCESS PARTNER": {
    question: "What needs follow-through so the project and client experience stay on track?",
    primary: ["followup_queue", "my_projects", "documentation_tracker"],
    secondary: ["client_deadlines", "recent_activity"],
    restricted: "Management financial analytics are excluded."
  },
  "CREATIVE DIRECTOR": {
    question: "What creative work needs direction, review, or intervention?",
    primary: ["creative_project_queue", "creative_review_queue", "creative_workload"],
    secondary: ["revision_tracker", "creative_risks", "creative_forecast"],
    restricted: "Company finance and cash views are hidden."
  },
  "ART LEAD / CREATIVE DIRECTOR": {
    question: "What creative jobs require review, what is due soon, and where are delays forming?",
    primary: ["creative_review_queue", "creative_workload", "revision_queue"],
    secondary: ["production_ready_status", "upcoming_presentations"],
    restricted: "Company finance and cash views are hidden."
  },
  "ART DIRECTOR": {
    question: "What artwork must I create, review, or release?",
    primary: ["art_job_queue", "art_review_queue", "designer_workload"],
    secondary: ["art_deadlines", "asset_approval_status", "production_dependency_alert"],
    restricted: "Company finance and cash views are hidden."
  },
  "GRAPHIC DESIGNER / MULTIMEDIA ARTIST": {
    question: "What exactly do I need to design, in what order, and when is it due?",
    primary: ["creative_job_queue", "today_queue", "revision_queue"],
    secondary: ["waiting_queue", "creative_status_graph", "recent_activity"],
    restricted: "No company AR, company profit, cash reserve, or unrelated projects."
  },
  "COPY LEAD": {
    question: "What copy work needs assignment, review, revision, or escalation?",
    primary: ["copy_queue", "creative_workload", "revision_queue"],
    secondary: ["upcoming_presentations", "waiting_queue"],
    restricted: "No finance command center."
  },
  "COPYWRITER": {
    question: "What copy do I need to write today and what feedback needs action?",
    primary: ["copy_queue", "today_queue", "revision_queue"],
    secondary: ["waiting_queue", "recent_activity"],
    restricted: "No company financial data."
  },
  "3D DESIGNER": {
    question: "What projects need visualization, what technical inputs are missing, and when are handoffs due?",
    primary: ["three_d_queue", "waiting_queue", "upcoming_presentations"],
    secondary: ["production_ready_status", "recent_activity"],
    restricted: "No company financial data."
  },
  "DIRECTOR FOR IMPLEMENTATION": {
    question: "What projects are executing, where are the risks, and what needs intervention?",
    primary: ["implementation_risks", "operations_calendar", "production_budget_health"],
    secondary: ["supplier_alerts", "approval_queue", "project_health"],
    restricted: "AR and collections are limited to project readiness context."
  },
  "PRODUCTION HEAD": {
    question: "Can we physically execute every project successfully?",
    primary: ["production_portfolio", "execution_readiness_score", "production_team_capacity"],
    secondary: ["critical_production_alerts", "production_budget_health", "deployment_calendar"],
    restricted: "Company-level profit and collection detail remain limited."
  },
  "EVENT MANAGER": {
    question: "What do I need to execute today to keep my projects on track?",
    primary: ["event_countdown", "event_today_tasks", "event_readiness"],
    secondary: ["my_events", "event_budget_tracker", "event_supplier_status", "my_liquidations"],
    restricted: "No company-wide AR, profit, or cash reserve."
  },
  "EVENT OFFICER": {
    question: "What execution tasks are assigned to me and what is due before the event?",
    primary: ["event_tasks", "operations_calendar", "documentation_tracker"],
    secondary: ["my_liquidations", "supplier_followups"],
    restricted: "No strategic finance."
  },
  "PROJECT COORDINATOR": {
    question: "What follow-ups, documents, and project requirements must I complete?",
    primary: ["followup_queue", "documentation_tracker", "supplier_followups"],
    secondary: ["my_liquidations", "operations_calendar"],
    restricted: "Only project-relevant finance."
  },
  "PROCUREMENT": {
    question: "What must I source, purchase, pay, follow up, and document?",
    primary: ["procurement_queue", "procurement_workflow", "sourcing_queue"],
    secondary: ["quote_comparison", "delivery_tracker", "supplier_database_snapshot", "procurement_budget"],
    restricted: "No company AR or salary-related data."
  },
  "PROCUREMENT OFFICER": {
    question: "What do I need to source, purchase, follow up, or deliver?",
    primary: ["procurement_queue", "procurement_workflow", "sourcing_queue"],
    secondary: ["quote_comparison", "delivery_tracker", "supplier_database_snapshot", "procurement_budget"],
    restricted: "No company AR or salary-related data."
  },
  "FIELD CASHIER": {
    question: "How much manpower money am I responsible for and what must I disburse or liquidate?",
    primary: ["manpower_fund_tracker", "cash_on_hand", "liquidation_deadlines"],
    secondary: ["event_manpower", "my_incidentals"],
    restricted: "No company AR, profitability, or client financial command center."
  },
  "FINANCE OFFICER": {
    question: "What is the financial position of projects and where are the exceptions?",
    primary: ["cash_position", "budget_release_queue", "project_financial_health"],
    secondary: ["ar_aging", "accounts_payable", "cash_forecast", "finance_alerts"],
    restricted: "People task detail appears only when financially relevant."
  },
  "FINANCE & COMPLIANCE ASSISTANT": {
    question: "What transactions and documents do I need to process, chase, correct, and clear?",
    primary: ["liquidation_tracker", "liquidation_audit_queue", "budget_release_processing"],
    secondary: ["ce_audit_queue", "compliance_tracker", "no_liquidation_rule", "closure_queue"],
    restricted: "Strategic management analytics are secondary."
  },
  "HR & ADMIN OFFICER": {
    question: "What people and admin support issues need operational attention?",
    primary: ["admin_support", "employee_directory", "operations_calendar"],
    secondary: ["documentation_tracker", "recent_activity"],
    restricted: "No payroll, attendance, or HRIS buildout in MVP."
  },
  "WAREHOUSE ASSISTANT": {
    question: "What items are coming in, going out, returning, missing, or damaged?",
    primary: ["warehouse_turnover", "documentation_tracker", "operations_calendar"],
    secondary: ["supplier_alerts", "recent_activity"],
    restricted: "No inventory accounting or full warehouse ERP."
  },
  "SOCIAL MEDIA MANAGER / CONTENT TEAM": {
    question: "Which projects have content opportunities and what material is available now?",
    primary: ["content_opportunities", "documentation_tracker", "content_mix"],
    secondary: ["operations_calendar", "recent_activity"],
    restricted: "No publishing platform and no confidential financial details."
  },
  "ACCOUNTS": {
    question: "What client and project actions need follow-through today?",
    primary: ["client_followups", "my_projects", "pipeline_summary"],
    secondary: ["client_contacts", "recent_activity"],
    restricted: "Company financial command center is excluded."
  },
  "IMPLEMENTATION / PRODUCTION": {
    question: "What operational work and project risks need attention today?",
    primary: ["my_events", "implementation_risks", "my_budget_requests"],
    secondary: ["my_liquidations", "operations_calendar"],
    restricted: "Only project-relevant finance."
  },
  "CREATIVE": {
    question: "What creative work is due, blocked, or ready for review?",
    primary: ["creative_job_queue", "revision_queue", "waiting_queue"],
    secondary: ["creative_status_graph", "recent_activity"],
    restricted: "Company finance is hidden."
  },
  "FINANCE OPERATIONS": {
    question: "What financial processing work needs action today?",
    primary: ["budget_processing_queue", "liquidation_tracker", "reimbursement_queue"],
    secondary: ["ar_aging", "missing_documents"],
    restricted: "Management strategic views are secondary."
  },
  "FINANCE CONTROL": {
    question: "Which financial records need audit, reconciliation, or exception review?",
    primary: ["profitability_monitor", "liquidation_tracker", "exception_report"],
    secondary: ["ce_review_queue", "ar_aging"],
    restricted: "Operational details only appear through audit risk."
  }
};

// Dashboard widgets remain presentation-focused; the completed access matrix is
// the authority for whether each role may see the underlying dashboard data.
const widgetAccessItems = {
  my_action_center:[3,4,5,7,8],
  executive_company_health:[89,90,91,92,93,94,95,96,97,98,99,100,101],
  year_on_year_revenue:90,
  executive_alerts:100,
  ceo_approvals:[22,23,24,25,26,27,28,29,30],
  project_portfolio:[9,10,11,13],
  client_portfolio:[78,79,80],
  organization_health:15,
  portfolio_operations_view:[10,13,16],
  operational_risk_board:16,
  resource_capacity:15,
  deployment_calendar:[3,14],
  pending_internal_decisions:8,
  project_escalations:16,
  accounts_client_portfolio:[75,78,79,80],
  accounts_team_workload:15,
  opportunity_pipeline:9,
  client_attention_required:8,
  my_clients:75,
  today_this_week:3,
  waiting_for_client:8,
  waiting_for_spotlight:8,
  client_commitments:3,
  creative_project_queue:[1,23],
  revision_tracker:7,
  creative_risks:16,
  creative_forecast:3,
  art_job_queue:1,
  art_review_queue:23,
  designer_workload:15,
  art_deadlines:3,
  asset_approval_status:23,
  production_dependency_alert:16,
  production_portfolio:[10,13],
  execution_readiness_score:13,
  production_team_capacity:15,
  critical_production_alerts:16,
  event_countdown:14,
  event_today_tasks:3,
  event_budget_tracker:38,
  event_supplier_status:53,
  procurement_workflow:53,
  sourcing_queue:53,
  quote_comparison:53,
  delivery_tracker:[53,62],
  supplier_database_snapshot:63,
  cash_position:[91,92,93,94],
  budget_release_queue:[24,25,37],
  project_financial_health:[38,39,101],
  accounts_payable:[59,60,61],
  cash_forecast:89,
  finance_alerts:[69,70,100],
  liquidation_audit_queue:[27,50,51],
  budget_release_processing:[25,37],
  ce_audit_queue:22,
  compliance_tracker:[105,106,107],
  no_liquidation_rule:44,
  approval_queue:[22,23,24,25,26,27,28,29,30],
  financial_summary:[89,90,91,92,93,94,95,96,97,98,99],
  project_health:[13,16,38],
  pipeline_summary:9,
  capacity_load:15,
  client_health:[78,80],
  recent_activity:102,
  active_job_board:1,
  team_workload:15,
  deadline_collisions:4,
  unassigned_work:15,
  account_pipeline:9,
  client_followups:8,
  pitch_performance:9,
  revenue_forecast:89,
  my_projects:1,
  client_deadlines:3,
  approval_status:31,
  client_contacts:77,
  followup_queue:8,
  creative_review_queue:23,
  creative_workload:15,
  creative_job_queue:1,
  today_queue:3,
  revision_queue:7,
  waiting_queue:8,
  creative_status_graph:13,
  copy_queue:1,
  three_d_queue:1,
  production_ready_status:13,
  upcoming_presentations:3,
  implementation_risks:16,
  operations_calendar:[3,14],
  production_budget_health:38,
  my_events:1,
  event_readiness:13,
  my_budget_requests:33,
  my_liquidations:40,
  event_tasks:[1,3],
  supplier_followups:53,
  procurement_queue:53,
  supplier_alerts:[61,62],
  supplier_payments:[56,57,63],
  procurement_budget:17,
  my_incidentals:18,
  manpower_fund_tracker:45,
  cash_on_hand:45,
  liquidation_deadlines:[43,44],
  event_manpower:15,
  liquidation_tracker:[41,43,44,45,51],
  budget_processing_queue:[24,25,37],
  missing_documents:[50,62,107],
  reimbursement_queue:[26,48,49],
  ce_review_queue:22,
  profitability_monitor:101,
  cash_advance_exposure:99,
  ar_aging:[69,70,71],
  exception_report:106,
  closure_queue:74,
  admin_support:8,
  employee_directory:15,
  warehouse_turnover:107,
  documentation_tracker:107,
  content_opportunities:21,
  content_mix:21
};

const widgetRegistry = {
  my_action_center: {
    title: "My Action Center",
    purpose: "The five things this person should deal with today.",
    render: () => queueTable(actionCenterRows(), ["Project", "Item", "Owner", "Due", "Status", "Next Action"])
  },
  executive_company_health: {
    title: "Executive Company Health",
    purpose: "YTD performance, actualized performance, and forecast in one executive view.",
    render: () => {
      const m = metrics();
      const target = 100000000;
      const grandTotal = 73300000;
      const projectCost = 58434311.2244897959;
      const asfRevenue = 7012117.3469387755;
      const subTotal = 65446428.5714285714;
      const vat = 7853571.4285714286;
      const projectSavings = Math.max(0, Math.round(subTotal - projectCost - asfRevenue));
      return `<div class="health-rows">
        <div class="health-row">
          <h4>Year to Date Performance</h4>
          <div>${mini("Total YTD Revenue", fmt(grandTotal))}${mini("Revenue vs Target", `${Math.round(grandTotal / target * 100)}%`)}${mini("Total ASF Revenue", fmt(asfRevenue))}</div>
        </div>
        <div class="health-row">
          <h4>Actualized Performance</h4>
          <div>${mini("Total Project Cost", fmt(projectCost))}${mini("Total Project Savings", fmt(projectSavings))}${mini("Net Revenue", fmt(asfRevenue))}</div>
        </div>
        <div class="health-row">
          <h4>Performance Forecast</h4>
          <div>${mini("Accounts Receivables", fmt(m.ar))}${mini("Accounts Payables", fmt(820000))}${mini("Projected Revenue (Pipeline)", fmt(m.pipelineValue))}</div>
        </div>
        <div class="health-formula">${mini("Sub-total", fmt(subTotal))}${mini("VAT", fmt(vat))}${mini("Grand Total", fmt(grandTotal))}</div>
      </div>`;
    }
  },
  year_on_year_revenue: {
    title: "Year-on-Year Revenue",
    purpose: "Input monthly revenue per year and compare growth across years.",
    render: () => yearOnYearRevenue()
  },
  executive_alerts: {
    title: "Executive Alerts",
    purpose: "Digest of exceptions that may need review before they become bypass or override requests.",
    render: () => executiveAlertAccordion()
  },
  ceo_approvals: {
    title: "Needs My Approval",
    purpose: "Cost estimates, major budgets, strategic suppliers, exceptions, write-offs, and profitability-impacting scope changes.",
    render: () => approvalBuckets()
  },
  project_portfolio: {
    title: "Project Portfolio",
    purpose: "Active projects by stage, client, type, value, risk, margin, budget, and near-event blockers.",
    render: () => {
      const active = db.projects.filter(p => !["LOST","CLOSED"].includes(p.stage));
      return `<div class="grid cols-3">${mini("Total active projects", active.length)}${mini("Projects at risk", active.filter(p=>health(p)[0]==="AT RISK").length)}${mini("Below target margin", active.filter(p=>margin(p.actualRevenue || p.expectedRevenue, p.actualCost || p.estimatedCost) < settings.targetGrossMargin).length)}</div>${projectPhaseAccordion(active)}`;
    }
  },
  client_portfolio: {
    title: "Client Portfolio",
    purpose: "Revenue, profitability, active projects, receivables, pipeline, and concentration risk.",
    render: () => `${barChart("Revenue by Client", clientRevenueRows(), "PHP")}${widgetRegistry.client_health.render()}`
  },
  organization_health: {
    title: "Organization",
    purpose: "Who is working on which project, from account manager to graphic artist.",
    render: () => simpleTable(db.projects.filter(p => p.stage !== "LOST").map(p => ({ project:`<button class="linkbtn" data-project="${p.id}">${p.code}</button>`, client:client(p.clientId).company, accountManager:p.owner, productionOwner:p.implementationOwner, creativeOwner:p.creativeOwner, graphicArtist:creativeOwnerFor(p.id), status:chip(health(p)[0], health(p)[1]) })), ["project","client","accountManager","productionOwner","creativeOwner","graphicArtist","status"])
  },
  portfolio_operations_view: {
    title: "Portfolio Operations View",
    purpose: "Can each active project be delivered successfully?",
    render: () => simpleTable(db.projects.filter(p => !["LOST","CLOSED"].includes(p.stage)).map(p => ({ project:`<button class="linkbtn" data-project="${p.id}">${p.code}</button>`, client:client(p.clientId).company, accountsOwner:p.owner, productionOwner:p.implementationOwner, creativeOwner:creativeOwnerFor(p.id), stage:chip(p.stage, stageTone(p.stage)), eventDate:formatShortDate(eventDate(p)), completion:`${Math.round((stageIndex(p)+1)/stages.length*100)}%`, health:chip(health(p)[0], health(p)[1]), blocker:blockerFor(p.id), nextMilestone:nextMilestoneFor(p) })), ["project","client","accountsOwner","productionOwner","creativeOwner","stage","eventDate","completion","health","blocker","nextMilestone"])
  },
  operational_risk_board: {
    title: "Operational Risk Board",
    purpose: "Automatically flags missing owners, missing CE, supplier gaps, permits, manpower, artwork, and 72-hour critical risks.",
    render: () => simpleTable(operationsRiskRows(), ["project","risk","owner","deadline","priority","nextAction"])
  },
  resource_capacity: {
    title: "Resource Capacity",
    purpose: "Workload by accounts, creative, production, and procurement.",
    render: () => `${barChart("Department Capacity", capacityRows(), "%")}${barChart("Team Assignment Load", teamLoadRows(), "items")}`
  },
  deployment_calendar: {
    title: "Deployment Calendar",
    purpose: "Oculars, meetings, presentations, ingress, events, egress, and provincial deployments.",
    render: () => widgetRegistry.operations_calendar.render()
  },
  pending_internal_decisions: {
    title: "Pending Internal Decisions",
    purpose: "Work waiting for CEO, Accounts, Creative, Production, Finance, Procurement, Supplier, or Client.",
    render: () => queueTable(actionCenterRows().concat(dashboardSeed.operationsTasks.map(t => ({ projectId:t.projectId, item:t.type, owner:t.waitingOn, due:t.due, status:t.status, next:t.nextAction }))), ["Project","Item","Owner","Due","Status","Next Action"])
  },
  project_escalations: {
    title: "Project Escalations",
    purpose: "Client, schedule, budget, supplier, manpower, creative, and production escalations with proposed resolution.",
    render: () => simpleTable(escalationRows().map(e => ({ type:e.alert, project:e.project, owner:e.owner, proposedResolution:e.action, priority:chip(e.priority, e.priority === "CRITICAL" ? "risk" : "warn") })), ["type","project","owner","proposedResolution","priority"])
  },
  accounts_client_portfolio: {
    title: "Client Portfolio",
    purpose: "Clients handled, brands, active projects, revenue, pipeline, proposals, awards, losses, and upcoming opportunities.",
    render: () => simpleTable(db.clients.map(c => {
      const ps = db.projects.filter(p => p.clientId === c.id);
      return { client:c.company, brands:c.brand, activeProjects:ps.filter(p=>!["LOST","CLOSED"].includes(p.stage)).length, revenueYtd:fmt(ps.reduce((s,p)=>s+p.actualRevenue,0)), pipeline:fmt(ps.filter(p=>["LEAD","QUALIFICATION","BRIEFED","COSTING","PITCHING","NEGOTIATION"].includes(p.stage)).reduce((s,p)=>s+p.value,0)), awarded:ps.filter(p=>p.approvedCe).length, lost:ps.filter(p=>p.stage==="LOST").length };
    }), ["client","brands","activeProjects","revenueYtd","pipeline","awarded","lost"])
  },
  accounts_team_workload: {
    title: "Accounts Team Workload",
    purpose: "Active clients, active projects, pitches, client meetings, approvals pending, overdue follow-ups, and deadlines by AE/AM.",
    render: () => `${barChart("Accounts Projects by Owner", Object.entries(groupCount(db.projects, "owner")).map(([label,value]) => ({ label, value, color:value > 3 ? "warn" : "good" })), "projects")}${simpleTable(["Paolo Reyes","Nina Lim"].map(name => ({ accountOwner:name, activeClients:db.clients.filter(c=>c.owner===name).length || 1, activeProjects:db.projects.filter(p=>p.owner===name && p.stage!=="LOST").length, inPitch:db.projects.filter(p=>p.owner===name && p.stage==="PITCHING").length, overdueFollowups:dashboardSeed.clientActions.filter(a=>a.owner===name && a.status==="Overdue").length, upcomingDeadlines:dashboardSeed.clientActions.filter(a=>a.owner===name).length })), ["accountOwner","activeClients","activeProjects","inPitch","overdueFollowups","upcomingDeadlines"])}`
  },
  opportunity_pipeline: {
    title: "Opportunity / Pitch Pipeline",
    purpose: "Brief to award movement with value, probability, expected award date, competition, and last client contact.",
    render: () => simpleTable(db.projects.filter(p => ["LEAD","QUALIFICATION","BRIEFED","COSTING","PITCHING","NEGOTIATION","AWARDED","LOST"].includes(p.stage)).map(p => ({ project:`<button class="linkbtn" data-project="${p.id}">${p.code}</button>`, client:client(p.clientId).company, stage:chip(p.stage), value:fmt(p.value), probability:`${p.stage==="AWARDED" ? 100 : p.stage==="LOST" ? 0 : p.opportunity === "Direct Award" ? 80 : 45}%`, expectedAward:formatShortDate(eventDate(p)), competition:p.competingAgencies, lastContact:formatShortDate("2026-09-01") })), ["project","client","stage","value","probability","expectedAward","competition","lastContact"])
  },
  client_attention_required: {
    title: "Client Attention Required",
    purpose: "Overdue approvals, unanswered feedback, CE follow-up, PO gaps, complaints, billing, and collection support.",
    render: () => widgetRegistry.client_followups.render()
  },
  my_clients: {
    title: "My Clients",
    purpose: "Assigned companies and brands with live project and follow-up context.",
    render: () => simpleTable(db.clients.filter(c => roleIsManagement() || c.owner === currentUser() || currentUser() === "Paolo Reyes").map(c => ({ client:c.company, brand:c.brand, owner:c.owner, activeProjects:db.projects.filter(p=>p.clientId===c.id && p.stage!=="LOST").length, paymentTerms:`${c.paymentTerms} days`, status:chip(c.status,"good") })), ["client","brand","owner","activeProjects","paymentTerms","status"])
  },
  today_this_week: {
    title: "Today / This Week",
    purpose: "Client meetings, presentations, deliverables, follow-ups, approvals, submissions, reports, and billing support.",
    render: () => queueTable(dashboardSeed.clientActions.filter(a => daysUntil(a.due) <= 7).map(a => ({ projectId:a.projectId, item:a.action, owner:a.owner, due:a.due, status:a.status, next:a.nextAction })), ["Project","Item","Owner","Due","Status","Next Action"])
  },
  waiting_for_client: {
    title: "Waiting for Client",
    purpose: "Approved CE, artwork approval, script, venue, guest list, samples, guidelines, PO, and final event details.",
    render: () => simpleTable(dashboardSeed.clientActions.filter(a => a.waitingOn === "Client").map(a => ({ project:project(a.projectId).code, waitingFor:a.action, daysWaiting:Math.max(1, -daysUntil(a.due)), nextAction:a.nextAction, status:chip(a.status) })), ["project","waitingFor","daysWaiting","nextAction","status"])
  },
  waiting_for_spotlight: {
    title: "Waiting for Spotlight",
    purpose: "Internal items preventing client delivery.",
    render: () => simpleTable(dashboardSeed.clientActions.filter(a => a.waitingOn !== "Client").map(a => ({ project:project(a.projectId).code, waitingOn:a.waitingOn, item:a.action, nextAction:a.nextAction, status:chip(a.status) })), ["project","waitingOn","item","nextAction","status"])
  },
  client_commitments: {
    title: "Client Communications / Commitments",
    purpose: "Latest update, next promised deliverable, deadline, and owner.",
    render: () => simpleTable(dashboardSeed.clientActions.map(a => ({ project:project(a.projectId).code, latestUpdate:"Client status logged", nextPromisedDeliverable:a.action, deadline:a.due, owner:a.owner })), ["project","latestUpdate","nextPromisedDeliverable","deadline","owner"])
  },
  creative_project_queue: {
    title: "Creative Project Queue",
    purpose: "Creative requirements by project, deliverable, deadline, status, revision round, and next action.",
    render: () => creativeTable(dashboardCreativeJobs())
  },
  revision_tracker: {
    title: "Revision Tracker",
    purpose: "Revision rounds and excessive cycles that need direction.",
    render: () => widgetRegistry.revision_queue.render()
  },
  creative_risks: {
    title: "Creative Risks",
    purpose: "Incomplete briefs, unrealistic deadlines, missing assets, client approval delays, and overload.",
    render: () => simpleTable(dashboardCreativeJobs().filter(j => ["Overdue","Waiting","For revision"].includes(j.status) || j.round > 2).map(j => ({ project:project(j.projectId).code, risk:j.waitingOn, deliverable:j.deliverable, due:j.due, priority:chip(j.priority), action:j.nextAction })), ["project","risk","deliverable","due","priority","action"])
  },
  creative_forecast: {
    title: "Upcoming Creative Requirements",
    purpose: "7-day, 14-day, and 30-day creative load forecast.",
    render: () => { const jobs = dashboardCreativeJobs(); return barChart("Creative Forecast", [{ label:"7 days", value:jobs.filter(j=>daysUntil(j.due)<=7).length, color:"risk" }, { label:"14 days", value:jobs.filter(j=>daysUntil(j.due)<=14).length, color:"warn" }, { label:"30 days", value:jobs.length, color:"active" }], "jobs"); }
  },
  art_job_queue: { title: "Job Order Queue", purpose: "Artwork JOs by requester, designer, priority, due date, and release status.", render: () => widgetRegistry.creative_job_queue.render() },
  art_review_queue: { title: "My Review Queue", purpose: "Artwork requiring Art Director review.", render: () => widgetRegistry.creative_review_queue.render() },
  designer_workload: { title: "Designer Workload", purpose: "Active JOs per designer.", render: () => widgetRegistry.creative_workload.render() },
  art_deadlines: { title: "Upcoming Deadlines", purpose: "Event, printing, fabrication, presentation, and standard deliverables.", render: () => widgetRegistry.upcoming_presentations.render() },
  asset_approval_status: {
    title: "Asset / Approval Status",
    purpose: "Brand guidelines, logo assets, dimensions, copy, artwork approval, and production files.",
    render: () => simpleTable(dashboardCreativeJobs().map(j => ({ project:project(j.projectId).code, brandGuidelines:chip("Received","good"), logoAssets:chip("Received","good"), dimensions:j.waitingOn === "Dimensions" ? chip("Missing","risk") : chip("Confirmed","good"), copy:j.waitingOn === "Copy" ? chip("Pending","warn") : chip("Final","good"), artwork:j.status === "For revision" ? chip("Revision","warn") : chip(j.status) })), ["project","brandGuidelines","logoAssets","dimensions","copy","artwork"])
  },
  production_dependency_alert: {
    title: "Production Dependency Alert",
    purpose: "Artwork blocking printing, fabrication, LED content, signage, merch, or stage production.",
    render: () => widgetRegistry.production_ready_status.render()
  },
  production_portfolio: { title: "Production Portfolio", purpose: "Active projects, event dates, production lead, stage, health, and completion.", render: () => widgetRegistry.portfolio_operations_view.render() },
  execution_readiness_score: {
    title: "Execution Readiness Score",
    purpose: "Venue, ocular, technical, fabrication, printing, procurement, manpower, logistics, permits, call sheet, suppliers, and client approvals.",
    render: () => `${barChart("Readiness by Project", db.projects.filter(p=>!["LOST","CLOSED"].includes(p.stage)).map(p => ({ label:p.code, value:readinessScore(p.id), color:readinessScore(p.id) < 65 ? "risk" : readinessScore(p.id) < 85 ? "warn" : "good" })), "%")}${widgetRegistry.event_readiness.render()}`
  },
  production_team_capacity: { title: "Production Team Capacity", purpose: "Projects per EM/EO, deployments, overlapping events, provincial assignments, and overload.", render: () => widgetRegistry.resource_capacity.render() },
  critical_production_alerts: { title: "Critical Production Alerts", purpose: "Supplier, fabrication, printing, venue, manpower, tech, permits, and logistics gaps.", render: () => widgetRegistry.operational_risk_board.render() },
  event_countdown: {
    title: "Event Countdown",
    purpose: "Priority increases as event date approaches: 30 days, 14 days, 7 days, 72 hours, 24 hours.",
    render: () => simpleTable(myProjects().map(p => ({ project:`<button class="linkbtn" data-project="${p.id}">${p.code}</button>`, eventDate:formatShortDate(eventDate(p)), countdown:countdownLabel(p.liveDate), priority:chip(countdownPriority(p.liveDate), countdownPriority(p.liveDate)==="CRITICAL" ? "risk" : countdownPriority(p.liveDate)==="HIGH PRIORITY" ? "warn" : "active"), unresolved:blockerFor(p.id) })), ["project","eventDate","countdown","priority","unresolved"])
  },
  event_today_tasks: {
    title: "Today's Tasks",
    purpose: "Tactical execution sorted critical, high, normal.",
    render: () => simpleTable(dashboardProjectItems(dashboardSeed.operationsTasks).map(t => ({ project:project(t.projectId).code, task:t.type, priority:chip(/Blocked|risk/i.test(t.status) ? "CRITICAL" : "HIGH", /Blocked|risk/i.test(t.status) ? "risk" : "warn"), due:t.due, status:chip(t.status), nextAction:t.nextAction })), ["project","task","priority","due","status","nextAction"])
  },
  event_budget_tracker: {
    title: "Budget Tracker",
    purpose: "Managed-project budget allocated, requested, released, actual expenses, remaining, and liquidation balance.",
    render: () => reconciliationTable()
  },
  event_supplier_status: {
    title: "Supplier Status",
    purpose: "Supplier requirement, quotation, awarded status, downpayment, delivery, contact, and status.",
    render: () => simpleTable(dashboardProjectItems(dashboardSeed.procurementItems).map(i => ({ project:project(i.projectId).code, supplier:i.requirement, quotation:i.status.includes("Quotation") ? chip("Pending","warn") : chip("Needed","risk"), awarded:i.status === "No supplier yet" ? chip("No","risk") : chip("Partial","warn"), downpayment:chip("Pending","warn"), delivery:i.needBy, contact:"See supplier master", status:chip(i.status) })), ["project","supplier","quotation","awarded","downpayment","delivery","contact","status"])
  },
  procurement_workflow: {
    title: "Procurement Workflow",
    purpose: "Request to sourcing, RFQ, comparison, approval, PO, payment, delivery, completed.",
    render: () => barChart("Workflow Status", [{ label:"Request", value:3 }, { label:"Sourcing", value:2, color:"warn" }, { label:"RFQ", value:1, color:"warn" }, { label:"Approval", value:1, color:"active" }, { label:"Delivery", value:1, color:"risk" }], "items")
  },
  sourcing_queue: { title: "Sourcing Queue", purpose: "Items requiring supplier sourcing.", render: () => widgetRegistry.procurement_queue.render() },
  quote_comparison: {
    title: "Quote Comparison",
    purpose: "Supplier quote, payment terms, lead time, performance, and selected supplier.",
    render: () => simpleTable([{ supplier:"BuildRight Fabrication", quotedAmount:fmt(500000), terms:"50/50", leadTime:"8 days", performance:"4.6/5", selected:chip("Selected","good") }, { supplier:"Island Movers", quotedAmount:fmt(360000), terms:"COD", leadTime:"4 days", performance:"3.4/5", selected:chip("Watch","warn") }], ["supplier","quotedAmount","terms","leadTime","performance","selected"])
  },
  delivery_tracker: {
    title: "Delivery Tracker",
    purpose: "Item, supplier, expected delivery, location, status, and responsible person.",
    render: () => simpleTable(dashboardProjectItems(dashboardSeed.procurementItems).map(i => ({ item:i.requirement, supplier:i.status === "No supplier yet" ? "TBD" : i.requirement, expectedDelivery:i.needBy, location:project(i.projectId).location, responsible:i.requestedBy, status:chip(i.status) })), ["item","supplier","expectedDelivery","location","responsible","status"])
  },
  supplier_database_snapshot: { title: "Supplier Database", purpose: "Supplier type, historical spend, reliability, lead time, issues, and status.", render: () => views.Suppliers() },
  cash_position: {
    title: "Cash Position",
    purpose: "Bank balances, operating fund, project funds, available cash, restricted cash, reserve, and forecast needs.",
    render: () => {
      const cash = 3650000, restricted = 1280000, reserve = 1500000;
      return `<div class="grid cols-3">${mini("Bank balances", fmt(cash))}${mini("Operating fund", fmt(cash - restricted))}${mini("Project funds", fmt(restricted))}${mini("Available cash", fmt(cash - restricted))}${mini("Restricted / committed cash", fmt(restricted))}${mini("Minimum reserve", fmt(reserve))}</div>${barChart("Reserve Status", [{ label:"Available", value:cash-restricted, color: cash-restricted > reserve ? "good" : "risk" }, { label:"Reserve", value:reserve, color:"done" }], "PHP")}`;
    }
  },
  budget_release_queue: { title: "Budget Requests", purpose: "Pending, approved, scheduled, and released with CE balance and previous releases.", render: () => budgetTable() },
  project_financial_health: { title: "Project Financial Health", purpose: "CE, revenue, approved budget, actual, remaining, expense %, gross profit, and margin.", render: () => widgetRegistry.profitability_monitor.render() },
  accounts_payable: {
    title: "Accounts Payable",
    purpose: "Supplier obligations and due dates.",
    render: () => simpleTable([{ supplier:"BuildRight Fabrication", project:"2026-UNILAB-0001", amount:fmt(180000), due:"2026-09-06", status:chip("Upcoming","warn") }, { supplier:"Island Movers", project:"2026-JFC-0003", amount:fmt(95000), due:"2026-09-03", status:chip("Due soon","warn") }], ["supplier","project","amount","due","status"])
  },
  cash_forecast: {
    title: "Cash Forecast",
    purpose: "Incoming collections versus expected releases and payments.",
    render: () => barChart("Next Cash Windows", [{ label:"7 days needs", value:580000, color:"warn" }, { label:"14 days needs", value:920000, color:"warn" }, { label:"30 days collections", value:2880000, color:"good" }], "PHP")
  },
  finance_alerts: { title: "Finance Alerts", purpose: "Cash reserve, budget exceeded, margin below target, AR, upcoming cash, and liquidation exposure.", render: () => widgetRegistry.executive_alerts.render() },
  liquidation_audit_queue: {
    title: "Liquidation Audit Queue",
    purpose: "Receipt completeness, category, amount, budget alignment, validity, tax docs, and findings.",
    render: () => simpleTable(db.liquidations.filter(l => !/Cleared/i.test(l.status)).map(l => ({ employee:l.employee, project:project(l.projectId).code, amount:fmt(l.liquidated || l.released), receipts:l.findings ? chip("Incomplete","risk") : chip("Pending","warn"), budgetAlignment:chip("Check","warn"), validity:chip(l.status), findings:l.findings || "Awaiting submission" })), ["employee","project","amount","receipts","budgetAlignment","validity","findings"])
  },
  budget_release_processing: { title: "Budget Release Processing", purpose: "Request to finance review, approval, scheduled, prepared, released.", render: () => budgetTable() },
  ce_audit_queue: { title: "CE Audit Queue", purpose: "Formula, VAT, ASF, supplier costs, margins, mathematical errors, and completeness.", render: () => widgetRegistry.ce_review_queue.render() },
  compliance_tracker: { title: "Compliance Tracker", purpose: "Missing ORs, supplier docs, BIR docs, contracts, POs, signed CEs, billing docs, and substantiation.", render: () => widgetRegistry.missing_documents.render() },
  no_liquidation_rule: {
    title: "CRP Savings Guardrail",
    purpose: "Flags CRP requests by retained project-cost savings while line items keep their own 60% marks.",
    render: () => simpleTable(db.budgetRequests.filter(isCrpOverride).map(b => {
      const review = crpOverallReview(b.projectId, crpUploadForRequest(b));
      return { requestor:b.requestor, project:project(b.projectId).code, request:fmt(b.amount), totalCrp:fmt(review.requestTotal), savings:`${Math.round(review.savingsRatio * 100)}%`, policy:chip(review.band.label, review.band.tone) };
    }), ["requestor","project","request","totalCrp","savings","policy"])
  },
  approval_queue: {
    title: "Requires My Approval",
    purpose: "CEs, CRPs, margin exceptions, and policy overrides waiting for decision.",
    render: () => {
      const approvals = db.approvals.filter(a => a.status === "Pending").map(a => ({ projectId: a.projectId, item: a.type, owner: a.approver, due: "Now", status: "Pending", next: "Review CE" }));
      const exceptions = db.budgetRequests.filter(isCrpOverride).map(b => ({ projectId: b.projectId, item: `${b.category} ${fmt(b.amount)}`, owner: b.requestor, due: formatShortDate(b.dateRequired), status: b.status, next: "Approve, reject, or return" }));
      return queueTable([...approvals, ...exceptions], ["Project", "Item", "Owner", "Due", "Status", "Next Action"]);
    }
  },
  financial_summary: {
    title: "Financial Command Center",
    purpose: "Management-level financial health without confusing revenue, billing, collections, and cash.",
    render: () => {
      const m = metrics();
      const cards = `${mini("Awarded project value", fmt(m.awarded.reduce((s,p)=>s+p.value,0)))}${mini("Revenue YTD", fmt(m.actRevenue))}${mini("Gross profit YTD", fmt(m.actRevenue - m.actCost))}${mini("Gross margin", `${Math.round(margin(m.actRevenue,m.actCost)*100)}%`)}${mini("Outstanding AR", fmt(m.ar))}${mini("Employee advances", fmt(m.outstandingAdvances))}`;
      return `<div class="grid cols-3">${cards}</div>${barChart("Estimated vs Actual Margin", [{ label: "Estimated", value: Math.round(margin(m.expectedRevenue,m.estCost)*100), color: "good" }, { label: "Actual", value: Math.round(margin(m.actRevenue,m.actCost)*100), color: margin(m.actRevenue,m.actCost) >= settings.targetGrossMargin ? "good" : "risk" }], "%")}`;
    }
  },
  project_health: {
    title: "Projects Requiring Visibility",
    purpose: "Projects that are at risk, approaching live date, stuck, or awaiting closure.",
    render: () => projectTable(db.projects.filter(p => health(p)[0] !== "HEALTHY").concat(db.projects.filter(p => daysUntil(p.liveDate) <= 7 && daysUntil(p.liveDate) >= 0)))
  },
  pipeline_summary: {
    title: "Pipeline Summary",
    purpose: "Opportunity value by stage and conversion health.",
    render: () => {
      const stageRows = ["LEAD","QUALIFICATION","BRIEFED","COSTING","PITCHING","NEGOTIATION","AWARDED","LOST"].map(stage => ({ label: stage, value: db.projects.filter(p => p.stage === stage).reduce((s,p)=>s+p.value,0) }));
      const countRows = stageRows.map(r => ({ label: r.label, value: r.value, color: r.label === "LOST" ? "risk" : "active" }));
      const m = metrics();
      return `<div class="grid cols-3">${mini("Active opportunities", m.pitching.length)}${mini("Pipeline value", fmt(m.pipelineValue))}${mini("Win rate", `${Math.round(m.awarded.length / db.projects.length * 100)}%`)}</div>${barChart("Value by Stage", countRows, "PHP")}`;
    }
  },
  capacity_load: {
    title: "Company Load",
    purpose: "Deterministic counts before advanced capacity modeling exists.",
    render: () => {
      const owners = groupCount(db.projects.filter(p => !["LOST","CLOSED"].includes(p.stage)), "implementationOwner");
      return `${barChart("Projects by Implementation Owner", Object.entries(owners).map(([label,value]) => ({ label, value, color: value > 1 ? "warn" : "good" })), "projects")}${mini("Events next 7 days", db.projects.filter(p => daysUntil(p.liveDate) >= 0 && daysUntil(p.liveDate) <= 7).length)}${mini("Active projects", metrics().active.length)}`;
    }
  },
  client_health: {
    title: "Client Health",
    purpose: "Revenue, repeat work, and AR exposure by client.",
    render: () => {
      const rows = db.clients.map(c => {
        const ps = db.projects.filter(p => p.clientId === c.id);
        const ar = db.invoices.filter(i => ps.some(p => p.id === i.projectId)).reduce((s,i)=>s+i.amount-i.collected,0);
        return { client: c.company, projects: ps.length, awarded: fmt(ps.reduce((s,p)=>s+p.approvedCe,0)), ar: fmt(ar), status: ar ? chip("AR Exposure","warn") : chip("Healthy","good") };
      });
      return simpleTable(rows, ["client","projects","awarded","ar","status"]);
    }
  },
  recent_activity: {
    title: "Recent Relevant Activity",
    purpose: "Only changes that affect today's work.",
    render: () => `<div class="timeline">${relevantActivity().map(activityItem).join("")}</div>`
  },
  active_job_board: { title: "Active JO Board", purpose: "Traffic view of active jobs and owners.", render: () => projectTable(db.projects.filter(p => !["LOST","CLOSED"].includes(p.stage))) },
  team_workload: {
    title: "Team Workload",
    purpose: "Simple active assignment counts by employee.",
    render: () => barChart("Assigned Work Items", teamLoadRows(), "items")
  },
  deadline_collisions: {
    title: "Deadline Collisions",
    purpose: "Multiple deliverables landing on the same date.",
    render: () => {
      const rows = Object.entries(groupCount(dashboardSeed.creativeJobs.concat(dashboardSeed.operationsTasks), "due")).map(([date,count]) => ({ date, count, status: count > 1 ? chip("Collision","warn") : chip("Normal","good") }));
      return simpleTable(rows, ["date","count","status"]);
    }
  },
  unassigned_work: {
    title: "Unassigned Work",
    purpose: "Projects missing clear ownership.",
    render: () => simpleTable(db.projects.filter(p => /Unassigned|Studio/.test(p.implementationOwner)).map(p => ({ project: p.code, issue: "Implementation owner needs named person", stage: chip(p.stage) })), ["project","issue","stage"])
  },
  account_pipeline: {
    title: "Account Team Pipeline",
    purpose: "Opportunity count and value by account owner.",
    render: () => barChart("Pipeline by Account Owner", Object.entries(groupSum(db.projects, "owner", "value")).map(([label,value]) => ({ label, value, color: "active" })), "PHP")
  },
  client_followups: {
    title: "Client Follow-ups",
    purpose: "Client-facing actions that keep opportunities moving.",
    render: () => queueTable(dashboardSeed.clientActions.filter(a => roleIsManagement() || a.owner === currentUser()).map(a => ({ projectId:a.projectId, item:a.action, owner:a.owner, due:a.due, status:a.status, next:a.nextAction })), ["Project","Item","Owner","Due","Status","Next Action"])
  },
  pitch_performance: { title: "Pitch Performance", purpose: "Pitch-to-award conversion.", render: () => barChart("Pitch Outcomes", [{ label:"Won", value:2, color:"good" }, { label:"Pending", value:2, color:"warn" }, { label:"Lost", value:1, color:"risk" }], "pitches") },
  revenue_forecast: { title: "Revenue Forecast", purpose: "Expected revenue by time window.", render: () => barChart("Expected Revenue", [{ label:"30 days", value:2400000 }, { label:"60 days", value:1850000 }, { label:"90 days", value:980000 }], "PHP") },
  my_projects: { title: "My Projects", purpose: "Projects where the user owns client or delivery responsibility.", render: () => projectTable(myProjects()) },
  client_deadlines: { title: "Client Deadlines", purpose: "Client decisions due in the next 7 to 14 days.", render: () => widgetRegistry.client_followups.render() },
  approval_status: { title: "Project Approval Status", purpose: "Brief, CE, PO, creative, production, and billing status by project.", render: () => simpleTable(myProjects().map(p => ({ project:p.code, brief:chip("Attached","good"), ce:p.approvedCe ? chip("Signed","good") : chip("Pending","warn"), po:p.stage === "PITCHING" ? chip("Missing","risk") : chip("Received","good"), billing:p.actualRevenue ? chip("Issued","good") : chip("Not yet","warn") })), ["project","brief","ce","po","billing"]) },
  client_contacts: { title: "Client Contacts", purpose: "Fast access to marketing, procurement, and finance contacts.", render: () => simpleTable(db.contacts.map(c => ({ client:client(c.clientId).company, name:c.name, type:c.type, email:c.email, mobile:c.mobile })), ["client","name","type","email","mobile"]) },
  followup_queue: { title: "Follow-up Queue", purpose: "Chronological queue of overdue, today, this week, waiting on client, and waiting on internal team.", render: () => queueTable(dashboardSeed.clientActions.concat(dashboardSeed.operationsTasks).map(a => ({ projectId:a.projectId, item:a.action || a.type, owner:a.owner, due:a.due, status:a.status, next:a.nextAction })), ["Project","Item","Owner","Due","Status","Next Action"]) },
  creative_review_queue: { title: "Creative Review Queue", purpose: "Concept, KV, layout, 3D, and FA reviews requiring lead attention.", render: () => creativeTable(dashboardCreativeJobs().filter(j => ["For review","For revision","Due today"].includes(j.status))) },
  creative_workload: { title: "Creative Project Load", purpose: "Designer and writer workload by active assignment count.", render: () => barChart("Creative Jobs by Person", creativeLoadRows(), "jobs") },
  creative_job_queue: { title: "My Job Order List", purpose: "Design work in priority order with blockers and next action.", render: () => creativeTable(dashboardCreativeJobs().filter(j => roleIsManagement() || j.owner === currentUser() || /^(CREATIVE DIRECTOR|ASSOCIATE CREATIVE DIRECTOR|ART LEAD)$/.test(canonicalRole()))) },
  today_queue: { title: "Today", purpose: "Items due today or already overdue.", render: () => creativeTable(dashboardCreativeJobs().filter(j => ["Due today","Overdue"].includes(j.status))) },
  revision_queue: { title: "Revision Queue", purpose: "Returned client or internal changes that need action.", render: () => creativeTable(dashboardCreativeJobs().filter(j => j.status === "For revision" || j.round > 1)) },
  waiting_queue: { title: "Waiting On", purpose: "Blocked work grouped by dependency owner.", render: () => simpleTable(dashboardCreativeJobs().filter(j => j.waitingOn && j.waitingOn !== "None").map(j => ({ project:project(j.projectId).code, deliverable:j.deliverable, waitingOn:j.waitingOn, nextAction:j.nextAction, due:j.due })), ["project","deliverable","waitingOn","nextAction","due"]) },
  creative_status_graph: { title: "Creative Queue Graph", purpose: "Fast view of due, blocked, revision, and upcoming creative load.", render: () => barChart("Creative Status", Object.entries(groupCount(dashboardCreativeJobs().filter(j => j.owner === currentUser()), "status")).map(([label,value]) => ({ label, value, color: label === "Overdue" ? "risk" : label === "Waiting" ? "warn" : "active" })), "jobs") },
  copy_queue: { title: "Copy Queue", purpose: "Copy jobs needing writing, review, revision, or approval.", render: () => creativeTable(dashboardCreativeJobs().filter(j => j.role.includes("Copy") || j.waitingOn === "Copy" || j.waitingOn === "Copy Lead")) },
  three_d_queue: { title: "3D Queue", purpose: "Visualization jobs and missing technical inputs.", render: () => creativeTable(dashboardCreativeJobs().filter(j => j.role.includes("3D") || j.waitingOn === "3D")) },
  production_ready_status: { title: "Production-ready Status", purpose: "Projects approaching fabrication or event that still need final creative assets.", render: () => simpleTable(dashboardCreativeJobs().filter(j => ["Waiting","For revision","Overdue"].includes(j.status)).map(j => ({ project:project(j.projectId).code, deliverable:j.deliverable, blocker:j.waitingOn, due:j.due, status:chip(j.status) })), ["project","deliverable","blocker","due","status"]) },
  upcoming_presentations: { title: "Upcoming Presentations", purpose: "Creative readiness for near-term client meetings.", render: () => simpleTable(dashboardCreativeJobs().filter(j => daysUntil(j.due) >= 0 && daysUntil(j.due) <= 7).map(j => ({ project:project(j.projectId).code, deliverable:j.deliverable, owner:j.owner, due:j.due, status:chip(j.status) })), ["project","deliverable","owner","due","status"]) },
  implementation_risks: { title: "Critical Operations Issues", purpose: "Operational blockers before event day.", render: () => queueTable(dashboardProjectItems(dashboardSeed.operationsTasks).map(t => ({ projectId:t.projectId, item:t.type, owner:t.owner, due:t.due, status:t.status, next:t.nextAction })), ["Project","Item","Owner","Due","Status","Next Action"]) },
  operations_calendar: { title: "Upcoming Execution Calendar", purpose: "Deadlines, events, liquidations, and readiness items in the next 14 days.", render: () => simpleTable(upcomingRows(), ["date","project","type","owner","status"]) },
  production_budget_health: { title: "Production Budget Health", purpose: "Approved, requested, released, actual, and variance for production categories.", render: () => reconciliationTable() },
  my_events: { title: "My Events", purpose: "Events ordered by live date with readiness and blocker signals.", render: () => projectTable(accessibleProjects().sort((a,b)=>daysUntil(a.liveDate)-daysUntil(b.liveDate))) },
  event_readiness: {
    title: "Pre-production Readiness",
    purpose: "Tomorrow and this-week readiness checklist.",
    render: () => {
      const tasks = dashboardProjectItems(dashboardSeed.operationsTasks);
      const graph = barChart("Readiness Signals", Object.entries(groupCount(tasks, "status")).map(([label, value]) => ({ label, value, color: /Blocked|risk|Incomplete/i.test(label) ? "risk" : /Confirmed|Approved/i.test(label) ? "good" : "warn" })), "items");
      const table = simpleTable(tasks.map(t => ({ requirement:t.type, waitingOn:t.waitingOn, due:t.due, status:chip(t.status), nextAction:t.nextAction })), ["requirement","waitingOn","due","status","nextAction"]);
      return graph + table;
    }
  },
  my_budget_requests: { title: "My Budget Requests", purpose: "Requested, approved, released, rejected, and correction status.", render: () => budgetTable() },
  my_liquidations: { title: "My Outstanding Liquidations", purpose: "Cash advances the user must clear.", render: () => liquidationTable() },
  event_tasks: { title: "Assigned Execution Tasks", purpose: "Operational tasks assigned to onsite teams.", render: () => widgetRegistry.implementation_risks.render() },
  supplier_followups: { title: "Supplier Follow-ups", purpose: "Supplier quotation, payment, and delivery tasks.", render: () => widgetRegistry.procurement_queue.render() },
  procurement_queue: { title: "Procurement Request Queue", purpose: "What must be sourced, purchased, followed up, and documented.", render: () => simpleTable(dashboardProjectItems(dashboardSeed.procurementItems).map(i => ({ project:project(i.projectId).code, requirement:i.requirement, category:i.category, requestedBy:i.requestedBy, needBy:i.needBy, status:chip(i.status) })), ["project","requirement","category","requestedBy","needBy","status"]) },
  supplier_alerts: { title: "Supplier Alerts", purpose: "Late, unresponsive, quality, or reliability concerns.", render: () => simpleTable(db.suppliers.filter(s => s.status !== "Preferred" || s.reliability < 4).map(s => ({ supplier:s.name, category:s.category, reliability:s.reliability, issue:s.notes, status:chip(s.status) })), ["supplier","category","reliability","issue","status"]) },
  supplier_payments: { title: "Supplier Payments", purpose: "Downpayments, balances, and missing supplier documents.", render: () => widgetRegistry.procurement_queue.render() },
  procurement_budget: { title: "Procurement Budget", purpose: "Approved, committed, released, actual, and remaining for procurement categories.", render: () => reconciliationTable() },
  my_incidentals: { title: "Incidentals", purpose: "Meals and transport against configurable thresholds.", render: () => `${mini("Per-day threshold", fmt(settings.incidentalPerDayThreshold))}${mini("Per-project threshold", fmt(settings.incidentalPerProjectThreshold))}${barChart("Used vs Threshold", [{ label:"Today", value:2200, color:"good" }, { label:"Project", value:12400, color:"warn" }], "PHP")}` },
  manpower_fund_tracker: { title: "Manpower Fund Assignments", purpose: "Cash accountability by project for field manpower.", render: () => simpleTable(dashboardProjectItems(db.releases).filter(r => r.category === "Manpower").map(r => ({ project:project(r.projectId).code, released:fmt(r.amount), distributed:fmt(50000), remaining:fmt(Math.max(0,r.amount-50000)), status:chip(r.status), due:db.liquidations.find(l=>l.releaseId===r.id)?.due || "" })), ["project","released","distributed","remaining","status","due"]) },
  cash_on_hand: { title: "Cash On Hand", purpose: "Company cash currently under employee accountability.", render: () => `<div class="cash-callout">Company cash currently under your accountability: <strong>${fmt(70000)}</strong></div>` },
  liquidation_deadlines: { title: "Liquidation Deadlines", purpose: "Due today, upcoming, overdue.", render: () => widgetRegistry.liquidation_tracker.render() },
  event_manpower: { title: "Event Manpower", purpose: "Workers and payment readiness by event.", render: () => simpleTable([{ project:"2026-JFC-0003", eventDate:formatShortDate("2026-08-05"), workers:36, paymentStatus:chip("Partially ready","warn") }, { project:"2026-UNILAB-0001", eventDate:formatShortDate("2026-08-18"), workers:40, paymentStatus:chip("Cleared","good") }], ["project","eventDate","workers","paymentStatus"]) },
  liquidation_tracker: { title: "Liquidation Tracker", purpose: "Primary queue for processing, audit, findings, and clearance.", render: () => `${barChart("Liquidation Aging", Object.entries(groupCount(db.liquidations, "status")).map(([label,value]) => ({ label, value, color: /For Cash Return|For Reimbursement|Overdue|Findings/i.test(label) ? "risk" : /Under Audit|For/i.test(label) ? "warn" : "good" })), "records")}${liquidationTable()}` },
  budget_processing_queue: { title: "Budget / CRP Processing Queue", purpose: "New requests, under processing, approved, cash prep, and released.", render: () => budgetTable() },
  missing_documents: { title: "Missing Documents", purpose: "Receipts, supplier invoices, acknowledgements, proof of payment, and supporting forms.", render: () => simpleTable([{ project:"2026-UNILAB-0001", document:"Official receipt declaration", owner:"Marco Dela Paz", days:8, status:chip("Missing","risk") }, { project:"2026-JFC-0003", document:"Liquidation form", owner:"Marco Dela Paz", days:6, status:chip("Overdue","risk") }, { project:"2026-UNILAB-0001", document:"Supplier invoice", owner:"BuildRight Fabrication", days:2, status:chip("Follow up","warn") }], ["project","document","owner","days","status"]) },
  reimbursement_queue: { title: "Reimbursement Queue", purpose: "Reimbursements that cannot be processed until audit is cleared.", render: () => simpleTable(db.liquidations.filter(l => l.reimbursable).map(l => ({ project:project(l.projectId).code, employee:l.employee, amount:fmt(l.reimbursable), gate:/Cleared/i.test(l.status) ? chip("Ready","good") : chip("Audit first","warn"), nextAction:"Wait for liquidation clearance" })), ["project","employee","amount","gate","nextAction"]) },
  ce_review_queue: { title: "CE Review / Financial Control", purpose: "CEs awaiting finance or management review with margin signals.", render: () => simpleTable(db.ceVersions.filter(c => !c.approved).map(c => ({ project:project(c.projectId).code, version:c.version, value:fmt(c.revenue), margin:`${Math.round(margin(c.revenue,c.directCost)*100)}%`, status:chip(c.status), nextAction:"Validate formulas, VAT, ASF, and margin" })), ["project","version","value","margin","status","nextAction"]) },
  profitability_monitor: { title: "Profitability Monitor", purpose: "Margin below target, variance, and unusual actual cost signals.", render: () => simpleTable(db.projects.filter(p => margin(p.actualRevenue || p.expectedRevenue, p.actualCost || p.estimatedCost) < settings.targetGrossMargin).map(p => ({ project:p.code, revenue:fmt(p.actualRevenue || p.expectedRevenue), cost:fmt(p.actualCost || p.estimatedCost), margin:`${Math.round(margin(p.actualRevenue || p.expectedRevenue, p.actualCost || p.estimatedCost)*100)}%`, status:chip("Below target","risk") })), ["project","revenue","cost","margin","status"]) },
  cash_advance_exposure: { title: "Cash Advance Exposure", purpose: "Outstanding advances by employee and project.", render: () => liquidationTable() },
  ar_aging: { title: "AR Aging", purpose: "Current, 30, 60, 90+ collections exposure.", render: () => `${barChart("AR Aging", arRows(), "PHP")}${invoiceTable()}` },
  exception_report: { title: "Exception Report", purpose: "Overrides, missing receipts, over-budget spending, delayed liquidation, unusual reimbursement.", render: () => simpleTable([{ type:"Budget override", project:"2026-JFC-0003", owner:"Marco Dela Paz", risk:"Overdue liquidation", status:chip("Needs approval","warn") }, { type:"Missing receipt", project:"2026-UNILAB-0001", owner:"Marco Dela Paz", risk:"Audit finding", status:chip("Correction","risk") }], ["type","project","owner","risk","status"]) },
  closure_queue: { title: "Closure Support", purpose: "Projects blocked from closure due to finance, docs, supplier, billing, or archive gaps.", render: () => closureView("p1") },
  admin_support: { title: "Admin Support Queue", purpose: "Operational admin needs without turning MVP into HRIS.", render: () => simpleTable(dashboardSeed.adminItems.map(i => ({ project:project(i.projectId).code, requirement:i.requirement, owner:i.owner, due:i.due, status:chip(i.status) })), ["project","requirement","owner","due","status"]) },
  employee_directory: { title: "Employee Directory", purpose: "Lightweight people lookup for operational support.", render: () => simpleTable(Object.entries(userByRole()).map(([role,name]) => ({ name, role, status:chip("Active","good") })), ["name","role","status"]) },
  warehouse_turnover: { title: "Warehouse Turnover", purpose: "Incoming, release, returns, and issue visibility.", render: () => simpleTable(dashboardSeed.warehouseItems.map(i => ({ project:project(i.projectId).code, item:i.item, qty:i.qty, date:i.date, owner:i.owner, status:chip(i.status) })), ["project","item","qty","date","owner","status"]) },
  documentation_tracker: { title: "Documentation Tracker", purpose: "Briefing, proofing, fabrication, ocular, set check, event, and turnover capture.", render: () => simpleTable(dashboardSeed.contentItems.map(i => ({ project:project(i.projectId).code, milestone:i.milestone, status:chip(i.status), nextAction:i.nextAction })), ["project","milestone","status","nextAction"]) },
  content_opportunities: { title: "Content Opportunity Pipeline", purpose: "Project moments available for client/event and systems/culture content.", render: () => simpleTable(dashboardSeed.contentItems.map(i => ({ project:project(i.projectId).code, milestone:i.milestone, contentType:i.contentType, status:chip(i.status), nextAction:i.nextAction })), ["project","milestone","contentType","status","nextAction"]) },
  content_mix: { title: "Content Mix", purpose: "70% client/event and 30% internal systems/culture operating target.", render: () => barChart("Target Content Mix", [{ label:"Client/Event", value:70, color:"active" }, { label:"Systems/Culture", value:30, color:"good" }], "%") }
};

function renderRoleDashboard() {
  const profile = dashboardProfile();
  const visible = id => widgetRegistry[id] && canSeeDashboardItem(widgetAccessItems[id]);
  const primaryIds = profile.primary.filter(visible);
  const secondaryIds = profile.secondary.filter(visible);
  const widgets = [...primaryIds, ...secondaryIds];
  const critical = primaryIds.map(renderWidget).join("");
  const secondary = secondaryIds.map(renderWidget).join("");
  return `
    <div class="commandbar">
      <div>
        <div class="eyebrow">Spotlight OS Command Center</div>
        <h2>${dashboardTitle()}</h2>
        <p>${profile.question}</p>
      </div>
      <div class="actions"><button class="btn primary" data-view="Projects">View</button></div>
    </div>
    ${dashboardPulse()}
    ${employeeDashboardBuckets()}
    ${dashboardLayoutControls(widgets)}
    <div class="dashboard-intro">
      <div>${chip("Role-aware dashboard", "active")} ${chip(`${widgets.length} widgets`, "good")}</div>
      <p>${profile.restricted}</p>
    </div>
    <div class="section"><h3>Needs Attention Now</h3><div class="dash-grid">${critical}</div></div>
    <div class="section"><h3>My Work, Upcoming, and Role Health</h3><div class="dash-grid">${secondary}</div></div>`;
}

function renderWidget(id) {
  const widget = widgetRegistry[id];
  const body = widget.render();
  if (!body || body.includes("No records")) return "";
  const customHeight = widgetHeight(id);
  const heightStyle = customHeight ? ` style="--widget-height:${customHeight}px"` : "";
  return `<section class="card widget ${widgetTone(id)} size-${widgetSize(id).toLowerCase()}" data-widget-id="${id}"${heightStyle}><div class="widget-head"><div><h3>${widget.title}</h3><p>${widget.purpose}</p></div>${widgetAction(id)}</div><div class="widget-body">${body}</div><button class="widget-resize-handle" data-widget-resize="${id}" aria-label="Resize ${widget.title}"></button></section>`;
}

function defaultWidgetSize(id) {
  const defaults = {
    executive_company_health: "Wide",
    executive_alerts: "Compact",
    ceo_approvals: "Default",
    project_portfolio: "Wide",
    year_on_year_revenue: "Full",
    client_portfolio: "Default",
    organization_health: "Default",
    portfolio_operations_view: "Full",
    operational_risk_board: "Wide",
    resource_capacity: "Default",
    liquidation_tracker: "Full",
    liquidation_audit_queue: "Wide",
    ar_aging: "Wide"
  };
  return defaults[id] || "Default";
}

function roleLayout() {
  widgetLayoutConfig[state.role] ||= {};
  return widgetLayoutConfig[state.role];
}

function roleHeights() {
  widgetHeightConfig[state.role] ||= {};
  return widgetHeightConfig[state.role];
}

function widgetSize(id) {
  return roleLayout()[id] || defaultWidgetSize(id);
}

function widgetHeight(id) {
  return roleHeights()[id] || "";
}

function dashboardLayoutControls(widgets) {
  return `<details class="settings-panel layout-config">
    <summary class="settings-summary"><span class="settings-icon" aria-hidden="true">&#9881;</span><span>Dashboard section settings</span></summary>
    <div class="layout-config-head"><span>Resize dashboard sections</span><button class="btn" data-layout-reset="true">Reset</button></div>
    <div class="layout-controls">${widgets.map(id => `<label><span>${widgetRegistry[id].title}</span><select data-widget-size="${id}">${widgetSizeOptions.map(option => `<option ${option === widgetSize(id) ? "selected" : ""}>${option}</option>`).join("")}</select></label>`).join("")}</div>
  </details>`;
}

function dashboardPulse() {
  if (canonicalRole() === "CEO") return ceoConfigurableCards();
  const actions = actionCenterRows();
  return pulseCards([
    { label:"Critical", value:actions.filter(a => priorityRank(a.status) === 0).length, hint:"Needs action now", view:"Approvals", tone:"urgent" },
    { label:"Due Soon", value:actions.filter(a => priorityRank(a.status) === 1).length, hint:"Due today or waiting", view:"Projects" },
    { label:"At Risk", value:myProjects().filter(p => health(p)[0] === "AT RISK").length, hint:"In my scope", view:"Projects", tone:"risk" },
    nextEventCard()
  ]);
}

function pulseCards(cards) {
  return `<div class="pulse-grid">${cards.map(c => `<button class="pulse-card ${c.tone || ""} ${c.content ? "rich" : ""}" data-view="${c.view || "Dashboard"}">${c.content || `<span>${c.label}</span><strong>${c.value}</strong><em>${c.hint}</em>`}</button>`).join("")}</div>`;
}

function ceoConfigurableCards() {
  const controls = `<details class="settings-panel card-config">
    <summary class="settings-summary"><span class="settings-icon" aria-hidden="true">&#9881;</span><span>CEO card settings</span></summary>
    <div class="card-config-controls">${ceoCardConfig.map((selected, index) => `<select data-ceo-card="${index}">${ceoCardOptions.map(option => `<option ${option === selected ? "selected" : ""}>${option}</option>`).join("")}</select>`).join("")}</div>
  </details>`;
  return ceoRevenueProgress() + controls + pulseCards(ceoCardConfig.map(ceoCardData));
}

function ceoRevenueProgress() {
  const target = 100000000;
  const grandTotal = 73300000;
  const percent = Math.min(100, Math.round(grandTotal / target * 100));
  const remaining = Math.max(0, target - grandTotal);
  return `<section class="revenue-progress" aria-label="Revenue progress">
    <div class="progress-copy">
      <span>Revenue vs Target</span>
      <strong>${percent}% complete</strong>
      <small>${fmt(remaining)} remaining to target</small>
    </div>
    <div class="game-progress">
      <div class="game-progress-track"><i style="width:${percent}%"></i></div>
      <div class="game-progress-labels"><span>YTD ${fmt(grandTotal)}</span><b>Target ${fmt(target)}</b></div>
    </div>
  </section>`;
}

function ceoCardData(label) {
  const m = metrics();
  const underAudit = db.liquidations.filter(l => /Under Audit|For Cash Return|For Reimbursement/i.test(l.status)).reduce((s,l)=>s + Math.max(0, l.released - l.returned), 0);
  const map = {
    "Revenue YTD": { label, value: fmt(73300000), hint:"Grand total revenue including ASF and VAT", view:"Finance" },
    "Accounts Receivables": { label, view:"Finance", tone:"risk", content: ceoMoneyCard("Accounts Receivables", m.ar, "Billed but not collected", arDetailRows()) },
    "Accounts Payable": { label, view:"Finance", tone:"risk", content: ceoMoneyCard("Accounts Payable", 820000, "Supplier obligations due", apDetailRows()) },
    "Total Unliquidated Amount": { label, value: fmt(underAudit), hint:"Released cash under employee accountability", view:"Liquidations", tone:"urgent" }
  };
  return map[label];
}

function employeeDashboardBuckets() {
  return `<div class="dashboard-work-buckets" aria-label="Calendar and tasks">
    <section class="dashboard-work-bucket calendar-bucket">${employeeCalendarCard()}</section>
    <section class="dashboard-work-bucket task-bucket">${employeeTasksCard()}</section>
  </div>`;
}

function dashboardCalendarItems() {
  const scopedProjects = accessibleProjects();
  const visibleProjects = scopedProjects.length || canonicalRole() !== "ADMIN & HR OFFICER"
    ? scopedProjects
    : db.projects.filter(item => item.stage !== "LOST");
  const visibleIds = new Set(visibleProjects.map(item => item.id));
  const items = dashboardSeed.calendarItems
    .filter(item => visibleIds.has(item.projectId))
    .map(item => ({ ...item, source:project(item.projectId)?.name || "Project" }));

  visibleProjects.forEach(item => {
    if (item.created) items.push({ date:item.created, projectId:item.id, item:`${item.name} brief`, type:"Brief", source:client(item.clientId)?.company || item.code });
    if (item.pitchDate) items.push({ date:item.pitchDate, projectId:item.id, item:`${item.name} presentation`, type:"Presentation", source:client(item.clientId)?.company || item.code });
    if (item.liveDate) items.push({ date:item.liveDate, projectId:item.id, item:`${item.name} event`, type:"Event", source:item.venue || item.code });
  });

  const month = dashboardToday.slice(0, 7);
  const seen = new Set();
  return items
    .filter(item => item.date?.startsWith(month))
    .filter(item => {
      const key = `${item.date}|${item.projectId}|${item.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

function calendarMonthCells(referenceDate = dashboardToday) {
  const [year, month] = referenceDate.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  const daysInMonth = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { label:String(date.getDate()), date:iso, outside:date.getMonth() !== month - 1 };
  });
}

function employeeCalendarCard() {
  const agenda = dashboardCalendarItems();
  const cells = calendarMonthCells();
  const markersByDate = agenda.reduce((dates, item) => {
    if (!dates.has(item.date)) dates.set(item.date, new Set());
    dates.get(item.date).add(item.type.toLowerCase());
    return dates;
  }, new Map());
  const monthTitle = new Intl.DateTimeFormat("en", { month:"long", year:"numeric" }).format(new Date(`${dashboardToday}T00:00:00`));
  return `<div class="calendar-card">
    <div class="calendar-head"><span>Calendar</span><strong data-fit-text>${monthTitle}</strong></div>
    <div class="calendar-kinds" aria-label="Calendar items"><span class="calendar-event"><i></i>Event</span><span class="calendar-presentation"><i></i>Presentation</span><span class="calendar-checkpoint"><i></i>Checkpoint</span><span class="calendar-brief"><i></i>Brief</span></div>
    <div class="mini-calendar">
      ${["S","M","T","W","T","F","S"].map(d => `<b>${d}</b>`).join("")}
      ${cells.map(cell => {
        const markers = [...(markersByDate.get(cell.date) || [])];
        const priorityClass = markers.includes("event")
          ? "calendar-day-event"
          : markers.includes("presentation")
            ? "calendar-day-presentation"
            : markers.some(type => type === "checkpoint" || type === "brief")
              ? "calendar-day-checkpoint"
              : "";
        const types = markers.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(", ");
        return `<span data-calendar-day="${cell.date}" class="${cell.outside ? "outside " : ""}${priorityClass} ${cell.date === dashboardToday ? "today active-day" : ""}"${types ? ` title="${escapeHtml(types)}"` : ""}>${cell.label}</span>`;
      }).join("")}
    </div>
    <div class="agenda-list" data-calendar-agenda>${agenda.length ? agenda.map(item => `<button type="button" class="agenda-item" data-agenda-date="${item.date}" data-project="${item.projectId}"><time>${shortDate(item.date)}</time><p>${escapeHtml(item.item)}<small><b>${escapeHtml(item.type)}</b> · ${escapeHtml(item.source)}</small></p></button>`).join("") : `<div class="bucket-empty">No brief, checkpoint, presentation, or event dates this month.</div>`}</div>
  </div>`;
}

function arDetailRows() {
  return db.invoices
    .map(i => {
      const p = project(i.projectId);
      const daysOverdue = agingDays(i.due);
      const dueIn = Math.max(0, daysUntil(i.due));
      const aging = daysOverdue ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : dueIn ? `Due in ${dueIn} day${dueIn === 1 ? "" : "s"}` : "Due today";
      return { name: client(p.clientId).company, context: `${p.code} · due ${shortDate(i.due)}`, amount: i.amount - i.collected, due:i.due, daysOverdue, aging };
    })
    .filter(row => row.amount > 0)
    .sort((a,b) => b.daysOverdue - a.daysOverdue || a.due.localeCompare(b.due));
}

function apDetailRows() {
  return [
    { name: "BuildRight Fabrication", context: "Fabrication balance", amount: 320000, due:"2026-08-25" },
    { name: "ProAV Manila", context: "Technical supplier", amount: 290000, due:"2026-09-01" },
    { name: "Island Movers", context: "Logistics payable", amount: 210000, due:"2026-09-10" }
  ].map(row => {
    const daysOverdue = agingDays(row.due);
    const dueIn = Math.max(0, daysUntil(row.due));
    return { ...row, daysOverdue, aging:daysOverdue ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : dueIn ? `Due in ${dueIn} day${dueIn === 1 ? "" : "s"}` : "Due today" };
  }).sort((a, b) => b.daysOverdue - a.daysOverdue || a.due.localeCompare(b.due));
}

function ceoMoneyCard(label, value, hint, rows) {
  return `<div class="money-card">
    <span>${label}</span>
    <strong data-fit-text>${fmt(value)}</strong>
    <em>${hint}</em>
    <div class="money-detail-list">${rows.slice(0, 3).map(row => `<div><p>${row.name}<small>${row.context}</small></p><b>${fmt(row.amount)}</b></div>`).join("")}</div>
  </div>`;
}

function employeeTasksCard() {
  const tasks = actionCenterRows().slice(0, 5);
  return `<div class="task-card">
    <div class="rich-head"><span>Tasks</span><strong>${tasks.length} to review</strong></div>
    <div class="task-list">${tasks.length ? tasks.map(task => `<button type="button" class="task-item" data-project="${task.projectId}">
      <i class="${priorityRank(task.status) === 0 ? "hot" : ""}"></i>
      <p>${escapeHtml(task.item)}<small>${escapeHtml(project(task.projectId)?.code || "Project")} · ${escapeHtml(/^\d{4}-\d{2}-\d{2}$/.test(task.due) ? shortDate(task.due) : task.due)}</small></p>
    </button>`).join("") : `<div class="bucket-empty">No tasks currently require your attention.</div>`}</div>
  </div>`;
}

function shortDate(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function nextEventCard() {
  const nextEvent = myProjects().filter(p => daysUntil(p.liveDate) >= 0).sort((a,b) => daysUntil(a.liveDate) - daysUntil(b.liveDate))[0];
  return { label:"Next Event", value: nextEvent ? countdownLabel(nextEvent.liveDate).replace("EVENT ", "") : "None", hint: nextEvent ? nextEvent.code : "No upcoming live date", view:"Projects", tone:"event" };
}

function widgetTone(id) {
  if (/alert|risk|approval|audit|compliance|liquidation|critical/.test(id)) return "priority";
  if (/financial|cash|ar_|profit|budget|payable|forecast/.test(id)) return "finance";
  if (/creative|art|copy|three_d|revision|designer/.test(id)) return "creative";
  if (/event|production|operations|readiness|supplier|procurement|deployment/.test(id)) return "operations";
  return "";
}

function widgetAction(id) {
  const map = {
    approval_queue: "Approvals",
    financial_summary: "Finance",
    project_health: "Projects",
    liquidation_tracker: "Liquidations",
    ar_aging: "Finance",
    supplier_alerts: "Suppliers"
  };
  return map[id] ? `<button class="btn" data-view="${map[id]}">View</button>` : "";
}

function dashboardWidgetDestination(widgetId = "", rowText = "") {
  const id = String(widgetId || "").toLowerCase();
  const text = keyCell(rowText);
  if (/liquidation form|official receipt declaration|receipt declaration|cash return|reimbursement/.test(text)) return { view:"Liquidations" };
  if (/supplier invoice|supplier document|proof of payment/.test(text)) return { view:"Project 360", tab:"Suppliers" };
  if (/\bce\b|cost estimate/.test(text)) return { view:"Project 360", tab:"CE" };
  if (/\bcollect\b|service invoice|\bsi[- ]\d/.test(text)) return { view:"Project 360", tab:"Billing" };
  if (/\bcrp\b|budget request|fund release/.test(text)) return { view:"Project 360", tab:"Budget Requests" };
  if (/approval/.test(id)) {
    if (/liquidation|reimbursement|cash return/.test(text)) return { view:"Liquidations" };
    if (/crp|budget|release|threshold|override/.test(text)) return { view:"Project 360", tab:"Budget Requests" };
    return { view:"Project 360", tab:"CE" };
  }
  if (/crp|budget|fund_release|release_processing|no_liquidation_rule/.test(id)) return { view:"Project 360", tab:/fund_release/.test(id) ? "Fund Releases" : "Budget Requests" };
  if (/liquidation|reimbursement|cash_advance|manpower_fund|cash_on_hand|incidentals/.test(id)) return { view:"Liquidations" };
  if (/ar_aging|billing|collection/.test(id)) return { view:"Project 360", tab:"Billing" };
  if (/supplier|procurement|sourcing|quote|delivery/.test(id)) return { view:"Project 360", tab:"Suppliers" };
  if (/^ce(?:_|$)|ce_review/.test(id)) return { view:"Project 360", tab:"CE" };
  if (/cash_position|financial|profit|payable|finance|forecast|revenue/.test(id)) return { view:"Finance" };
  if (/creative|revision|art_|copy|three_d|asset|designer|waiting_queue|today_queue|upcoming_presentations|production_ready_status/.test(id)) return { view:"Project 360", tab:"Brief" };
  if (/client|pipeline|followup|waiting|commitment|account_/.test(id)) return { view:"Clients" };
  return { view:"Project 360", tab:"Overview" };
}

function dashboardProjectFromText(text = "") {
  const normalized = keyCell(text);
  return db.projects.find(item => normalized.includes(keyCell(item.code)) || normalized.includes(keyCell(item.name))) || null;
}

function dashboardReviewDestination(widgetId, rowText) {
  const requested = dashboardWidgetDestination(widgetId, rowText);
  const projectRecord = dashboardProjectFromText(rowText);
  const permittedProjectIds = new Set(accessibleProjects().map(item => item.id));
  if (projectRecord && !permittedProjectIds.has(projectRecord.id) && requested.view !== "Liquidations") return null;
  const projectId = projectRecord && (permittedProjectIds.has(projectRecord.id) || requested.view === "Liquidations") ? projectRecord.id : "";
  const destination = { ...requested, projectId };

  if (destination.view === "Liquidations") {
    let liquidation = db.liquidations.find(item => (!projectId || item.projectId === projectId)
      && keyCell(rowText).includes(keyCell(item.employee))
      && keyCell(rowText).includes(keyCell(formatShortDate(item.due)))
      && keyCell(rowText).includes(keyCell(item.status)));
    if (!liquidation && projectId) {
      const employeeMatches = db.liquidations.filter(item => item.projectId === projectId && keyCell(rowText).includes(keyCell(item.employee)));
      if (employeeMatches.length === 1) liquidation = employeeMatches[0];
    }
    if (liquidation && !liquidationRoleAccess({ name:liquidation.employee }).canViewDetails) return null;
    destination.recordId = liquidation?.id || "";
    return destination;
  }

  if (destination.view === "Project 360") {
    if (!projectId) return null;
    const allowedTabs = projectTabsForRole();
    if (!allowedTabs.includes(destination.tab)) {
      if (destination.tab === "Billing" && canViewFinance()) return { view:"Finance", projectId };
      if (destination.tab === "Suppliers" && supplierAccessProfile().scope !== "none") return { view:"Suppliers", projectId };
      destination.tab = allowedTabs.includes("Overview") ? "Overview" : allowedTabs[0];
    }
    return destination;
  }

  if (destination.view === "Finance" && !canViewFinance()) return projectId ? { view:"Project 360", projectId, tab:"Overview" } : null;
  if (destination.view === "Clients" && clientAccessProfile().scope === "none") return projectId ? { view:"Project 360", projectId, tab:"Overview" } : null;
  if (destination.view === "Suppliers" && supplierAccessProfile().scope === "none") return projectId ? { view:"Project 360", projectId, tab:"Overview" } : null;
  if (destination.view === "Approvals" && !canViewApprovals()) return projectId ? { view:"Project 360", projectId, tab:"Overview" } : null;
  return destination;
}

function openDashboardReviewDestination(element) {
  const view = element.dataset.dashboardReviewView;
  const projectId = element.dataset.dashboardReviewProject || "";
  const recordId = element.dataset.dashboardReviewRecord || "";
  if (!view) return;
  if (view === "Liquidations") {
    state.liquidationReturnView = "Dashboard";
    state.liquidationPageProjectId = projectId;
    state.liquidationPageRecordId = recordId;
  } else if (projectId) {
    state.selectedProjectId = projectId;
  }
  state.view = view;
  if (view === "Project 360") state.tab = element.dataset.dashboardReviewTab || "Overview";
  render();
}

function enhanceDashboardReviewRows() {
  if (state.view !== "Dashboard") return;
  document.querySelectorAll(".widget[data-widget-id] .widget-body table").forEach(table => {
    const widgetId = table.closest("[data-widget-id]")?.dataset.widgetId || "";
    const rows = [...table.querySelectorAll("tbody tr")];
    const destinations = rows.map(row => dashboardReviewDestination(widgetId, row.textContent || ""));
    if (!destinations.some(Boolean)) return;
    const header = table.querySelector("thead tr");
    if (header && !header.querySelector(".dashboard-review-action-head")) header.insertAdjacentHTML("beforeend", `<th class="dashboard-review-action-head">Action</th>`);
    rows.forEach((row, index) => {
      const destination = destinations[index];
      if (!destination) {
        row.insertAdjacentHTML("beforeend", `<td class="dashboard-review-action-cell"></td>`);
        return;
      }
      const attributes = `data-dashboard-review-view="${escapeHtml(destination.view)}" data-dashboard-review-project="${escapeHtml(destination.projectId || "")}" data-dashboard-review-tab="${escapeHtml(destination.tab || "")}" data-dashboard-review-record="${escapeHtml(destination.recordId || "")}"`;
      row.classList.add("dashboard-review-row");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.insertAdjacentHTML("beforeend", `<td class="dashboard-review-action-cell"><button class="btn compact" type="button" ${attributes}>View</button></td>`);
      row.dataset.dashboardReviewView = destination.view;
      row.dataset.dashboardReviewProject = destination.projectId || "";
      row.dataset.dashboardReviewTab = destination.tab || "";
      row.dataset.dashboardReviewRecord = destination.recordId || "";
      row.querySelectorAll("[data-project]").forEach(control => {
        control.dataset.dashboardReviewView = destination.view;
        control.dataset.dashboardReviewProject = destination.projectId || "";
        control.dataset.dashboardReviewTab = destination.tab || "";
        control.dataset.dashboardReviewRecord = destination.recordId || "";
      });
    });
  });
  document.querySelectorAll(".widget[data-widget-id] .widget-body table").forEach(table => {
    const labels = [...table.querySelectorAll("thead th")].map(cell => (cell.textContent || "").trim());
    table.querySelectorAll("tbody tr").forEach(row => {
      [...row.children].forEach((cell, index) => {
        if (cell.tagName === "TD") cell.dataset.label = labels[index] || `Field ${index + 1}`;
      });
    });
  });
  document.querySelectorAll("[data-dashboard-review-view]").forEach(element => {
    const open = event => {
      if (element.matches("tr") && event.target.closest("button, a, input, select, textarea")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openDashboardReviewDestination(element);
    };
    element.addEventListener("click", open);
    if (element.matches("tr")) element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") open(event);
    });
  });
}

function dashboardPriorityTone(value = "") {
  if (/critical|blocked|overdue|late|at risk|missing/i.test(value)) return "critical";
  if (/high|due|attention|pending|waiting/i.test(value)) return "high";
  if (/medium|review|revision|monitor/i.test(value)) return "medium";
  return "low";
}

function dashboardUnifiedLegend() {
  return `<div class="dashboard-table-legend" aria-label="Unified status color legend">
    <span class="dashboard-legend-trigger" tabindex="0" aria-label="Hover or focus to show the color legend"><b aria-hidden="true">?</b>Legend</span>
    <div class="dashboard-legend-popup" role="tooltip">
      <strong>Color Guide</strong>
      <span><i class="legend-good"></i><b>On Track</b><small>Approved, cleared, completed, ready, or healthy.</small></span>
      <span><i class="legend-active"></i><b>Active</b><small>In progress or upcoming; no intervention required.</small></span>
      <span><i class="legend-purple"></i><b>Review</b><small>Under audit or review, for revision, validation, collection, or approval.</small></span>
      <span><i class="legend-warn"></i><b>Attention</b><small>Pending, waiting, incomplete, due soon, or requiring follow-up.</small></span>
      <span><i class="legend-risk"></i><b>Critical</b><small>Overdue, blocked, missing, rejected, or at risk.</small></span>
    </div>
  </div>`;
}

function enhanceDashboardTableLegends() {
  if (state.view !== "Dashboard") return;
  document.querySelectorAll(".widget[data-widget-id] .widget-body table").forEach(table => {
    if (table.previousElementSibling?.classList.contains("dashboard-table-legend") || table.closest(".creative-task-table-wrap")) return;
    const headers = [...table.querySelectorAll("thead th")].map(cell => normalizeCell(cell.textContent));
    const priorityIndex = headers.findIndex(label => /priority/i.test(label));
    const hasStatusColors = Boolean(table.querySelector("tbody .status"));
    if (priorityIndex < 0 && !hasStatusColors) return;
    table.insertAdjacentHTML("beforebegin", dashboardUnifiedLegend());
    if (priorityIndex >= 0) {
      table.querySelectorAll("tbody tr").forEach(row => {
        const cell = row.children[priorityIndex];
        const tone = dashboardPriorityTone(cell?.textContent || row.textContent || "");
        row.classList.add("dashboard-priority-row", `priority-${tone}`);
      });
    }
  });
}

function reviewableLineItemContainer(control) {
  const tableRow = control.closest("tbody tr");
  if (tableRow) return tableRow;
  let node = control.parentElement;
  while (node && node !== document.body) {
    if (node.matches("details, summary, form, dialog, .review-modal")) return null;
    const isRecordRow = [...node.classList].some(className => /(?:^|-)(?:row|item|entry|record|line|person)$/.test(className));
    const isControlRow = [...node.classList].some(className => /(?:action|control|toolbar|header|head|title)/.test(className));
    if (isRecordRow && !isControlRow) return node;
    node = node.parentElement;
  }
  return null;
}

function preferredLineItemView(container) {
  const preferredSelectors = [
    "[data-dashboard-review-view]",
    "[data-billing-view]",
    "[data-liquidation-open-record]",
    "[data-liq-supplier-review]",
    "[data-liq-review]",
    "[data-liquidation-project]",
    "[data-project]",
    "[data-review]",
    "[data-billing-collection-view]",
    "[data-liq-supplier-document]",
    "[data-liq-attachment]"
  ];
  for (const selector of preferredSelectors) {
    const control = container.querySelector(selector);
    if (control && (control.textContent || "").trim().toLowerCase() === "view") return control;
  }
  return [...container.querySelectorAll("button, a, [role='button']")]
    .find(control => (control.textContent || "").trim().toLowerCase() === "view") || null;
}

function enhanceReviewableLineItems() {
  const containers = new Set();
  document.querySelectorAll("button, a, [role='button']").forEach(control => {
    if ((control.textContent || "").trim().toLowerCase() !== "view") return;
    const container = reviewableLineItemContainer(control);
    if (container && !container.classList.contains("dashboard-review-row")) containers.add(container);
  });
  containers.forEach(container => {
    const viewControl = preferredLineItemView(container);
    if (!viewControl) return;
    container.classList.add("reviewable-line-item");
    if (!container.hasAttribute("tabindex")) container.tabIndex = 0;
    const open = event => {
      if (event.target.closest("button, a, input, select, textarea, label, summary, [contenteditable='true'], [role='button']")) return;
      event.preventDefault();
      viewControl.click();
    };
    container.addEventListener("click", open);
    container.addEventListener("keydown", event => {
      if (event.target !== container || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      viewControl.click();
    });
  });
}

function roleIsManagement() {
  return /^(CEO|COO|ACCOUNTS HEAD|PRODUCTION HEAD|CREATIVE DIRECTOR|ASSOCIATE CREATIVE DIRECTOR|FINANCE LEAD|FINANCE OFFICER)$/.test(canonicalRole());
}

function myProjects() {
  return accessibleProjects();
}

function relevantActivity() {
  const ids = myProjects().map(p => p.id);
  return db.activity.filter(a => roleIsManagement() || ids.includes(a.projectId)).slice().reverse();
}

function actionCenterRows() {
  const rows = [];
  db.approvals.filter(a => a.status === "Pending" && roleIsManagement()).forEach(a => rows.push({ projectId:a.projectId, item:a.type, owner:currentUser(), due:"Today", status:"Approval", next:"Approve, reject, or return" }));
  db.budgetRequests.filter(b => isCrpOverride(b) && (roleIsManagement() || b.requestor === currentUser())).forEach(b => rows.push({ projectId:b.projectId, item:`${b.category} request ${fmt(b.amount)}`, owner:b.requestor, due:b.dateRequired, status:b.status, next:"Review 60% CRP threshold" }));
  dashboardSeed.creativeJobs.filter(j => j.owner === currentUser() && ["Overdue","Due today","For revision","Waiting"].includes(j.status)).forEach(j => rows.push({ projectId:j.projectId, item:j.deliverable, owner:j.owner, due:j.due, status:j.status, next:j.nextAction }));
  dashboardSeed.operationsTasks.filter(t => t.owner === currentUser() || state.role.includes("EVENT") || state.role.includes("COO")).forEach(t => rows.push({ projectId:t.projectId, item:t.type, owner:t.owner, due:t.due, status:t.status, next:t.nextAction }));
  dashboardSeed.clientActions.filter(a => a.owner === currentUser() || state.role.includes("ACCOUNTS")).forEach(a => rows.push({ projectId:a.projectId, item:a.action, owner:a.owner, due:a.due, status:a.status, next:a.nextAction }));
  db.liquidations.filter(l => (l.employee === currentUser() || state.role.includes("FINANCE")) && !/Cleared/i.test(l.status)).forEach(l => rows.push({ projectId:l.projectId, item:"Clear liquidation", owner:l.employee, due:l.due, status:l.status, next:l.findings ? "Resolve audit finding" : "Submit liquidation" }));
  billingCollectionReminders().forEach(reminder => rows.push({ projectId:reminder.projectId, item:`Collect ${reminder.invoiceNo} · ${fmtDetailed(reminder.outstanding)}`, owner:"Finance + Accounts", due:reminder.due, status:reminder.days < 0 ? reminder.urgency : reminder.urgency.toUpperCase(), next:reminder.days < 0 ? "Escalate client collection and record follow-up" : "Follow up with client before due date" }));
  return rows.sort((a,b) => priorityRank(a.status) - priorityRank(b.status) || String(a.due).localeCompare(String(b.due))).slice(0, 8);
}

function priorityRank(status) {
  if (/Critical|Blocked|Overdue|risk|Missing/i.test(status)) return 0;
  if (/today|Due|Pending|Approval/i.test(status)) return 1;
  if (/soon|review|Waiting|Attention/i.test(status)) return 2;
  return 3;
}

function financialAlertRows() {
  const alerts = [];
  db.projects.forEach(p => {
    const m = margin(p.actualRevenue || p.expectedRevenue, p.actualCost || p.estimatedCost);
    if (m < settings.targetGrossMargin && (p.actualRevenue || p.expectedRevenue)) alerts.push({ alert:"Margin Below Company Target", project:p.code, projectId:p.id, impact:`${Math.round(m*100)}% margin`, priority:"Critical", action:"Review scope, cost, or commercial override", owner:p.owner });
    if (p.actualCost > p.estimatedCost && p.estimatedCost) alerts.push({ alert:"Project Over Budget", project:p.code, projectId:p.id, impact:fmt(p.actualCost - p.estimatedCost), priority:"At Risk", action:"Review variance and CE impact", owner:p.implementationOwner });
  });
  db.liquidations
    .filter(l => /Under Audit|For Cash Return|For Reimbursement|Overdue/i.test(l.status) && agingDays(l.due) >= 7)
    .forEach(l => {
      const age = agingDays(l.due);
      const bucket = age >= 21 ? "Liquidation Overdue (21D)" : age >= 14 ? "Liquidate Overdue (14D)" : "Liquidate Overdue (7D)";
      alerts.push({ alert:bucket, project:project(l.projectId).code, projectId:l.projectId, impact:`${age} days overdue · ${fmt(l.released)}`, priority:age >= 21 ? "Critical" : "At Risk", action:"Block new release or approve exception", owner:l.employee });
    });
  return alerts;
}

function ceCodeFor(projectCode) {
  const p = db.projects.find(project => project.code === projectCode) || db.projects[0];
  const seq = String(projectCode.match(/\d+$/)?.[0] || "1").slice(-3).padStart(3, "0");
  const c = client(p.clientId);
  const label = /example/i.test(c.brand) ? c.company : c.brand || c.company;
  const brand = label.replace(/[^a-z0-9]/gi, "");
  return `26-${seq}-${brand}`;
}

function alertPriorityTone(priority) {
  if (/Done/i.test(priority)) return "good";
  if (/Critical/i.test(priority)) return "risk";
  return "warn";
}

function executiveAlertAccordion() {
  const rows = financialAlertRows();
  if (!rows.length) return `<div class="empty">No executive alerts right now</div>`;
  return `<div class="alert-accordion">
    <div class="alert-head"><span>CE#</span><span>Alert</span><span>Priority</span></div>
    ${rows.map(row => `<details class="alert-item">
      <summary>
        <b>${ceCodeFor(row.project)}</b>
        <span>${row.alert}</span>
        ${chip(row.priority, alertPriorityTone(row.priority))}
      </summary>
      <div class="alert-detail">
        ${mini("Project", row.project)}
        ${mini("Owner", row.owner)}
        ${mini("Context", row.impact)}
        ${mini("Suggested action", row.action)}
        ${/Liquidat/i.test(row.alert) ? `<button class="btn" data-liquidation-project="${row.projectId}">View</button>` : `<button class="btn" data-project="${row.projectId}" data-project-tab="CE">View</button>`}
      </div>
    </details>`).join("")}
  </div>`;
}

function escalationRows() {
  return [
    { alert:"Event <7 days with unresolved item", project:"2026-JFC-0003", impact:"Budget release and supplier readiness", priority:"CRITICAL", action:"Run 72-hour readiness review", owner:"Lara Cruz" },
    { alert:"Client approval overdue", project:"2026-JFC-0003", impact:"Creative approval may delay printing", priority:"AT RISK", action:"Accounts to secure approval today", owner:"Nina Lim" },
    { alert:"Major supplier not confirmed", project:"2026-AYALA-0002", impact:"Technical scope cannot be locked", priority:"AT RISK", action:"Procurement to shortlist supplier", owner:"Bea Lacson" }
  ];
}

function clientRevenueRows() {
  return db.clients.map(c => {
    const value = db.projects.filter(p => p.clientId === c.id).reduce((s,p)=>s+p.actualRevenue,0);
    return { label:c.company, value, color:value > 2000000 ? "good" : value > 0 ? "active" : "warn" };
  });
}

function creativeOwnerFor(projectId) {
  return dashboardSeed.creativeJobs.find(j => j.projectId === projectId)?.owner || "Unassigned";
}

function blockerFor(projectId) {
  const op = dashboardSeed.operationsTasks.find(t => t.projectId === projectId && !/Confirmed|Approved|None/i.test(t.status));
  const cr = dashboardSeed.creativeJobs.find(j => j.projectId === projectId && ["Waiting","Overdue","For revision"].includes(j.status));
  const liq = db.liquidations.find(l => l.projectId === projectId && !/Cleared/i.test(l.status));
  return op?.type || cr?.waitingOn || liq?.status || "None";
}

function nextMilestoneFor(p) {
  if (daysUntil(p.liveDate) >= 0) return `Live date in ${daysUntil(p.liveDate)} days`;
  if (p.stage === "CLOSURE") return "Complete closure checklist";
  if (p.stage === "COLLECTION") return "Collect outstanding AR";
  return "Move to next lifecycle stage";
}

function operationsRiskRows() {
  const rows = dashboardSeed.operationsTasks.filter(t => !/Confirmed|Approved/.test(t.status)).map(t => ({
    project:project(t.projectId).code,
    risk:t.type,
    owner:t.owner,
    deadline:t.due,
    priority:chip(/Blocked|At risk/i.test(t.status) || daysUntil(project(t.projectId).liveDate) <= 3 ? "CRITICAL" : "ATTENTION", /Blocked|At risk/i.test(t.status) ? "risk" : "warn"),
    nextAction:t.nextAction
  }));
  db.projects.filter(p => !p.approvedCe && p.stage !== "LOST").forEach(p => rows.push({ project:p.code, risk:"Missing approved CE", owner:p.owner, deadline:p.liveDate, priority:chip("AT RISK","warn"), nextAction:"Complete approval before major work" }));
  return rows;
}

function capacityRows() {
  return [
    { label:"Accounts", value:76, color:"warn" },
    { label:"Creative", value:88, color:"risk" },
    { label:"Production", value:82, color:"warn" },
    { label:"Procurement", value:64, color:"good" }
  ];
}

function readinessScore(projectId) {
  const tasks = dashboardSeed.operationsTasks.filter(t => t.projectId === projectId);
  if (!tasks.length) return 72;
  const good = tasks.filter(t => /Confirmed|Approved/.test(t.status)).length;
  const partial = tasks.filter(t => /Incomplete|Due soon|At risk/.test(t.status)).length * 0.45;
  return Math.round(((good + partial) / tasks.length) * 100);
}

function countdownLabel(date) {
  const days = daysUntil(date);
  if (days < 0) return "Event passed";
  if (days === 0) return "EVENT TODAY";
  if (days === 1) return "EVENT IN 24 HOURS";
  if (days <= 3) return `EVENT IN ${days} DAYS`;
  return `Event in ${days} days`;
}

function countdownPriority(date) {
  const days = daysUntil(date);
  if (days < 0) return "COMPLETED";
  if (days >= 0 && days <= 3) return "CRITICAL";
  if (days <= 7) return "HIGH PRIORITY";
  if (days <= 14) return "INCREASED MONITORING";
  return "STANDARD";
}

function canSeeProjectFinancials() {
  return /CEO|COO|FINANCE/.test(state.role);
}

function sensitiveProjectFinancials(p) {
  if (!canSeeProjectFinancials()) return "";
  const savingsPct = p.totalBudget ? Math.round((p.savings / p.totalBudget) * 100) : 0;
  return `${mini("Total Project ASF", fmt(p.asf))}${mini("Total Project Savings", fmt(p.savings))}${mini("Total % Project Savings", `${savingsPct}%`)}`;
}

function projectBucket(p) {
  if (["LEAD", "QUALIFICATION", "BRIEFED", "COSTING", "PITCHING", "NEGOTIATION"].includes(p.stage)) return "For Pitch/Bidding";
  if (["AWARDED", "ONBOARDING", "PRE-PRODUCTION", "LIVE / IMPLEMENTATION", "POST-PRODUCTION"].includes(p.stage)) return "On-Going";
  if (["FOR BILLING", "BILLED", "COLLECTION", "CLOSURE", "CLOSED"].includes(p.stage)) return "For Collection / Completion";
  return "For Pitch/Bidding";
}

function eventDate(p) {
  return p.liveDate || p.pitchDate || p.created;
}

function formatShortDate(date) {
  if (!date) return "TBD";
  const [year, month, day] = date.split("-");
  return `${month}-${day}-${year}`;
}

function projectCeNumber(p) {
  const sequence = p.code.split("-").at(-1) || "0000";
  return `${String(new Date(eventDate(p)).getFullYear()).slice(-2)}-${sequence.slice(-3)}`;
}

function currentCe(projectId) {
  const versions = db.ceVersions.filter(ce => ce.projectId === projectId);
  return versions.find(ce => ce.approved) || versions.at(-1) || null;
}

function breakDate(p) {
  return eventDate(p);
}

function projectCeStatus(p) {
  const versions = db.ceVersions.filter(ce => ce.projectId === p.id);
  const signed = versions.some(ce => /approved - signed/i.test(ce.status)) || p.approvedCe > 0;
  const approved = versions.some(ce => /approved/i.test(ce.status));
  const underReview = versions.some(ce => /revision|review|checking/i.test(ce.status));
  if (signed) return { label: "With Signed CE", tone: "good" };
  if (p.awardedDate && !signed) return { label: "No Signed CE", tone: "risk" };
  if (approved) return { label: "For Submission", tone: "active" };
  if (underReview || versions.length) return { label: "For Checking", tone: "warn" };
  return { label: "For Creation", tone: "active" };
}

function agingDays(date) {
  return Math.max(0, -daysUntil(date));
}

function projectSupplierTable(projectId) {
  const ceIds = db.ceVersions.filter(c => c.projectId === projectId).map(c => c.id);
  const rows = db.ceLines.filter(l => ceIds.includes(l.ceId) && l.supplier).map((l, index) => {
    const supplier = db.suppliers.find(s => s.name === l.supplier);
    return {
      supplierName: l.supplier,
      amount: fmt(l.unitCost),
      receipt: index % 2 === 0 ? chip("With receipt","good") : chip("Without receipt","warn"),
      qualityScore: supplier ? `${supplier.quality}/5` : "TBD",
      reliability: supplier ? `${supplier.reliability}/5` : "TBD"
    };
  });
  return simpleTable(rows, ["supplierName","amount","receipt","qualityScore","reliability"]);
}

function projectSuppliersDashboard(p) {
  const draft = Boolean(state.liquidationScenarioPreview);
  const model = draft ? liquidationScenarioData(p) : liquidationLiveData(p);
  const access = liquidationRoleAccess();
  const suppliers = model.suppliers || [];
  const cashPayees = (model.employees || [])
    .filter(employee => access.canViewAll || keyCell(employee.name) === keyCell(currentUser()))
    .flatMap(employee => liquidationExpenseDetails(employee)
      .filter(expense => ["With receipt", "Without receipt"].includes(expense.kind)
        && ["supplier-business", "supplier-individual", "unclassified"].includes(expense.payeeKind)
        && normalizeCell(expense.vendor) && Number(expense.amount) > 0)
      .map(expense => ({ ...expense, employee })));
  const paid = roundCent(suppliers.reduce((sum, supplier) => sum + (Number(supplier.paid) || 0), 0));
  const balance = roundCent(suppliers.reduce((sum, supplier) => sum + Math.max(0, (Number(supplier.finalInvoice) || 0) - (Number(supplier.paid) || 0)), 0));
  const overdueSuppliers = suppliers.filter(supplier => liquidationSupplierAge(supplier).days > 0);
  const overdueBalance = roundCent(overdueSuppliers.reduce((sum, supplier) => sum + liquidationSupplierAge(supplier).balance, 0));
  const missingDueCount = suppliers.filter(supplier => liquidationSupplierAge(supplier).missingDue).length;
  const directSuppliers = [...suppliers].sort((a, b) => liquidationSupplierAge(b).days - liquidationSupplierAge(a).days || liquidationSupplierAge(b).balance - liquidationSupplierAge(a).balance);
  const financeCashPaid = roundCent(suppliers.reduce((sum, supplier) => sum + liquidationSupplierPaymentHistory(supplier)
    .filter(payment => keyCell(payment.method) === "cash")
    .reduce((total, payment) => total + (Number(payment.amount) || 0), 0), 0));
  const cashSupplierSpend = roundCent(cashPayees.filter(expense => String(expense.payeeKind).startsWith("supplier-")).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0));
  const unclassifiedCash = roundCent(cashPayees.filter(expense => expense.payeeKind === "unclassified").reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0));
  const evidenceGaps = suppliers.filter(supplier => !supplier.invoice?.dataUrl || (supplier.paid > 0 && liquidationSupplierPaymentHistory(supplier).some(payment => !payment.proof?.dataUrl))).length
    + cashPayees.filter(expense => !expense.support?.dataUrl).length;
  const sourceButton = (type, id, allowed) => allowed
    ? `<button class="btn compact" type="button" data-supplier-source="${type}" data-supplier-source-id="${escapeHtml(id)}">View</button>`
    : `<span class="supplier-source-private">Summary only</span>`;
  return `<section class="project-suppliers">
    <div class="project-suppliers-head"><div><h3>Project Suppliers</h3><p>Direct supplier payables and supplier-classified cash expenses from employee liquidations.</p></div><div class="project-suppliers-actions">${chip(draft ? "Draft scenario" : "Live records", draft ? "warn" : "active")}<button class="btn" type="button" data-liq-scenario-toggle="true">${draft ? "Live" : "Draft"}</button>${access.isFinanceOfficer ? `<button class="btn primary" type="button" data-supplier-payable-open="true">Add</button>` : ""}</div></div>
    ${draft ? `<div class="project-suppliers-draft">Illustrative data only · linked to the same project liquidation scenario.</div>` : ""}
    <div class="project-suppliers-metrics" aria-label="Project supplier summary">
      <div class="tone-good"><span>Finance Paid</span><b>${fmtDetailed(paid)}</b><small>Cash, cheque, and bank · to date</small></div>
      <div class="${balance ? "tone-warn" : "tone-good"}"><span>Open AP</span><b>${fmtDetailed(balance)}</b><small>Supplier invoices less paid</small></div>
      <div class="${overdueBalance || missingDueCount ? "tone-risk" : "tone-good"}"><span>Overdue AP</span><b>${fmtDetailed(overdueBalance)}</b><small>${overdueSuppliers.length} past due${missingDueCount ? ` · ${missingDueCount} need due dates` : ""}</small></div>
      <div class="tone-active"><span>Finance Cash</span><b>${fmtDetailed(financeCashPaid)}</b><small>Paid directly by Finance</small></div>
      <div class="tone-active"><span>Employee Cash Suppliers</span><b>${fmtDetailed(cashSupplierSpend)}</b><small>${unclassifiedCash ? `${fmtDetailed(unclassifiedCash)} unclassified` : "From employee packets"}</small></div>
      <div class="${evidenceGaps ? "tone-risk" : "tone-good"}"><span>Evidence Gaps</span><b>${evidenceGaps}</b><small>Invoice, payment proof, or receipt</small></div>
    </div>
    <section class="project-suppliers-section"><div class="project-suppliers-section-title"><div><span>Finance Officer-owned</span><h4>Direct Supplier Payables</h4></div><small>${suppliers.length} ${suppliers.length === 1 ? "supplier" : "suppliers"}</small></div>
      ${suppliers.length ? `<div class="project-supplier-list"><div class="project-supplier-grid is-direct project-supplier-grid-head"><span>Supplier</span><span>Category</span><span>Approved</span><span>Paid / Invoice</span><span>Open AP</span><span>Due / Aging</span><span>Payment</span><span>Evidence</span><span>Source</span></div>
        ${directSuppliers.map(supplier => {
          const age = liquidationSupplierAge(supplier);
          const payments = liquidationSupplierPaymentHistory(supplier);
          const lastPayment = payments.at(-1);
          const latePaymentDays = liquidationSupplierPaymentLateDays(supplier.dueDate, lastPayment?.date);
          const hasEvidence = Boolean(supplier.invoice?.dataUrl && (!supplier.paid || payments.every(payment => payment.proof?.dataUrl)));
          return `<div class="project-supplier-grid is-direct project-supplier-item ${age.days ? "is-overdue" : latePaymentDays && !age.balance ? "is-paid-late" : hasEvidence ? "is-complete" : "is-attention"}">
            <div data-label="Supplier"><b>${escapeHtml(supplier.name)}</b><small>${escapeHtml(supplier.budgetReference || (supplier.id.startsWith("supplier-manual-") ? "Finance-added payable" : "From CRP release"))}</small></div>
            <div data-label="Category">${escapeHtml(supplier.category || "Uncategorized")}</div>
            <div data-label="Approved"><b>${fmtDetailed(supplier.approved)}</b></div>
            <div data-label="Paid / Invoice"><b>${fmtDetailed(supplier.paid)}</b><small>Invoice ${fmtDetailed(supplier.finalInvoice)}</small></div>
            <div data-label="Open AP"><b>${fmtDetailed(age.balance)}</b></div>
            <div data-label="Due / Aging"><b>${age.balance ? age.missingDue ? "Set due date" : formatShortDate(supplier.dueDate) : latePaymentDays ? "Paid late" : "Settled"}</b><small class="${age.days || latePaymentDays ? "supplier-overdue-text" : ""}">${age.days ? `${age.days} days overdue` : age.missingDue ? "Aging unknown" : age.balance ? "Not overdue" : latePaymentDays ? `${latePaymentDays} days past due at payment` : "No balance"}</small></div>
            <div data-label="Payment"><b>${escapeHtml(lastPayment?.stage || "Not paid")}</b><small>${escapeHtml(lastPayment?.method || "Awaiting payment")}</small></div>
            <div data-label="Evidence"><span class="supplier-evidence ${hasEvidence ? "is-good" : "is-risk"}"><i aria-hidden="true"></i>${hasEvidence ? supplier.paid ? "Complete" : "Invoice on file" : "Needs support"}</span><small>${supplier.invoice?.dataUrl ? "Invoice" : "No invoice"} · ${supplier.paid ? `${payments.filter(payment => payment.proof?.dataUrl).length}/${payments.length} payment proofs` : "No payment yet"}</small></div>
            <div data-label="Source">${sourceButton("direct", supplier.id, access.canViewAll)}</div>
          </div>`;
        }).join("")}</div>` : `<div class="project-suppliers-empty">No direct supplier payments recorded for this project.</div>`}
    </section>
    <section class="project-suppliers-section"><div class="project-suppliers-section-title"><div><span>Employee cash-owned</span><h4>Cash Suppliers</h4></div><small>${cashPayees.length} ${cashPayees.length === 1 ? "expense" : "expenses"}</small></div>
      ${cashPayees.length ? `<div class="project-supplier-list"><div class="project-supplier-grid project-supplier-grid-head"><span>Payee</span><span>Particulars</span><span>Submitted</span><span>Employee</span><span>Receipt / AR</span><span>Classification</span><span>Source</span></div>
        ${cashPayees.map(expense => `<div class="project-supplier-grid project-supplier-item is-cash ${String(expense.payeeKind).startsWith("supplier-") ? "is-classified-supplier" : expense.payeeKind === "unclassified" ? "is-unclassified" : ""}">
          <div data-label="Payee"><b>${escapeHtml(expense.vendor)}</b><small>${escapeHtml(expense.kind)}</small></div>
          <div data-label="Particulars">${escapeHtml(expense.particulars || "Expense")}</div>
          <div data-label="Submitted"><b>${fmtDetailed(expense.amount)}</b></div>
          <div data-label="Employee">${escapeHtml(expense.employee.name)}</div>
          <div data-label="Receipt / AR"><span class="supplier-evidence ${expense.support?.dataUrl ? "is-good" : "is-risk"}"><i aria-hidden="true"></i>${expense.support?.dataUrl ? "On file" : "Missing"}</span></div>
          <div data-label="Classification"><span class="supplier-classification ${String(expense.payeeKind).startsWith("supplier-") ? "is-supplier" : expense.payeeKind === "unclassified" ? "is-pending" : "is-other"}">${escapeHtml(expense.payeeKind === "other" && expense.payeeClassification ? `Other · ${expense.payeeClassification}` : counterpartyTypeLabel(expense.payeeKind))}</span></div>
          <div data-label="Source">${sourceButton("cash", expense.employee.id, liquidationRoleAccess(expense.employee).canViewDetails)}</div>
        </div>`).join("")}</div>` : `<div class="project-suppliers-empty">${access.canViewAll ? "No cash payees appear in employee liquidations yet." : "No cash payees appear in your liquidation."}</div>`}
    </section>
  </section>`;
}

function yearOnYearRevenue() {
  const currentYear = "2026";
  const currentPerformance = 73300000;
  const revenueByYear = {
    ...dashboardSeed.monthlyRevenue,
    [currentYear]: [currentPerformance]
  };
  const years = Object.keys(revenueByYear);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const latestYear = years[years.length - 1];
  const selectedYear = selectedRevenueYear && revenueByYear[selectedRevenueYear] ? selectedRevenueYear : latestYear;
  const totals = years.reduce((acc, year) => {
    acc[year] = revenueByYear[year].reduce((s,n)=>s+n,0);
    return acc;
  }, {});
  const latestTotal = totals[latestYear];
  const previousTotal = totals[years[years.length - 2]];
  const growth = previousTotal ? Math.round(((latestTotal - previousTotal) / previousTotal) * 100) : 0;
  const rows = years.map((year, index) => {
    const previous = years[index - 1] ? totals[years[index - 1]] : 0;
    const yearGrowth = previous ? `${Math.round(((totals[year] - previous) / previous) * 100)}%` : "Baseline";
    const active = year === selectedYear ? " active" : "";
    return `<button class="yoy-row${active}" data-revenue-year="${year}">
      <span>${year}</span>
      <b>${fmt(totals[year])}</b>
      <strong>${yearGrowth}</strong>
    </button>`;
  }).join("");
  const selectedValues = revenueByYear[selectedYear];
  const detailRows = selectedValues.map((value, index) => {
    const previousMonth = selectedValues[index - 1] || 0;
    const previousYearValue = revenueByYear[String(Number(selectedYear) - 1)]?.[index] || 0;
    return {
      month: months[index] || "YTD",
      revenue: fmt(value),
      vsPreviousMonth: previousMonth ? `${Math.round(((value - previousMonth) / previousMonth) * 100)}%` : "Baseline",
      vsPreviousYear: previousYearValue ? `${Math.round(((value - previousYearValue) / previousYearValue) * 100)}%` : "No prior match"
    };
  });
  return `<div class="revenue-compare compact">
    <div class="revenue-side yoy-summary">
      ${mini("Latest year", latestYear)}
      ${mini("YTD / full-year total", fmt(latestTotal))}
      ${mini("Growth vs previous year", `${growth}%`)}
      <div class="yoy-table">
        <div class="yoy-head"><span>Year</span><span>Total</span><span>Growth vs Previous Year</span></div>
        ${rows}
      </div>
    </div>
    <div class="revenue-chart yoy-detail">
      <h4>${selectedYear} Drilldown</h4>
      ${selectedYear === latestYear ? `<p>Latest year reflects current performance: ${fmt(currentPerformance)}.</p>` : ""}
      ${monthDetailTable(detailRows)}
      ${lineChart("Monthly Trend", [{ label:selectedYear, values:selectedValues.length === 1 ? [selectedValues[0], selectedValues[0]] : selectedValues, color:"#6bb7ff" }], selectedValues.length === 1 ? ["Current","Current"] : months.slice(0, selectedValues.length))}
    </div>
  </div>`;
}

function monthDetailTable(rows) {
  return `<div class="month-table">
    <div class="month-head"><span>Month</span><span>Revenue</span><span>Vs Previous Month</span><span>Vs Previous Year</span></div>
    ${rows.map(row => `<div class="month-row">
      <span>${row.month}</span>
      <b>${row.revenue}</b>
      <small>${row.vsPreviousMonth}</small>
      <small>${row.vsPreviousYear}</small>
    </div>`).join("")}
  </div>`;
}

function lineChart(title, series, labels) {
  const width = 680;
  const height = 180;
  const pad = 26;
  const all = series.flatMap(s => s.values);
  const max = Math.max(...all, 1);
  const points = values => values.map((v,i) => {
    const x = pad + i * ((width - pad * 2) / (values.length - 1));
    const y = height - pad - (v / max) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return `<div class="line-chart"><h4>${title}</h4><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
    ${[0,1,2,3].map(i => `<line x1="${pad}" x2="${width-pad}" y1="${pad + i*((height-pad*2)/3)}" y2="${pad + i*((height-pad*2)/3)}" />`).join("")}
    ${series.map(s => `<polyline points="${points(s.values)}" style="stroke:${s.color}" /><g>${s.values.map((v,i) => `<circle cx="${pad + i * ((width - pad * 2) / (s.values.length - 1))}" cy="${height - pad - (v / max) * (height - pad * 2)}" r="3" style="fill:${s.color}" />`).join("")}</g>`).join("")}
  </svg><div class="chart-legend">${series.map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("")}</div><div class="months">${labels.join(" · ")}</div></div>`;
}

function userByRole() {
  return {
    "SUPER ADMIN / CEO": "Mia Santos",
    "CLIENT PARTNER / ACCOUNT EXECUTIVE": "Paolo Reyes",
    "GRAPHIC DESIGNER / MULTIMEDIA ARTIST": "Andrea Valdez",
    "COPYWRITER": "Isa Garcia",
    "3D DESIGNER": "Ramon Uy",
    "EVENT MANAGER": "Lara Cruz",
    "FIELD CASHIER": "Marco Dela Paz",
    "FINANCE & COMPLIANCE ASSISTANT": "June Ramos",
    "PROCUREMENT": "Bea Lacson",
    "WAREHOUSE ASSISTANT": "Robbie Tan",
    "SOCIAL MEDIA MANAGER / CONTENT TEAM": "Tessa Chua",
    "HR & ADMIN OFFICER": "Ana Villanueva"
  };
}

function groupCount(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "Unassigned";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function groupSum(rows, key, sumKey) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "Unassigned";
    acc[value] = (acc[value] || 0) + (row[sumKey] || 0);
    return acc;
  }, {});
}

function teamLoadRows() {
  const names = {};
  db.projects.filter(p => !["LOST", "CLOSED"].includes(p.stage)).forEach(p => {
    names[p.owner] = (names[p.owner] || 0) + 1;
    names[p.implementationOwner] = (names[p.implementationOwner] || 0) + 1;
  });
  dashboardSeed.creativeJobs.forEach(j => { names[j.owner] = (names[j.owner] || 0) + 1; });
  return Object.entries(names).map(([label, value]) => ({ label, value, color: value >= 4 ? "risk" : value >= 2 ? "warn" : "good" }));
}

function creativeLoadRows() {
  return Object.entries(groupCount(dashboardCreativeJobs(), "owner")).map(([label, value]) => ({ label, value, color: value >= 5 ? "risk" : value >= 3 ? "warn" : "good" }));
}

function arRows() {
  const grouped = db.invoices.reduce((acc, i) => {
    const bucket = arAging(i);
    acc[bucket] = (acc[bucket] || 0) + i.amount - i.collected;
    return acc;
  }, {});
  return ["Current", "1–30", "31–60", "61–90", "90+", "Paid"].filter(label => grouped[label]).map(label => ({ label, value: grouped[label], color: label === "Current" ? "good" : label === "Paid" ? "done" : label === "90+" ? "risk" : "warn" }));
}

function upcomingRows() {
  const events = accessibleProjects().filter(p => daysUntil(p.liveDate) >= 0 && daysUntil(p.liveDate) <= 14).map(p => ({ sortDate:p.liveDate, date:formatShortDate(eventDate(p)), project:p.code, type:"Event Date", owner:p.implementationOwner, status:chip(health(p)[0], health(p)[1]) }));
  const ops = dashboardProjectItems(dashboardSeed.operationsTasks).filter(t => daysUntil(t.due) <= 14).map(t => ({ sortDate:t.due, date:formatShortDate(t.due), project:project(t.projectId).code, type:t.type, owner:t.owner, status:chip(t.status) }));
  const liqs = dashboardLiquidationItems().filter(l => !/Cleared/i.test(l.status)).map(l => ({ sortDate:l.due, date:formatShortDate(l.due), project:project(l.projectId).code, type:"Liquidation due", owner:l.employee, status:chip(l.status) }));
  return events.concat(ops, liqs).sort((a,b) => a.sortDate.localeCompare(b.sortDate)).map(({ sortDate, ...row }) => row);
}

function barChart(title, rows, unit) {
  if (!rows.length) return `<div class="empty">No graphable data</div>`;
  const max = Math.max(...rows.map(r => r.value), 1);
  return `<div class="chart"><h4>${title}</h4>${rows.map(r => {
    const width = Math.max(4, Math.round(r.value / max * 100));
    const label = unit === "PHP" ? fmt(r.value) : `${r.value}${unit === "%" ? "%" : ` ${unit}`}`;
    return `<button class="bar-row" data-view="${unit === "PHP" ? "Finance" : "Projects"}"><span>${r.label}</span><div class="bar-track"><i class="${r.color || "active"}" style="width:${width}%"></i></div><b>${label}</b></button>`;
  }).join("")}</div>`;
}

function approvalBucketRows() {
  const approvals = db.approvals
    .filter(a => a.status === "Pending")
    .map(a => ({ id: `approval-${a.id}`, projectId: a.projectId, item: a.type, owner: a.approver, due: "Today", status: "Pending", next: "Review CE", type: "CE" }));
  const exceptions = db.budgetRequests
    .filter(isCrpOverride)
    .map(b => ({ id: `budget-${b.id}`, projectId: b.projectId, item: `${b.category} ${fmt(b.amount)}`, owner: b.requestor, due: b.dateRequired, status: b.status, next: "Resolve exception", type: /Liquidation/i.test(b.reason || "") ? "Liquidation" : "CRP" }));
  return [...approvals, ...exceptions]
    .sort((a,b) => priorityRank(a.status) - priorityRank(b.status) || String(a.due).localeCompare(String(b.due)));
}

function approvalBuckets() {
  const rows = approvalBucketRows();
  if (!rows.length) return `<div class="empty">Nothing waiting for approval</div>`;
  const ce = rows.filter(r => r.type === "CE").length;
  const crp = rows.filter(r => r.type === "CRP").length;
  const liquidation = rows.filter(r => r.type === "Liquidation").length;
  return `<div class="approval-buckets">
    <div class="approval-summary">
      ${mini("CE approvals", ce)}
      ${mini("CRP overrides", crp)}
      ${mini("Liquidation overrides", liquidation)}
    </div>
    <div class="approval-accordion">${rows.map(approvalDisclosure).join("")}</div>
    <div class="approval-foot">
      <span>${rows.length} waiting</span>
      <button class="btn" data-view="Approvals">View</button>
    </div>
  </div>`;
}

function approvalDisclosure(row) {
  const isOpen = expandedApprovalItems.has(row.id);
  const p = project(row.projectId);
  return `<article class="approval-item ${isOpen ? "open" : ""}">
    <button class="approval-summary-row" data-approval-toggle="${row.id}" aria-expanded="${isOpen}">
      <span><b>${p.code}</b><small>${row.type} · ${row.item}</small></span>
      ${chip(row.status, /Pending|Requested/i.test(row.status) ? "warn" : "risk")}
      <i>${isOpen ? "-" : "+"}</i>
    </button>
    ${isOpen ? `<div class="approval-detail">
      ${mini("Owner", row.owner)}
      ${mini("Due", row.due)}
      ${mini("Next action", row.next)}
      <button class="btn primary" data-project="${row.projectId}" data-project-tab="${row.type === "CRP" ? "Budget Requests" : "CE"}">View</button>
    </div>` : ""}
  </article>`;
}

function queueTable(rows, keys) {
  const mapped = rows.map(row => ({
    Project: `<button class="linkbtn" data-project="${row.projectId}">${project(row.projectId).code}</button>`,
    Item: row.item,
    Owner: row.owner,
    Due: row.due,
    Status: chip(row.status),
    "Next Action": row.next
  }));
  return simpleTable(mapped, keys);
}

function sizeFromSpan(span) {
  if (span <= 4) return "Compact";
  if (span <= 6) return "Default";
  if (span <= 8) return "Wide";
  return "Full";
}

function startWidgetResize(event) {
  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  const widget = handle.closest(".widget");
  const grid = widget?.closest(".dash-grid");
  if (!widget || !grid) return;
  const id = handle.dataset.widgetResize;
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = widget.getBoundingClientRect().width;
  const startHeight = widget.getBoundingClientRect().height;
  const gridWidth = grid.getBoundingClientRect().width;
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;
  const colWidth = (gridWidth - gap * 11) / 12;
  let nextSize = widgetSize(id);
  let nextHeight = startHeight;
  document.body.classList.add("resizing-widget");

  const resize = moveEvent => {
    const targetWidth = Math.max(colWidth * 4 + gap * 3, Math.min(gridWidth, startWidth + moveEvent.clientX - startX));
    const targetHeight = Math.max(300, Math.min(760, startHeight + moveEvent.clientY - startY));
    const span = Math.max(4, Math.min(12, Math.round((targetWidth + gap) / (colWidth + gap))));
    nextSize = sizeFromSpan(span);
    nextHeight = Math.round(targetHeight);
    widget.classList.remove("size-compact", "size-default", "size-wide", "size-tall", "size-full");
    widget.classList.add(`size-${nextSize.toLowerCase()}`);
    widget.style.setProperty("--widget-height", `${nextHeight}px`);
  };

  const stop = () => {
    document.body.classList.remove("resizing-widget");
    roleLayout()[id] = nextSize;
    roleHeights()[id] = nextHeight;
    localStorage.setItem("spotlightWidgetLayout", JSON.stringify(widgetLayoutConfig));
    localStorage.setItem("spotlightWidgetHeights", JSON.stringify(widgetHeightConfig));
    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", stop);
    render();
  };

  document.addEventListener("pointermove", resize);
  document.addEventListener("pointerup", stop);
}

function bindCalendarScrollSync() {
  document.querySelectorAll("[data-calendar-agenda]").forEach(agenda => {
    const card = agenda.closest(".calendar-card");
    if (!card) return;
    const setActiveDate = date => {
      card.querySelectorAll("[data-calendar-day]").forEach(day => {
        day.classList.toggle("active-day", day.dataset.calendarDay === date);
      });
    };
    const sync = () => {
      const agendaTop = agenda.getBoundingClientRect().top;
      const rows = [...agenda.querySelectorAll("[data-agenda-date]")];
      const activeRow = rows.find(row => row.getBoundingClientRect().bottom > agendaTop + 12) || rows[0];
      if (activeRow) setActiveDate(activeRow.dataset.agendaDate);
    };
    agenda.addEventListener("scroll", sync, { passive: true });
    agenda.addEventListener("click", event => event.stopPropagation());
    card.querySelectorAll("[data-calendar-day]").forEach(day => {
      day.addEventListener("click", event => {
        event.stopPropagation();
        const row = agenda.querySelector(`[data-agenda-date="${day.dataset.calendarDay}"]`);
        if (row) row.scrollIntoView({ block: "start", behavior: "smooth" });
        setActiveDate(day.dataset.calendarDay);
      });
    });
    sync();
  });
}

function fitTextToBox() {
  document.querySelectorAll("[data-fit-text]").forEach(element => {
    element.style.fontSize = "";
    const baseSize = parseFloat(getComputedStyle(element).fontSize);
    const minSize = element.closest(".money-card") ? 18 : 12;
    let nextSize = baseSize;
    while (element.scrollWidth > element.clientWidth && nextSize > minSize) {
      nextSize -= 1;
      element.style.fontSize = `${nextSize}px`;
    }
  });
}

function syncAdaptiveWidgets() {
  if (adaptiveWidgetObserver) adaptiveWidgetObserver.disconnect();
  adaptiveWidgetObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const widget = entry.target;
      const body = widget.querySelector(".widget-body");
      if (!body) return;
      widget.style.setProperty("--body-w", `${Math.max(1, body.clientWidth)}px`);
      widget.style.setProperty("--body-h", `${Math.max(1, body.clientHeight)}px`);
      if (widget.dataset.widgetId === "year_on_year_revenue") {
        const chartHeight = Math.round(Math.max(58, Math.min(118, body.clientHeight * 0.3)));
        widget.style.setProperty("--yoy-chart-h", `${chartHeight}px`);
      }
    });
  });
  document.querySelectorAll(".widget").forEach(widget => adaptiveWidgetObserver.observe(widget));
}

function dashboardCreativeJobs() {
  const projectIds = new Set(accessibleProjects().map(item => item.id));
  return dashboardSeed.creativeJobs.filter(item => projectIds.has(item.projectId));
}

function dashboardProjectItems(items = []) {
  const projectIds = new Set(accessibleProjects().map(item => item.id));
  return items.filter(item => !item.projectId || projectIds.has(item.projectId));
}

function dashboardLiquidationItems() {
  const access = liquidationRoleAccess();
  const projectIds = new Set(accessibleProjects().map(item => item.id));
  return db.liquidations.filter(item => {
    if (access.canViewAll) return true;
    if (!access.canViewSummary) return keyCell(item.employee) === keyCell(currentUser());
    return projectIds.has(item.projectId) && liquidationRoleAccess({ name:item.employee }).canViewDetails;
  });
}

function creativeJobKey(job) {
  return [job.projectId, job.owner, job.due, job.role].map(value => keyCell(value)).join("::");
}

function shortPersonName(name = "") {
  const parts = normalizeCell(name).split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "-";
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

function formatMonthDay(date = "") {
  const [, month = "", day = ""] = String(date).split("-");
  return month && day ? `${month.padStart(2, "0")}/${day.padStart(2, "0")}` : "TBD";
}

function creativeStatusChip(status = "") {
  const normalized = keyCell(status);
  const map = {
    "due today": ["Due", "warn"],
    overdue: ["Late", "risk"],
    waiting: ["Wait", "warn"],
    "for revision": ["Revise", "purple"],
    "for review": ["Review", "purple"],
    upcoming: ["Next", "good"],
    approved: ["Ready", "good"],
    completed: ["Done", "good"]
  };
  const [label, tone] = map[normalized] || [status, statusClass(status)];
  return `<span class="status ${tone}" title="${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function creativeTable(rows) {
  if (!rows.length) return `<div class="empty">No records</div>`;
  const priorityTone = priority => priority === "Critical" ? "critical" : priority === "High" ? "high" : priority === "Medium" ? "medium" : "low";
  const legend = dashboardUnifiedLegend();
  return `<div class="creative-task-table-wrap">${legend}<table class="creative-task-table"><thead><tr><th>Project Name</th><th>Deliverable</th><th>Owner</th><th>Deadline</th><th>Status</th><th>Revision Round</th><th>Next Action</th></tr></thead><tbody>${rows.map(job => {
    const key = creativeJobKey(job);
    const deliverable = creativeDeliverableEdits[key] || job.deliverable;
    return `<tr class="creative-task-row priority-${priorityTone(job.priority)}" data-priority="${escapeHtml(job.priority)}">
      <td><button class="linkbtn" data-project="${job.projectId}" title="${escapeHtml(project(job.projectId).code)}">${escapeHtml(project(job.projectId).name)}</button></td>
      <td><span class="creative-deliverable-edit" contenteditable="true" role="textbox" aria-label="Deliverable" data-creative-deliverable-key="${escapeHtml(key)}" data-creative-deliverable-fallback="${escapeHtml(job.deliverable)}">${escapeHtml(deliverable)}</span></td>
      <td>${escapeHtml(shortPersonName(job.owner))}</td>
      <td>${formatMonthDay(job.due)}</td>
      <td>${creativeStatusChip(job.status)}</td>
      <td>${Number(job.round || 0)}</td>
      <td>${escapeHtml(job.nextAction)}</td>
    </tr>`;
  }).join("")}</tbody></table></div>`;
}

function bindCreativeDeliverables() {
  document.querySelectorAll("[data-creative-deliverable-key]").forEach(field => {
    field.addEventListener("click", event => event.stopPropagation());
    field.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      field.blur();
    });
    field.addEventListener("blur", () => {
      const value = normalizeCell(field.textContent) || field.dataset.creativeDeliverableFallback || "Deliverable";
      creativeDeliverableEdits[field.dataset.creativeDeliverableKey] = value;
      localStorage.setItem(creativeDeliverableStorageKey, JSON.stringify(creativeDeliverableEdits));
      render();
    });
  });
}

function projectTabsForRole(role = state.role) {
  const canonical = canonicalRole(role);
  const tabs = ["Overview", "Brief"];
  if (/^(CEO|COO|ACCOUNTS HEAD|ACCOUNT MANAGER|ACCOUNT EXECUTIVE|PRODUCTION HEAD|PROJECT MANAGER|PROJECT COORDINATOR|FINANCE LEAD|FINANCE OFFICER|FINANCE COMPLIANCE & ASSISTANT)$/.test(canonical)) tabs.push("CE");
  if (/^(CEO|COO|PRODUCTION HEAD|PROJECT MANAGER|PROJECT COORDINATOR|FINANCE LEAD|FINANCE OFFICER|FINANCE COMPLIANCE & ASSISTANT)$/.test(canonical)) tabs.push("Budget Requests", "Fund Releases", "Liquidations");
  if (supplierAccessProfile(role).scope !== "none") tabs.push("Suppliers");
  if (/^(CEO|COO|ACCOUNTS HEAD|ACCOUNT MANAGER|ACCOUNT EXECUTIVE|FINANCE LEAD|FINANCE OFFICER)$/.test(canonical)) tabs.push("Billing");
  if (/^(CEO|COO|PRODUCTION HEAD)$/.test(canonical)) tabs.push("Post-Audit");
  if (canonical === "CEO") tabs.push("Audit Trail");
  return tabs;
}

function accountDepartmentForRole(role) {
  return roleDepartments.find(department => department.roles.includes(role))?.name || "Unassigned";
}

function accountAccessPages(role) {
  if (role === "SUPER ADMIN") return ["Dashboard", "Accounts"];
  const pages = ["Dashboard"];
  if (canViewApprovals(role)) pages.push("Approvals");
  if (canonicalRole(role) !== "ADMIN & HR OFFICER") pages.push("Projects");
  if (clientAccessProfile(role).scope !== "none") pages.push("Clients");
  if (financeAccessProfile(role).scope !== "none") pages.push("Finance");
  pages.push("Liquidations");
  if (supplierAccessProfile(role).scope !== "none") pages.push("Suppliers");
  return pages;
}

function accountRoleOptions(selected = "ACCOUNT EXECUTIVE") {
  return roleDepartments.map(department => `<optgroup label="${escapeHtml(department.name)}">${department.roles.map(role => `<option value="${escapeHtml(role)}" ${role === selected ? "selected" : ""}>${escapeHtml(role)}</option>`).join("")}</optgroup>`).join("");
}

function accessScopeLabel(scope) {
  return { ASSIGNED:"Assigned", TEAM:"Team", ALL:"All" }[scope] || "Assigned";
}

function accountScopeDescription(scope) {
  return {
    ASSIGNED:"Own records and projects specifically assigned to this user.",
    TEAM:"Own and assigned records, plus records owned by people reporting to this user.",
    ALL:"All records available to the selected role across the organization."
  }[scope] || "Own records and projects specifically assigned to this user.";
}

function accountDisplayStatus(account) {
  if (account.status === "SUSPENDED") return chip("SUSPENDED", "risk");
  if (account.mustChangePassword) return chip("PASSWORD SETUP", "warn");
  return chip("ACTIVE", "good");
}

function generatedAccountCredentialsModal() {
  const credentials = state.generatedAccountCredentials;
  if (!credentials) return "";
  return `<div class="review-backdrop" role="presentation" data-account-credentials-close>
    <section class="review-modal account-credentials-modal" role="dialog" aria-modal="true" aria-label="Temporary account password">
      <div class="modal-kicker">Temporary Access</div><h2>${escapeHtml(credentials.reason || "Account created")}</h2><p>Send these credentials privately. The user must replace this password after the first successful login.</p>
      <div class="account-credential-sheet"><div><span>User</span><b>${escapeHtml(credentials.name)}</b></div><div><span>Email</span><b>${escapeHtml(credentials.email)}</b></div><div><span>Password</span><code>${escapeHtml(credentials.password)}</code></div></div>
      <div class="modal-actions"><button class="btn primary" type="button" data-account-password-copy>Copy</button><button class="btn" type="button" data-account-credentials-close>Done</button></div>
    </section>
  </div>`;
}

function accountEditModal() {
  const account = userAccounts.find(item => item.id === state.accountEditId);
  if (!account || !isSuperAdminMode()) return "";
  return `<div class="review-backdrop" role="presentation" data-account-edit-close>
    <section class="review-modal account-edit-modal" role="dialog" aria-modal="true" aria-label="Edit user account">
      <button class="modal-close" type="button" data-account-edit-close aria-label="Close account editor">×</button><div class="modal-kicker">Account Management</div><h2>Edit User</h2>
      <form id="accountEditForm" class="account-edit-form">
        <label><span>Full Name</span><input name="name" value="${escapeHtml(account.name)}" required /></label>
        <label><span>Email</span><input name="email" type="email" value="${escapeHtml(account.email)}" required /></label>
        ${account.switchable ? `<label><span>Role</span><input value="${escapeHtml(account.role)}" disabled /><input type="hidden" name="role" value="${escapeHtml(account.role)}" /></label><fieldset><legend>Record Scope</legend><b>${escapeHtml(accessScopeLabel(account.scope))}</b><input type="hidden" name="scope" value="${escapeHtml(account.scope)}" /></fieldset>` : `<label><span>Role</span><select name="role">${accountRoleOptions(account.role)}</select></label><fieldset><legend>Record Scope</legend>${["ASSIGNED", "TEAM", "ALL"].map(scope => `<label><input type="radio" name="scope" value="${scope}" ${account.scope === scope ? "checked" : ""} /> ${accessScopeLabel(scope)}</label>`).join("")}</fieldset>`}
        <div class="modal-actions"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-account-edit-close>Cancel</button></div>
      </form>
    </section>
  </div>`;
}

function downloadAccountActivityLog() {
  const rows = [["Date", "Action", "Details", "Actor", "Subject ID"], ...accountActivity.map(item => [item.at || "", item.action || "", item.detail || "", item.actor || "System", item.subjectId || ""] )];
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `spotlight-account-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  recordAccountActivity("Activity log downloaded", `${accountActivity.length} account events exported`);
}

function superAdminDashboard() {
  const active = userAccounts.filter(account => account.status === "ACTIVE").length;
  const administrators = userAccounts.filter(account => account.role === "SUPER ADMIN" && account.status === "ACTIVE").length;
  const suspended = userAccounts.filter(account => account.status === "SUSPENDED").length;
  const recent = accountActivity.slice(0, 5);
  return `<div class="toolbar admin-page-head"><div><span class="page-eyebrow">System Administration</span><h2>Access Control</h2><p>Manage identities and permissions without entering the CEO's operating workspace.</p></div><div class="account-head-actions"><button class="btn" type="button" data-account-log-download>Download</button><button class="btn primary" type="button" data-view="Accounts">Accounts</button></div></div>
    <section class="admin-boundary"><div><span>Separate Identity</span><b>Super Admin controls the system, not executive decisions.</b></div><p>Sign out, then log in with the CEO account to review projects, approvals, finance, and business performance.</p></section>
    <div class="grid cols-4 admin-metrics">${metric("Accounts", userAccounts.length, "Created identities", "Accounts")}${metric("Active", active, "Can access the system", "Accounts")}${metric("Suspended", suspended, "Access blocked", "Accounts")}${metric("Admins", administrators, "System administrators", "Accounts")}</div>
    <section class="account-admin-section"><div class="client-section-title"><div><span>Governance</span><h3>Account Activity</h3></div><small>${recent.length} recent change${recent.length === 1 ? "" : "s"}</small></div>${recent.length ? `<div class="account-activity-list">${recent.map(item => `<article><div><b>${escapeHtml(item.action)}</b><small>${escapeHtml(item.detail)}${item.actor ? ` · ${escapeHtml(item.actor)}` : ""}</small></div><time>${escapeHtml(item.at)}</time></article>`).join("")}</div>` : `<div class="empty">Account changes will appear here.</div>`}</section>`;
}

function accountAdministrationPage() {
  if (!isSuperAdminMode()) return `<section class="finance-restricted"><span>Restricted</span><h2>Accounts</h2><p>Only the separate Super Admin account can manage users and access.</p></section>`;
  const directory = userAccounts.map(account => `<article class="account-directory-row">
    <div class="account-directory-user"><b>${escapeHtml(account.name)}</b><small>${escapeHtml(account.email)}</small></div>
    <div><span>Department</span><b>${escapeHtml(account.department)}</b></div>
    <div><span>Role</span><b>${escapeHtml(account.role)}</b></div>
    <div><span>Scope</span><b>${escapeHtml(accessScopeLabel(account.scope))}</b></div>
    <div class="account-directory-pages"><span>Pages</span><p class="account-page-list">${accountAccessPages(account.role).map(page => `<i>${escapeHtml(page)}</i>`).join("")}</p></div>
    <div class="account-directory-status"><span>Status</span>${accountDisplayStatus(account)}</div>
    <div class="account-directory-action"><button class="btn compact" type="button" data-account-edit="${escapeHtml(account.id)}">Edit</button><button class="btn compact" type="button" data-account-reset="${escapeHtml(account.id)}">Reset</button>${account.switchable ? `<span class="account-protected">Owner</span>` : `<button class="btn compact" type="button" data-account-status="${escapeHtml(account.id)}">${account.status === "SUSPENDED" ? "Activate" : "Suspend"}</button>`}</div>
  </article>`).join("");
  const initialRole = "ACCOUNT EXECUTIVE";
  const initialPages = accountAccessPages(initialRole);
  return `<div class="toolbar admin-page-head"><div><span class="page-eyebrow">Super Admin</span><h2>User Accounts</h2><p>Create one identity per person and assign one role with a clear record scope.</p></div><div class="account-head-actions">${chip("Admin only", "active")}<button class="btn" type="button" data-account-log-download>Download</button></div></div>
    <section class="admin-boundary compact"><div><span>Permission Rule</span><b>Role determines pages. Scope determines which records appear.</b></div><p>Created accounts never inherit the CEO identity or Super Admin controls. Prototype accounts are stored in this browser until secure sign-in is connected.</p></section>
    <section class="account-create-layout">
      <form id="accountCreateForm" class="account-create-form">
        <div class="client-section-title"><div><span>New User</span><h3>Create Account</h3></div><small>Role and access assignment</small></div>
        <div class="account-form-grid">
          <label><span>Full Name</span><input name="name" required autocomplete="off" placeholder="Employee name" /></label>
          <label><span>Company Email</span><input name="email" type="email" required autocomplete="off" placeholder="name@company.com" /></label>
          <label><span>Role</span><select name="role" data-account-role>${accountRoleOptions(initialRole)}</select></label>
          <fieldset><legend>Record Scope</legend><label><input type="radio" name="scope" value="ASSIGNED" checked /> Assigned</label><label><input type="radio" name="scope" value="TEAM" /> Team</label><label><input type="radio" name="scope" value="ALL" /> All</label></fieldset>
        </div>
        <div class="account-form-actions"><button class="btn primary" type="submit">Create</button></div>
      </form>
      <aside class="account-access-preview" data-account-access-preview>
        <span>Effective Access</span><h3>${escapeHtml(initialRole)}</h3><p>${escapeHtml(accountDepartmentForRole(initialRole))} · Assigned records</p><div>${initialPages.map(page => `<i>${escapeHtml(page)}</i>`).join("")}</div><small>${escapeHtml(accountScopeDescription("ASSIGNED"))}</small>
      </aside>
    </section>
    <section class="account-admin-section"><div class="client-section-title"><div><span>Directory</span><h3>Accounts & Access</h3></div><small>${userAccounts.length} account${userAccounts.length === 1 ? "" : "s"}</small></div><div class="account-directory">${directory}</div></section>`;
}

const views = {
  Dashboard() {
    if (isSuperAdminMode()) return superAdminDashboard();
    return renderRoleDashboard();
  },
  Accounts() {
    return accountAdministrationPage();
  },
  Projects() {
    const active = accessibleProjects();
    return `
      <div class="toolbar"><div><h2>Project Master</h2><p>Every legitimate opportunity receives a permanent Project ID.</p></div>${canCreateProject() ? `<button class="btn primary" id="newProject">＋ New</button>` : ""}</div>
      <section class="project-master-shell">
        <div class="project-summary-box">
          <div><small>Active Projects</small><b>${active.length}</b></div>
          <div><small>Total Value</small><b>${fmtDetailed(active.reduce((sum, item) => sum + item.value, 0))}</b></div>
        </div>
        <div class="project-phase-board">
          ${projectBuckets.map(bucket => projectMasterPhaseAccordion(bucket, active.filter(item => projectBucket(item) === bucket), true)).join("")}
        </div>
      </section>`;
  },
  "Project 360"() {
    const permittedProjects = accessibleProjects();
    if (!permittedProjects.some(item => item.id === state.selectedProjectId)) state.selectedProjectId = permittedProjects[0]?.id || "";
    const p = project(state.selectedProjectId);
    if (!p) return `<div class="empty">No assigned project is available for this role.</div>`;
    const c = client(p.clientId);
    const h = health(p);
    const tabButtons = projectTabsForRole();
    if (!tabButtons.includes(state.tab)) state.tab = state.tab === "Activity" ? "Audit Trail" : "Overview";
    return `
      <button class="btn back-btn" data-back-projects="true">Back</button>
      <div class="detail-head">
        <div><h2>${c.brand} · ${p.name}</h2><div class="meta"><span>CE# ${projectCeNumber(p)}</span><span>${p.service}</span></div></div>
        <div>${chip(p.stage, statusClass(p.stage))} ${chip(h[0], h[1])}</div>
      </div>
      <div class="tabs project-tabs" style="--project-tab-count:${tabButtons.length}" role="tablist" aria-label="Project sections">${tabButtons.map(t => `<button class="${state.tab === t ? "active" : ""}" data-tab="${t}" role="tab" aria-selected="${state.tab === t}">${t}</button>`).join("")}</div>
      <div class="project-tab-panel">${projectTab(p)}</div>
    `;
  },
  Clients() {
    const access = clientAccessProfile();
    if (access.scope === "none") return `<section class="finance-restricted"><span>Restricted</span><h2>Clients</h2><p>This role does not have access to the client database.</p></section>`;
    const year = currentClientYear();
    const visibleProjects = access.scope === "all" ? db.projects : accessibleProjects();
    const annualProjects = visibleProjects.filter(item => projectRecordYear(item) === year);
    const activeClientIds = new Set(annualProjects.map(item => item.clientId));
    const currentClients = db.clients.filter(item => activeClientIds.has(item.id));
    const archivedYears = [...new Set(db.projects.map(projectRecordYear).filter(item => item && item < year))].sort((a, b) => b - a);
    const clientCard = (c, projectRows) => {
      const ar = db.invoices.filter(i => projectRows.some(p => p.id === i.projectId)).reduce((sum, i) => sum + i.amount - i.collected, 0);
      const contacts = db.contacts.filter(item => item.clientId === c.id);
      return `<article class="card client-record-card"><div class="client-record-head"><div><span>${escapeHtml(c.code)}</span><h3>${escapeHtml(c.company)}</h3></div>${chip(c.status, "good")}</div><p>${escapeHtml(c.unit)} · ${escapeHtml(c.brand)}</p>${mini("Relationship owner", c.owner)}${mini("Projects this year", projectRows.length)}${mini("Awarded value", fmt(projectRows.reduce((sum, item) => sum + item.approvedCe, 0)))}${mini("Outstanding AR", fmt(ar))}<h4>Contacts</h4>${contacts.length ? contacts.map(item => `<p><b>${escapeHtml(item.name)}</b><br><small>${escapeHtml(item.type)} · ${escapeHtml(item.mobile)}<br>${escapeHtml(item.email)}<br>Birthday: ${escapeHtml(item.birthday || "TBD")}</small></p>`).join("") : `<small>No client contact recorded.</small>`}</article>`;
    };
    const archive = canonicalRole() === "CEO" ? `<section class="client-archive"><div class="client-section-title"><div><span>CEO Only</span><h3>Annual Archive</h3></div><small>Each completed year becomes a read-only client database snapshot.</small></div>${archivedYears.length ? archivedYears.map(archiveYear => {
      const archiveProjects = db.projects.filter(item => projectRecordYear(item) === archiveYear);
      const ids = new Set(archiveProjects.map(item => item.clientId));
      return `<details><summary><b>${archiveYear} Client Database</b><span>${ids.size} client${ids.size === 1 ? "" : "s"}</span></summary><div class="grid cols-3">${db.clients.filter(item => ids.has(item.id)).map(item => clientCard(item, archiveProjects.filter(projectItem => projectItem.clientId === item.id))).join("")}</div></details>`;
    }).join("") : `<div class="empty">No completed annual client database has been archived yet.</div>`}</section>` : "";
    return `<div class="toolbar"><div><span class="page-eyebrow">${year} Active Database</span><h2>Clients</h2><p>Client records are generated as projects are created during the year.</p></div>${chip(access.label, access.scope === "all" ? "good" : "active")}</div><div class="finance-scope-strip"><b>${escapeHtml(access.label)}</b><span>${access.scope === "all" ? "All active client records" : "Clients linked to your assigned projects"}</span></div>
      <section class="client-current"><div class="client-section-title"><div><span>Current Year</span><h3>${year} Client Database</h3></div><small>${currentClients.length} active client record${currentClients.length === 1 ? "" : "s"}</small></div><div class="grid cols-3">${currentClients.length ? currentClients.map(c => clientCard(c, annualProjects.filter(item => item.clientId === c.id))).join("") : `<div class="empty">Create the first project for ${year} to begin this year's client database.</div>`}</div></section>${archive}`;
  },
  Finance() {
    return financePage();
  },
  Liquidations() {
    const access = liquidationRoleAccess();
    const projectIds = new Set(accessibleProjects().map(item => item.id));
    const records = access.canViewAll
      ? db.liquidations
      : access.canViewSummary
        ? db.liquidations.filter(item => projectIds.has(item.projectId))
        : db.liquidations.filter(item => keyCell(item.employee) === keyCell(currentUser()));
    const selectedProjectId = records.some(item => item.projectId === state.liquidationPageProjectId) ? state.liquidationPageProjectId : "";
    const visibleRecords = selectedProjectId ? records.filter(item => item.projectId === selectedProjectId) : records;
    const open = visibleRecords.filter(item => !/Cleared/i.test(item.status));
    const underAudit = visibleRecords.filter(item => /Under Audit/i.test(item.status)).reduce((sum, item) => sum + item.liquidated, 0);
    const forReturn = visibleRecords.filter(item => /For Cash Return/i.test(item.status)).reduce((sum, item) => sum + item.returned, 0);
    const forReimbursement = visibleRecords.filter(item => /For Reimbursement/i.test(item.status)).reduce((sum, item) => sum + item.reimbursable, 0);
    const grouped = new Map();
    visibleRecords.forEach(item => {
      const items = grouped.get(item.projectId) || [];
      items.push(item);
      grouped.set(item.projectId, items);
    });
    const projectGroups = [...grouped.entries()]
      .sort(([projectA], [projectB]) => eventDate(project(projectB)).localeCompare(eventDate(project(projectA))))
      .map(([projectId, items], index) => liquidationPageProjectGroup(projectId, items, Boolean(selectedProjectId || index === 0)))
      .join("");
    const returnControl = state.liquidationReturnView ? `<button class="btn" type="button" data-liquidation-return>Back</button>` : "";
    const filterControl = selectedProjectId ? `<button class="btn" type="button" data-liquidation-show-all>All</button>` : "";
    return `<div class="toolbar"><div><span class="page-eyebrow">${escapeHtml(access.label)}</span><h2>Liquidations</h2><p>Cash accountability, cash returns, reimbursements, and audit status.</p></div><div class="liquidation-page-actions">${returnControl}${filterControl}${access.canSubmit ? `<button class="btn primary" type="button" data-liq-submit-open="true">Submit</button>` : ""}</div></div>
      <div class="liquidation-access-banner tone-${escapeHtml(access.tone)}"><div><span>${escapeHtml(access.label)}</span><b>${escapeHtml(access.title)}</b></div><p>${escapeHtml(access.description)}</p></div>
      <div class="grid cols-4">${metric("Overdue", open.filter(item => agingDays(item.due) > 0).length, "Open accountability", "Liquidations")}${metric("Under Audit", fmt(underAudit), "Corrections pending", "Liquidations")}${metric("Cash Return", fmt(forReturn), "Cash to be returned", "Liquidations")}${metric("Reimbursement", fmt(forReimbursement), "Released only after clearance", "Liquidations")}</div>
      <section class="liquidation-page-dashboard"><div class="client-section-title"><div><span>${selectedProjectId ? "Selected Project" : "Liquidation Summary"}</span><h3>${access.canViewAll ? "All Employee Liquidations" : access.canViewSummary ? "Team & Project Liquidations" : "My Liquidations"}</h3></div><small>${visibleRecords.length} packet${visibleRecords.length === 1 ? "" : "s"}</small></div><div class="liquidation-page-projects">${projectGroups || `<div class="empty">No liquidation records are visible for this scope.</div>`}</div></section>`;
  },
  Suppliers() {
    const access = supplierAccessProfile();
    if (access.scope === "none") return `<section class="finance-restricted"><span>Restricted</span><h2>Suppliers</h2><p>This role does not have access to supplier rates or payment records.</p></section>`;
    const permittedProjectIds = new Set(accessibleProjects().map(item => item.id));
    const supplierProjects = supplier => db.ceLines
      .filter(line => keyCell(line.supplier) === keyCell(supplier.name))
      .map(line => db.ceVersions.find(version => version.id === line.ceId)?.projectId)
      .filter(Boolean);
    const suppliers = access.scope === "assigned"
      ? db.suppliers.filter(supplier => supplierProjects(supplier).some(projectId => permittedProjectIds.has(projectId)))
      : db.suppliers;
    const rows = suppliers.map(supplier => {
      const projectIds = [...new Set(supplierProjects(supplier))];
      const firstProject = projectIds.find(projectId => permittedProjectIds.has(projectId)) || projectIds[0];
      return {
        supplier:`<b>${escapeHtml(supplier.name)}</b><br><small>${escapeHtml(supplier.contact)}</small>`,
        category:escapeHtml(supplier.category),
        terms:escapeHtml(supplier.terms),
        spent:fmt(supplier.spent),
        quality:`${supplier.quality}/5`,
        reliability:`${supplier.reliability}/5`,
        status:chip(supplier.status, supplier.status === "Preferred" ? "good" : "warn"),
        project:projectIds.length ? `${projectIds.length} linked` : "Directory only",
        action:firstProject ? `<button class="btn compact" data-project="${firstProject}" data-project-tab="Suppliers">View</button>` : ""
      };
    });
    const totalSpend = suppliers.reduce((sum, supplier) => sum + supplier.spent, 0);
    return `<div class="toolbar"><div><span class="page-eyebrow">${escapeHtml(access.label)}</span><h2>Suppliers</h2><p>Supplier history, commercial terms, project use, quality, reliability, and payment documentation.</p></div>${chip(access.canManage ? "Working access" : "View only", access.canManage ? "good" : "active")}</div>
      <div class="finance-scope-strip"><b>${escapeHtml(access.label)}</b><span>${access.scope === "assigned" ? "Suppliers linked to assigned projects" : access.scope === "finance" ? "Payables, evidence, and actualization" : access.scope === "audit" ? "Documentation and compliance review" : "All supplier records"}</span></div>
      <div class="grid cols-4">${metric("Suppliers", suppliers.length, "Visible records", "Suppliers")}${metric("Historical Spend", fmt(totalSpend), "Across visible suppliers", "Suppliers")}${metric("Preferred", suppliers.filter(item => item.status === "Preferred").length, "Reusable supplier records", "Suppliers")}${metric("Watchlist", suppliers.filter(item => item.status !== "Preferred").length, "Needs closer review", "Suppliers")}</div>
      <div class="section card"><h3>${access.scope === "finance" ? "Supplier Payables Directory" : access.scope === "audit" ? "Supplier Compliance Directory" : "Supplier Directory"}</h3>${simpleTable(rows, ["supplier","category","terms","spent","quality","reliability","status","project","action"])}</div>`;
  },
  Approvals() {
    const overrides = [
      ...db.budgetRequests.filter(isCrpOverride).map(b => ({ id:b.id, type:"CRP Override", projectId:b.projectId, owner:b.requestor, amount:b.amount, reason:b.reason || "CRP savings guardrail needs management review against the signed CE.", status:b.status, reviewType:"crp" })),
      ...db.liquidations.filter(l=>/For Cash Return|For Reimbursement/i.test(l.status)).map(l => ({ id:l.id, type:"Liquidation Override", projectId:l.projectId, owner:l.employee, amount:l.released, reason:l.findings || l.status, status:l.status, reviewType:"liquidation" }))
    ];
    return `<div class="toolbar"><div><h2>Approval Queues</h2><p>Segregated review for finance validation, implementation validation, management approval, and policy overrides.</p></div></div>
      <div class="split"><div class="card"><h3>CE Approvals</h3>${approvalTable()}</div><div class="card"><h3>CRP Override / Liquidation Override</h3>${overrides.map(o => `<button class="notice review-card" data-review="${o.reviewType}:${o.id}">${chip(o.type)} ${chip(o.status)}<p><b>${project(o.projectId).code}</b><br>${o.owner} · ${fmt(o.amount)}<br>${o.reason}</p><span class="btn primary">View</span></button>`).join("")}</div></div>`;
  },
  Search() {
    const q = state.search.toLowerCase();
    const results = searchResults(q);
    return `<div class="toolbar"><div><h2>Global Search</h2><p>Search across project codes, project names, clients, brands, suppliers, invoices, CEs, and employees.</p></div></div>
      <div class="card">${results.length ? `<table><thead><tr><th>Type</th><th>Record</th><th>Context</th><th></th></tr></thead><tbody>${results.map(r => `<tr><td>${r.type}</td><td><b>${r.name}</b></td><td>${r.context}</td><td>${r.projectId ? `<button class="btn" data-project="${r.projectId}">View</button>` : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Type in the search bar to find records.</div>`}</div>`;
  },
  Architect() {
    return `<div class="toolbar"><div><h2>MVP Architecture</h2><p>The implementation plan embedded in the product so build decisions remain visible.</p></div></div>
      <div class="grid cols-2">
        <div class="card"><h3>A. Product Architecture</h3><p>Spotlight OS is project-first. Clients own brands, brands generate Projects/JOs, and each CE, CRP, release, liquidation, invoice, collection, closure item, document, supplier, post-audit, and activity log links back to a Project ID.</p></div>
        <div class="card"><h3>B. MVP Scope</h3><p><b>Build now:</b> authentication model, roles, clients, projects, qualification, CE approval, budget release, liquidation, reconciliation, billing, collection, closure, dashboard, search, suppliers.</p><p><b>Build later:</b> Slack, Drive automation, warehouse, social publishing, payroll, GL accounting, banking, AI decisions.</p></div>
        <div class="card"><h3>C. Database Schema</h3><div class="schema-list">${["Users","Roles","Clients","ClientBusinessUnits","Brands","ClientContacts","Projects","ProjectStageHistory","ProjectQualifications","CostEstimates","CostEstimateVersions","CostEstimateLines","CEApprovals","BudgetRequests","BudgetRequestLines","FundReleases","Liquidations","LiquidationExpenses","LiquidationAuditFindings","Reimbursements","Suppliers","SupplierQuotations","ProjectSuppliers","Invoices","Collections","ProjectPostAudits","ClosureChecklists","ActivityLogs","SystemSettings","ExceptionsOverrides"].map(x=>`<div>${x}</div>`).join("")}</div></div>
        <div class="card"><h3>D. Permission Matrix</h3>${permissionMatrix()}</div>
        <div class="card"><h3>E. State Machines</h3>${stateMachine("Project", stages)}${stateMachine("CE", ["DRAFT","FINANCE REVIEW","IMPLEMENTATION REVIEW","MANAGEMENT APPROVAL","APPROVED FOR CLIENT","SENT TO CLIENT","REVISED","CLIENT APPROVED / SIGNED"])}${stateMachine("Budget Request", ["REQUESTED","UNDER REVIEW","APPROVED","EXCEPTION APPROVAL","REJECTED"])}${stateMachine("Fund Release", ["APPROVED","CASH AVAILABILITY CHECK","FOR PREPARATION","READY FOR RELEASE","RELEASED","FOR LIQUIDATION"])}${stateMachine("Liquidation", ["Under Audit","For Cash Return","For Reimbursement","Cleared"])}${stateMachine("Billing", ["FOR BILLING","BILLED","PARTIALLY PAID","PAID","OVERDUE"])}</div>
        <div class="card"><h3>F. Financial Logic</h3><p>Estimated gross profit = estimated revenue minus estimated direct cost. Estimated margin = estimated gross profit divided by estimated revenue.</p><p>Actual direct cost comes from validated expenses, not released cash. Outstanding advance = released minus liquidated minus returned. Reimbursement = liquidated spend above released amount, payable only after audit clearance. AR = billed amount minus collected cash.</p>${settingsPanel()}</div>
        <div class="card"><h3>G. Page Map</h3><p>Management Dashboard, Employee Home, Projects, Project 360, Clients, CE, Budget Requests, Fund Releases, Liquidations, Suppliers, Billing, Collection, Closure, Post-Audit, Notifications, Search, Settings, Audit Log.</p></div>
        <div class="card"><h3>H. Build Plan</h3><p>Sprint 1 foundation, Sprint 2 commercial, Sprint 3 cash deployment, Sprint 4 liquidation, Sprint 5 project economics, Sprint 6 revenue cycle, Sprint 7 management intelligence.</p><h3>I. Open Decisions</h3><p>Approval limits, exact signatories, production of official project code format, and finance-of-record integration need management confirmation before production hardening.</p></div>
        <div class="card" style="grid-column:1/-1"><h3>Role Dashboard Matrix</h3>${roleDashboardMatrix()}</div>
        <div class="card" style="grid-column:1/-1"><h3>Widget Data Contracts</h3>${widgetContracts()}</div>
        <div class="card" style="grid-column:1/-1"><h3>Role × Information Matrix</h3>${roleInformationMatrix()}</div>
        <div class="card" style="grid-column:1/-1"><h3>Default Homepage Layouts</h3>${homepageLayouts()}</div>
      </div>`;
  }
};

function metric(label, value, hint, view) {
  return `<button class="card metric" data-view="${view}"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></button>`;
}
function mini(label, value) { return `<div class="mini"><small>${label}</small><b>${value}</b></div>`; }
function projectDisclosureCard(p) {
  const isOpen = expandedProjectCards.has(p.id);
  const c = client(p.clientId);
  return `<article class="project-card disclosure-card ${isOpen ? "open" : ""}">
    <button class="disclosure-summary" data-project-toggle="${p.id}" aria-expanded="${isOpen}">
      <span class="disclosure-main"><b>${p.code}</b><small>${p.name}</small></span>
      <span class="disclosure-meta">${chip(health(p)[0], health(p)[1])}<strong>${fmt(p.value)}</strong></span>
      <span class="chevron">${isOpen ? "-" : "+"}</span>
    </button>
    ${isOpen ? `<div class="disclosure-content">
      ${mini("Client", `${c.company} / ${c.brand}`)}
      ${mini("Event Date", formatShortDate(eventDate(p)))}
      ${mini("Account Manager", p.owner)}
      ${mini("Production Owner", p.implementationOwner)}
      ${mini("Creative Owner", p.creativeOwner)}
      ${mini("Event Date", formatShortDate(eventDate(p)))}
      <button class="btn" data-project="${p.id}">View</button>
    </div>` : ""}
  </article>`;
}
function projectTable(projects) {
  return `<table><thead><tr><th>Project</th><th>Client</th><th>Owner</th><th>Stage</th><th>Event Date</th><th>Value</th><th>Health</th></tr></thead><tbody>${projects.map(p => `<tr class="clickable" data-project="${p.id}"><td><b>${p.code}</b><br>${p.name}</td><td>${client(p.clientId).company}<br><small>${client(p.clientId).brand}</small></td><td>${p.owner}</td><td>${chip(p.stage, stageTone(p.stage))}</td><td>${formatShortDate(eventDate(p))}</td><td class="money">${fmt(p.value)}</td><td>${chip(health(p)[0], health(p)[1])}</td></tr>`).join("")}</tbody></table>`;
}

function projectMasterPhaseAccordion(label, projects, open = false) {
  const sorted = [...projects].sort((a,b)=>eventDate(a).localeCompare(eventDate(b)));
  const total = sorted.reduce((sum, p) => sum + p.value, 0);
  const atRisk = sorted.filter(p => health(p)[0] === "AT RISK").length;
  const tone = label === "For Pitch/Bidding" ? "is-pitch" : label === "On-Going" ? "is-ongoing" : "is-collection";
  return `<details class="project-phase-card ${tone}" ${open ? "open" : ""}>
    <summary class="project-phase-head">
      <b>${label}</b>
      <small><span>${sorted.length} ${sorted.length === 1 ? "project" : "projects"} · ${fmt(total)}</span>${atRisk ? `<strong class="project-risk-count">${atRisk} at risk</strong>` : `<span>· No risks</span>`}</small>
      <em aria-hidden="true">‹</em>
    </summary>
    <div class="project-line-head"><span>Project</span><span>Client</span><span>Event Date</span><span>CE Status</span><span>Value</span><span>Action</span><span></span></div>
    <div class="project-line-list">
      ${sorted.length ? sorted.map(projectMasterRow).join("") : `<div class="empty">No projects in this phase</div>`}
    </div>
  </details>`;
}

function projectMasterRow(p) {
  const c = client(p.clientId);
  const status = projectCeStatus(p);
  const h = health(p);
  return `<details class="project-line-item">
    <summary>
      <span><b>${p.code}</b><small>${p.name}</small></span>
      <span><b>${c.company}</b><small>${c.brand}</small></span>
      <span><b>${formatShortDate(eventDate(p))}</b><small>Event Date</small></span>
      <span>${chip(status.label, status.tone)}</span>
      <span><b>${fmt(p.value)}</b><small>${chip(h[0], h[1])}</small></span>
      <span class="btn small project-row-action" data-project="${p.id}" data-project-tab="CE" role="button" tabindex="0">View</span>
      <em>+</em>
    </summary>
    <div class="project-line-detail">
      <div class="project-detail-column">
        ${mini("Client", c.company)}
        ${mini("Project Name", p.name)}
        ${mini("Venue", p.venue || "TBD")}
        ${mini("Event Date", formatShortDate(eventDate(p)))}
      </div>
      <div class="project-detail-column">
        ${mini("Account Manager", p.owner)}
        ${mini("Project Manager", p.implementationOwner)}
        ${mini("Art Director", p.creativeOwner)}
      </div>
    </div>
  </details>`;
}

function projectPhaseAccordion(projects) {
  const phases = ["CLOSURE", "PITCHING", "PRE-PRODUCTION", "COLLECTION"];
  const grouped = phases.map(stage => ({
    stage,
    projects: projects.filter(p => p.stage === stage).sort((a,b) => breakDate(a).localeCompare(breakDate(b)))
  }));
  const max = Math.max(...grouped.map(group => group.projects.length), 1);
  return `<div class="phase-accordion">
    <h4>Projects by Stage</h4>
    ${grouped.map(group => {
      const count = group.projects.length;
      const width = Math.max(8, Math.round(count / max * 100));
      return `<details class="phase-item">
        <summary class="phase-summary">
          <span>${group.stage}</span>
          <div class="bar-track"><i class="${stageTone(group.stage)}" style="width:${width}%"></i></div>
          <b>${count} ${count === 1 ? "project" : "projects"}</b>
          <em>+</em>
        </summary>
        <div class="phase-projects">
          ${count ? group.projects.map(p => {
            const h = health(p);
            return `<div class="phase-project">
              <div><strong>${p.code}</strong><span>${p.name}</span></div>
              <div><small>Client</small><b>${client(p.clientId).company}</b></div>
              <div><small>Owner</small><b>${p.owner}</b></div>
              <div><small>Value</small><b>${fmt(p.value)}</b></div>
              ${chip(h[0], h[1])}
              <button class="btn" data-project="${p.id}">View</button>
            </div>`;
          }).join("") : `<div class="empty">No projects in this phase</div>`}
        </div>
      </details>`;
    }).join("")}
  </div>`;
}
function activityItem(a) { return `<div class="event"><time>${a.at}</time><div><b>${a.action}</b><br><span>${a.user}: ${a.comment}</span></div></div>`; }
function projectTab(p) {
  const c = client(p.clientId);
  const tab = state.tab;
  if (tab === "Overview") return `<div class="project-overview-grid"><div class="card overview-card"><h3>Essential Details</h3>${essentialDetails(p)}</div><div class="card client-context-card"><h3>Client Context</h3>${mini("Company", c.company)}${mini("Business Unit", c.unit)}${mini("Brand", c.brand)}${mini("Payment Terms", `${c.paymentTerms} days`)}</div><div class="card manpower-card"><h3>Manpower List</h3>${manpowerList(p)}</div></div>`;
  if (tab === "Brief") return projectBriefTab(p);
  if (tab === "CE") return `<div class="card ce-dashboard-card"><h3>Cost Estimate Uploads</h3><div class="upload-panel ce-upload-panel">
    <input class="ce-upload-input" id="ceUploadInput" type="file" accept=".xlsx,.xls" data-ce-upload-input="base" />
    <input class="ce-upload-input" id="ceAddendumInput" type="file" accept=".xlsx,.xls" data-ce-upload-input="addendum" />
    <button class="btn primary" data-ce-upload-button="base">Upload</button>
    <button class="btn" data-ce-upload-button="addendum">Addendum</button>
    <p>Each upload becomes a new CE version and keeps the original workbook downloadable. The system copies worksheet tabs and line item text, then recomputes ASF, VAT, gross amount, margin, and CRP threshold for review.</p>
  </div>${ceComputationGuard(p)}${ceTable(p.id)}</div>`;
  if (tab === "Budget Requests") return crpDashboard(p);
  if (tab === "Fund Releases") return fundReleaseDashboard(p);
  if (tab === "Liquidations") return liquidationDashboard(p);
  if (tab === "Suppliers") return projectSuppliersDashboard(p);
  if (tab === "Billing") return billingDashboard(p);
  if (tab === "Post-Audit") return postAuditDashboard(p);
  if (tab === "Audit Trail") return `<div class="card audit-trail-card"><div class="section-head"><div><span class="eyebrow">Project History</span><h3>Audit Trail</h3><p>A read-only record of uploads, decisions, corrections, approvals, archives, and restorations for this project.</p></div></div><div class="timeline">${db.activity.filter(a=>a.projectId===p.id).slice().reverse().map(activityItem).join("") || `<div class="empty">No project activity recorded yet.</div>`}</div></div>`;
}

function essentialDetails(p) {
  const ce = currentCe(p.id);
  const vatExclusiveBudget = ce?.subTotal || p.totalBudget;
  return `<div class="essential-rows">
    <section class="essential-row">
      <h4>Important Dates</h4>
      <div>
        ${mini("Briefing Date", formatShortDate(p.created))}
        ${mini("Pitch Presentation Date", formatShortDate(p.pitchDate))}
        ${mini("Date Awarded", p.awardedDate ? formatShortDate(p.awardedDate) : "Not yet awarded")}
      </div>
    </section>
    <section class="essential-row">
      <h4>Project Details</h4>
      <div>
        ${mini("Event Venue", p.venue)}
        ${mini("Event Date", formatShortDate(eventDate(p)))}
        ${mini("Total Project Budget", fmt(vatExclusiveBudget))}
      </div>
    </section>
    <section class="essential-row">
      <h4>Project Financials</h4>
      <div>
        ${mini("Total Project ASF", fmt(p.asf))}
        ${mini("60% of Project Budget", fmt(vatExclusiveBudget * 0.6))}
        ${mini("40% of Project Savings", fmt(p.savings * 0.4))}
      </div>
    </section>
    <section class="essential-row brief-row">
      <h4>Brief in One Line</h4>
      <p>${p.brief}</p>
    </section>
  </div>`;
}

function manpowerList(p) {
  const rows = [
    ["Account Manager", p.owner || "Unassigned"],
    ["Project Manager", p.implementationOwner || "Unassigned"],
    ["Project Coordinator", p.projectCoordinator || "Unassigned"],
    ["Art Director", p.creativeOwner || "Unassigned"],
    ["Copywriter", p.copywriter || "Unassigned"],
    ["Graphic Artist", p.graphicArtist || creativeOwnerFor(p.id) || "Unassigned"]
  ];
  return `<div class="manpower-list">${rows.map(([role, name]) => `<div><small>${role}</small><b>${name}</b></div>`).join("")}</div>`;
}

function projectBriefData(p) {
  const c = client(p.clientId);
  const safeBrand = c.brand.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const defaults = {
    overallBudget: fmt(p.value || p.totalBudget),
    checkpoint1: p.pitchDate ? formatShortDate(p.pitchDate) : "TBD",
    checkpoint2: p.awardedDate ? formatShortDate(p.awardedDate) : "TBD",
    checkpoint3: formatShortDate(eventDate(p)),
    presentationDate: p.pitchDate ? formatShortDate(p.pitchDate) : "TBD",
    projectLine: p.brief,
    tagline: `${c.brand} campaign`,
    overview: p.brief,
    objectives: "Clarify the event requirement, audience experience, operational scope, measurable success points, and non-negotiables before CE work.",
    services: ["Event Management"],
    generalRequirements: ["Manpower", "Logistics", "Booth Fabrication", "Installation"],
    nonNegotiables: "Client approval cadence, event-date readiness, budget guardrails, and documented change requests.",
    attachments: [
      { label:"Brand Logos", value:`${safeBrand}-logo-lockups.zip`, note:"Uploaded during project creation" },
      { label:"Font Guide", value:`${safeBrand}-font-guide.pdf`, note:"Uploaded during project creation" },
      { label:"Color Palette", value:`${safeBrand}-color-palette.png`, note:"Uploaded during project creation" }
    ]
  };
  const saved = p.projectBrief || {};
  return {
    ...defaults,
    ...saved,
    services: saved.services || defaults.services,
    generalRequirements: saved.generalRequirements || defaults.generalRequirements,
    attachments: saved.attachments?.length ? saved.attachments : defaults.attachments
  };
}

function projectBriefTab(p) {
  const c = client(p.clientId);
  const brief = projectBriefData(p);
  const selectedServices = brief.services || [];
  const selectedRequirements = brief.generalRequirements || [];
  const services = ["Event Management", "Trade Marketing", "Digital Marketing", "Retail", "PR Seeding", "KOL Seeding", "Photoshoot", "Video Production", "Website Development", "Programming"];
  const requirements = ["Manpower", "Talent Management", "Logistics", "Giveaways", "Booth Fabrication", "Installation", "Permit Taking (LGU, Hotel, etc.)", "ASC / IMMAP / DTI Compliance"];
  return `<div class="brief-workspace">
    <section class="card brief-template">
      <div class="brief-left">
        <h3>Project Brief</h3>
        ${mini("Project Name", p.name)}
        ${mini("Event Date", formatShortDate(eventDate(p)))}
        ${mini("Overall Budget", brief.overallBudget)}
        ${mini("Checkpoint #1", brief.checkpoint1)}
        ${mini("Checkpoint #2", brief.checkpoint2)}
        ${mini("Checkpoint #3", brief.checkpoint3)}
        ${mini("Presentation Date", brief.presentationDate)}
      </div>
      <div class="brief-main">
        <div class="brief-band">About the Brand</div>
        <div class="brief-fact-grid">${mini("Company", c.company)}${mini("Business Unit", c.unit)}${mini("Brand", c.brand)}${mini("Tagline / Slogan", brief.tagline)}</div>
        <div class="brief-copy"><small>Overview</small><p>${brief.overview}</p></div>
        <div class="brief-copy"><small>Project Objectives</small><p>${brief.objectives}</p></div>
        <div class="brief-copy brief-one-line"><small>Project in One Line</small><p>${brief.projectLine}</p></div>
        <div class="brief-assets">
          <h4>Attached Materials</h4>
          ${briefAttachments(brief.attachments)}
        </div>
      </div>
    </section>
    <section class="card implementation-template">
      <h3>Implementation</h3>
      <div class="implementation-grid">
        <div><h4>Spotlight Services for Project</h4>${services.map(item => briefCheck(item, selectedServices.includes(item))).join("")}</div>
        <div><h4>General Requirements</h4>${requirements.map(item => briefCheck(item, selectedRequirements.includes(item))).join("")}</div>
        <div><h4>Non-negotiable Requirements from Client</h4><p>${brief.nonNegotiables}</p></div>
      </div>
    </section>
  </div>`;
}

function briefCheck(label, checked) {
  return `<div class="brief-check ${checked ? "is-checked" : ""}"><span>${checked ? "✓" : ""}</span><b>${label}</b></div>`;
}

function briefAttachment(item) {
  return `<div class="brief-attachment">${item.preview ? `<img src="${escapeHtml(item.preview)}" alt="${escapeHtml(item.label)}" />` : `<span>${materialType(item.value)}</span>`}<div><b>${item.label}</b><small>${item.value}</small><em>${item.note}</em></div></div>`;
}

function briefAttachments(items = []) {
  const attached = items.filter(item => item.value && item.value !== "Awaiting upload");
  if (!attached.length) return `<div class="brief-empty-materials">No materials attached yet.</div>`;
  return `<div>${attached.map(item => briefAttachment(item)).join("")}</div>`;
}

function fileNamesFromForm(form, field, fallback = "") {
  const names = form.getAll(field)
    .filter(file => file && typeof file.name === "string" && file.name)
    .map(file => file.name);
  return names.length ? names.join(", ") : fallback;
}

function materialType(filename = "") {
  const ext = filename.split(".").pop().toUpperCase();
  if (["PNG", "JPG", "JPEG", "WEBP", "GIF"].includes(ext)) return "IMG";
  if (["AI", "EPS", "SVG"].includes(ext)) return "ART";
  if (["TTF", "OTF", "WOFF", "WOFF2"].includes(ext)) return "FONT";
  if (ext && ext.length <= 4) return ext;
  return "FILE";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[char]));
}

function readStoredJson(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch (error) {
    return fallback;
  }
}

function isUploadedCeId(id = "") {
  return String(id).startsWith("ce-upload-");
}

function hydrateSavedCeUploads() {
  const savedVersions = readStoredJson(ceUploadStorageKey, []);
  savedVersions.forEach(ce => {
    if (!ce?.id || !ce.projectId || !isUploadedCeId(ce.id)) return;
    const existingIndex = db.ceVersions.findIndex(item => item.id === ce.id);
    if (existingIndex >= 0) db.ceVersions[existingIndex] = { ...db.ceVersions[existingIndex], ...ce };
    else db.ceVersions.push(ce);

    const restoredLines = (ce.runs || []).flatMap(run => (run.sections || []).flatMap(section =>
      (section.lines || []).map(line => ({ ...line, ceId:ce.id, category:section.title || line.category }))
    ));
    if (restoredLines.length && !db.ceLines.some(line => line.ceId === ce.id)) db.ceLines.push(...restoredLines);
  });

  readStoredJson(ceUploadFileStorageKey, []).forEach(record => {
    if (!record?.id || !record.dataUrl || !isUploadedCeId(record.id)) return;
    uploadedCeFiles.set(record.id, { ...record, downloadUrl:record.dataUrl });
  });
}

function persistSavedCeUploads() {
  try {
    localStorage.setItem(ceUploadStorageKey, JSON.stringify(db.ceVersions.filter(ce => isUploadedCeId(ce.id))));
  } catch (error) {
    // Large workbooks may exceed browser prototype storage; the live system should use secure file storage.
  }
}

function persistUploadedCeFileRecords() {
  try {
    const records = [...uploadedCeFiles.entries()]
      .filter(([id, record]) => isUploadedCeId(id) && record?.dataUrl)
      .map(([id, record]) => ({
        id,
        name:record.name,
        size:record.size,
        type:record.type,
        dataUrl:record.dataUrl,
        storedAt:record.storedAt
      }));
    localStorage.setItem(ceUploadFileStorageKey, JSON.stringify(records));
  } catch (error) {
    // Keep the session download even when the browser cannot persist the original workbook.
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result || ""));
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read file")));
    reader.readAsDataURL(file);
  });
}

async function rememberUploadedCeFile(id, file, objectUrl) {
  const record = { objectUrl, downloadUrl:objectUrl, name:file.name, size:file.size, type:file.type, storedAt:new Date().toISOString() };
  uploadedCeFiles.set(id, record);
  try {
    const dataUrl = await fileToDataUrl(file);
    uploadedCeFiles.set(id, { ...record, dataUrl, downloadUrl:dataUrl });
    persistUploadedCeFileRecords();
  } catch (error) {
    persistUploadedCeFileRecords();
  }
}

function ceOriginalFileRecord(ce) {
  return uploadedCeFiles.get(ce.id) || null;
}

function ceDownloadUrl(ce) {
  const record = ceOriginalFileRecord(ce);
  return record?.downloadUrl || record?.dataUrl || record?.objectUrl || "";
}

function ceFileSegment(value = "") {
  return normalizeCell(value).replace(/[\\/:*?"<>|]+/g, "-").replace(/_+/g, "-");
}

function ceStandardFileName(ce = {}) {
  const p = project(ce.projectId);
  if (!p) return ce.file || `${ce.version || "Cost Estimate"}.xlsx`;
  const c = client(p.clientId);
  const year = String(p.code || eventDate(p)).match(/\d{4}/)?.[0] || String(new Date().getFullYear());
  const ceNumber = projectCeNumber(p);
  return `${year}_SPOTLIGHT_CE${ceNumber}_${ceFileSegment(c?.brand || c?.company || "BRAND")}_${ceFileSegment(p.name)}.xlsx`;
}

function ceDownloadName(ce) {
  return ceStandardFileName(ce);
}

function ceFileCell(ce) {
  const safeFile = escapeHtml(ceDownloadName(ce));
  const downloadUrl = ceDownloadUrl(ce);
  if (downloadUrl) {
    return `<a class="linkbtn ce-file-download-link" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(ceDownloadName(ce))}">${safeFile}</a><span class="ce-file-hint">Original workbook</span>`;
  }
  return `<button class="linkbtn" data-review="cefile:${ce.id}">${safeFile}</button><span class="ce-file-hint">Preview only</span>`;
}

function ceDownloadAction(ce) {
  const downloadUrl = ceDownloadUrl(ce);
  if (!downloadUrl) return `<button class="btn is-disabled" type="button" disabled title="No original workbook is attached to this sample row.">Download</button>`;
  return `<a class="btn" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(ceDownloadName(ce))}">Download</a>`;
}

function isUploadedCrpId(id = "") {
  return String(id).startsWith("crp-upload-");
}

function crpRunsWithUploadContext(runs = [], uploadId = "", fileName = "") {
  return (runs || []).map(run => ({
    ...run,
    sections: (run.sections || []).map(section => ({
      ...section,
      lines: (section.lines || []).map(line => ({
        ...line,
        sourceUploadId: line.sourceUploadId || uploadId,
        sourceFile: line.sourceFile || fileName
      }))
    }))
  }));
}

function hydrateSavedCrpUploads() {
  const savedUploads = readStoredJson(crpUploadStorageKey, []);
  savedUploads.forEach(upload => {
    if (!upload?.id || !upload.projectId || !isUploadedCrpId(upload.id)) return;
    upload.runs = crpRunsWithUploadContext(upload.runs || [], upload.id, upload.file);
    const existingIndex = db.crpUploads.findIndex(item => item.id === upload.id);
    if (existingIndex >= 0) db.crpUploads[existingIndex] = { ...db.crpUploads[existingIndex], ...upload };
    else db.crpUploads.push(upload);
    (upload.requests || []).forEach(request => {
      if (!request?.id || db.budgetRequests.some(item => item.id === request.id)) return;
      db.budgetRequests.push(request);
    });
  });

  readStoredJson(crpUploadFileStorageKey, []).forEach(record => {
    if (!record?.id || !record.dataUrl || !isUploadedCrpId(record.id)) return;
    uploadedCrpFiles.set(record.id, { ...record, downloadUrl:record.dataUrl });
  });
}

function persistSavedCrpUploads() {
  try {
    const uploads = db.crpUploads.filter(upload => isUploadedCrpId(upload.id)).map(upload => ({
      ...upload,
      requests: db.budgetRequests.filter(request => request.sourceUploadId === upload.id)
    }));
    localStorage.setItem(crpUploadStorageKey, JSON.stringify(uploads));
  } catch (error) {
    // Large workbooks may exceed browser prototype storage; the live system should use secure file storage.
  }
}

function persistUploadedCrpFileRecords() {
  try {
    const records = [...uploadedCrpFiles.entries()]
      .filter(([id, record]) => isUploadedCrpId(id) && record?.dataUrl)
      .map(([id, record]) => ({
        id,
        name:record.name,
        size:record.size,
        type:record.type,
        dataUrl:record.dataUrl,
        storedAt:record.storedAt
      }));
    localStorage.setItem(crpUploadFileStorageKey, JSON.stringify(records));
  } catch (error) {
    // Keep the session download even when the browser cannot persist the original workbook.
  }
}

async function rememberUploadedCrpFile(id, file, objectUrl) {
  const record = { objectUrl, downloadUrl:objectUrl, name:file.name, size:file.size, type:file.type, storedAt:new Date().toISOString() };
  uploadedCrpFiles.set(id, record);
  try {
    const dataUrl = await fileToDataUrl(file);
    uploadedCrpFiles.set(id, { ...record, dataUrl, downloadUrl:dataUrl });
    persistUploadedCrpFileRecords();
  } catch (error) {
    persistUploadedCrpFileRecords();
  }
}

async function storedCrpFile(upload) {
  const record = uploadedCrpFiles.get(upload.id);
  const dataUrl = record?.dataUrl || record?.downloadUrl;
  if (!dataUrl || !String(dataUrl).startsWith("data:")) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], record.name || upload.file || "uploaded-crp.xlsx", { type: record.type || blob.type });
}

function replaceCrpUploadRequests(upload, scan) {
  const requests = scan.requests.map((request, index) => ({
    ...request,
    id: `br-upload-${upload.id}-${index + 1}`,
    projectId: upload.projectId,
    status: "REQUESTED",
    exception: false,
    sourceUploadId: upload.id,
    sourceVersion: upload.version,
    sourceFile: upload.file
  }));
  const runs = crpRunsWithUploadContext(scan.runs || [], upload.id, upload.file);
  db.budgetRequests = db.budgetRequests.filter(request => request.sourceUploadId !== upload.id);
  db.budgetRequests.push(...requests);
  Object.assign(upload, {
    requestIds: requests.map(request => request.id),
    scanStatus: scan.scanStatus,
    scanError: scan.scanError || "",
    issueCount: scan.issueCount || 0,
    totalAmount: scan.totalAmount,
    thresholdMarks: scan.thresholdMarks || 0,
    actualizedSummary: scan.actualizedSummary || null,
    runs,
    requests
  });
}

async function rescanStoredCrpUploads() {
  const uploads = db.crpUploads.filter(upload => isUploadedCrpId(upload.id) && !upload.runs?.length && !crpRescanAttempted.has(upload.id));
  if (!uploads.length) return;
  let changed = false;
  for (const upload of uploads) {
    crpRescanAttempted.add(upload.id);
    try {
      const file = await storedCrpFile(upload);
      const p = project(upload.projectId);
      if (!file || !p) continue;
      const scan = await scanCrpWorkbook(file, p);
      replaceCrpUploadRequests(upload, scan);
      changed = true;
    } catch (error) {
      upload.scanError = error.message || "Stored CRP workbook could not be re-scanned.";
      upload.scanStatus = "Stored workbook needs upload";
      upload.issueCount = upload.issueCount || 1;
      changed = true;
    }
  }
  if (changed) {
    persistSavedCrpUploads();
    render();
  }
}

function crpOriginalFileRecord(upload) {
  return uploadedCrpFiles.get(upload.id) || null;
}

function crpDownloadUrl(upload) {
  const record = crpOriginalFileRecord(upload);
  return record?.downloadUrl || record?.dataUrl || record?.objectUrl || "";
}

function crpDownloadName(upload) {
  return crpOriginalFileRecord(upload)?.name || upload.file || `${upload.version || "CRP"}.xlsx`;
}

function crpFileCell(upload) {
  const safeFile = escapeHtml(upload.file || crpDownloadName(upload));
  const downloadUrl = crpDownloadUrl(upload);
  if (downloadUrl) {
    return `<a class="linkbtn ce-file-download-link" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(crpDownloadName(upload))}">${safeFile}</a><span class="ce-file-hint">Original workbook</span>`;
  }
  return `<button class="linkbtn" data-review="crpfile:${upload.id}">${safeFile}</button><span class="ce-file-hint">Preview only</span>`;
}

function crpDownloadAction(upload) {
  const downloadUrl = crpDownloadUrl(upload);
  if (!downloadUrl) return `<button class="btn is-disabled" type="button" disabled title="No original workbook is attached to this sample row.">Download</button>`;
  return `<a class="btn" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(crpDownloadName(upload))}">Download</a>`;
}

function normalizeCell(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function keyCell(value) {
  return normalizeCell(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = normalizeCell(value);
  if (!text) return 0;
  const negative = /^\(.*\)$/.test(text);
  const cleaned = text.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? (negative ? -amount : amount) : 0;
}

function formatMoneyInput(value) {
  const raw = String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, "");
  if (!raw) return "";
  const negative = raw.startsWith("-");
  const unsigned = raw.replace(/-/g, "");
  const hasDecimal = unsigned.includes(".");
  const [wholePart = "0", ...decimalParts] = unsigned.split(".");
  const whole = (wholePart.replace(/^0+(?=\d)/, "") || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = decimalParts.join("").slice(0, 2);
  return `${negative ? "-" : ""}${whole}${hasDecimal ? `.${decimals}` : ""}`;
}

function bindMoneyInputs(root = document) {
  root.querySelectorAll("[data-money-input]").forEach(input => {
    if (input.dataset.moneyBound === "true") return;
    input.dataset.moneyBound = "true";
    input.inputMode = "decimal";
    input.value = formatMoneyInput(input.value);
    input.addEventListener("input", () => {
      const formatted = formatMoneyInput(input.value);
      if (formatted !== input.value) input.value = formatted;
    });
    input.addEventListener("blur", () => { input.value = formatMoneyInput(input.value); });
  });
}

function fieldPromptMessage(field) {
  if (field.dataset.requiredMessage) return field.dataset.requiredMessage;
  if (field.type === "file") return "Please upload the required file.";
  if (field.type === "checkbox") return "Please confirm this item before continuing.";
  return "Please complete this required field.";
}

function clearFieldPrompt(field) {
  field.closest("label")?.querySelector(":scope > .field-error-message")?.remove();
  field.classList.remove("field-has-error");
}

function showFieldPrompt(field, message = "") {
  const label = field.closest("label");
  if (!label) return;
  clearFieldPrompt(field);
  const prompt = document.createElement("small");
  prompt.className = "field-error-message";
  prompt.textContent = message || field.validationMessage || fieldPromptMessage(field);
  label.appendChild(prompt);
  field.classList.add("field-has-error");
}

function bindRequiredFieldPrompts(root = document) {
  root.querySelectorAll("form").forEach(form => {
    form.addEventListener("invalid", event => {
      event.preventDefault();
      showFieldPrompt(event.target, fieldPromptMessage(event.target));
    }, true);
    form.addEventListener("input", event => {
      const field = event.target.closest("input, select, textarea");
      if (field && field.checkValidity()) clearFieldPrompt(field);
    });
    form.addEventListener("change", event => {
      const field = event.target.closest("input, select, textarea");
      if (field && field.checkValidity()) clearFieldPrompt(field);
    });
  });
}

function valueAt(row, index) {
  return index >= 0 ? row[index] : "";
}

function crpRunDisplayName(name = "") {
  if (/^mnl$/i.test(name)) return "MANILA";
  if (/^ceb$/i.test(name)) return "CEBU";
  return name || "Run";
}

function isCrpSummarySheet(name = "") {
  return /actualized|summary/i.test(name);
}

function crpFindColumn(row = [], patterns = []) {
  const keys = row.map(keyCell);
  return keys.findIndex(key => patterns.some(pattern => pattern.test(key)));
}

function crpTemplateColumns(header = [], requestHeader = []) {
  const base = ceTemplateColumns(header);
  const find = patterns => crpFindColumn(requestHeader, patterns);
  const actual = find([/^actual is$/, /^actual$/, /^requested$/, /^total request$/]);
  return {
    ...base,
    budget40: find([/40.*(is|inc|internal)|^40$/]),
    budget60: find([/60.*(working|expense|exp|budget)|^60$/]),
    cash: find([/^cash$/]),
    cheque: find([/^cheque$/, /^check$/]),
    actual,
    variance: actual >= 0 ? actual + 1 : -1,
    recipient: find([/^recipient$/, /^payee$/, /^released to$/]),
    auditRemarks: find([/^audit remarks?$/, /^remarks?$/]),
    quotation: find([/^quotation$/, /^quote$/, /^supplier quotation$/])
  };
}

function crpRawValues(row, columns, no, particulars) {
  return {
    ...ceRawValues(row, columns, no, particulars),
    budget40: normalizeCell(row[columns.budget40]),
    budget60: normalizeCell(row[columns.budget60]),
    cash: normalizeCell(row[columns.cash]),
    cheque: normalizeCell(row[columns.cheque]),
    actual: normalizeCell(row[columns.actual]),
    variance: normalizeCell(row[columns.variance]),
    recipient: normalizeCell(row[columns.recipient]),
    auditRemarks: normalizeCell(row[columns.auditRemarks]),
    quotation: normalizeCell(row[columns.quotation])
  };
}

function crpRowMoney(row, columns) {
  return {
    budget40: parseMoney(row[columns.budget40]),
    budget60: parseMoney(row[columns.budget60]),
    cash: parseMoney(row[columns.cash]),
    cheque: parseMoney(row[columns.cheque]),
    actual: parseMoney(row[columns.actual])
  };
}

function crpRowHasRequest(money = {}) {
  return Boolean(money.cash || money.cheque || money.actual);
}

function crpActualRawPresent(line) {
  return normalizeCell(line.rawValues?.actual) !== "";
}

function crpLineAmountOverride(line) {
  const override = crpDecisionRecord(crpDecisionKey(line)).amountOverride;
  return Number.isFinite(override) ? roundCent(override) : null;
}

function crpEffectiveCashRequest(line) {
  const override = crpLineAmountOverride(line);
  const cash = Number(line.cashRequest) || 0;
  const cheque = Number(line.chequeRequest) || 0;
  if (override !== null && cash > 0 && !cheque) return override;
  return cash;
}

function crpEffectiveChequeRequest(line) {
  const override = crpLineAmountOverride(line);
  const cash = Number(line.cashRequest) || 0;
  const cheque = Number(line.chequeRequest) || 0;
  if (override !== null && cheque > 0 && !cash) return override;
  return cheque;
}

function crpLineExpectedRequestAmount(line) {
  return roundCent(crpEffectiveCashRequest(line) + crpEffectiveChequeRequest(line));
}

function crpLineRequestAmount(line) {
  const decision = crpDecisionRecord(crpDecisionKey(line));
  if (Number.isFinite(decision.amountOverride)) return roundCent(decision.amountOverride);
  if (Number.isFinite(line.requestAmount)) return roundCent(line.requestAmount);
  return roundCent(Number(line.amount) || 0);
}

function crpLineRequested(line) {
  const requestAmount = Math.abs(crpLineRequestAmount(line));
  const splitAmount = Math.abs(crpLineExpectedRequestAmount(line));
  const uploadedActual = Math.abs(parseMoney(line.rawValues?.actual));
  return Boolean(requestAmount > 0 || splitAmount > 0 || uploadedActual > 0);
}

function crpLineExpectedSplit(line) {
  const ceAmount = roundCent(Number(line.selling ?? line.ceSubTotal) || 0);
  return {
    budget40: roundCent(ceAmount * 0.4),
    budget60: roundCent(ceAmount * 0.6)
  };
}

function crpAmountIssue(issues, label, expected, actual, rawValue, options = {}) {
  if (normalizeCell(rawValue) === "") {
    if (options.required && Math.abs(expected) > 1) issues.push(`${label} is blank; should be ${fmtDetailed(expected)}`);
    return;
  }
  if (Math.abs(roundCent(actual) - roundCent(expected)) <= 1) return;
  issues.push(`${label} should be ${fmtDetailed(expected)}; uploaded ${fmtDetailed(actual)}`);
}

function crpLineComputationIssues(line) {
  if (line.groupHeader) return [];
  const issues = [];
  const expectedSplit = crpLineExpectedSplit(line);
  if (Number(line.selling || line.ceSubTotal) > 0) {
    crpAmountIssue(issues, "40% IS", expectedSplit.budget40, line.budget40, line.rawValues?.budget40, { required: true });
    crpAmountIssue(issues, "60% Working Budget", expectedSplit.budget60, line.workingBudget60, line.rawValues?.budget60, { required: true });
  }
  if (crpLineRequested(line)) {
    crpAmountIssue(issues, "Actual request", crpLineExpectedRequestAmount(line), crpLineRequestAmount(line), line.rawValues?.actual, { required: true });
  }
  return issues;
}

function crpSupportValueMissing(value = "") {
  const text = keyCell(value);
  return !text || /pending|to follow|placeholder|for approval|no supplier|tbd|n a|none/.test(text);
}

function crpSupportIssues(line) {
  if (!crpLineRequested(line)) return [];
  const issues = [];
  const party = crpCounterpartyRecord(line);
  if ((Number(line.cashRequest) || 0) > 0 && crpSupportValueMissing(party.custodian)) issues.push("Cash release needs a Spotlight employee");
  if ((Number(line.chequeRequest) || 0) > 0 && crpSupportValueMissing(party.provider)) issues.push("Cheque release needs a provider name and quote");
  if (party.mixed) issues.push("Separate the cash custodian and final provider");
  return issues;
}

function crpLineIssueText(line) {
  const issues = [...crpLineComputationIssues(line), ...crpSupportIssues(line)];
  if (issues.length) return [`Needs review`, ...issues].join(" · ");
  if (crpLineRequested(line) && crpLineThresholdExceeded(line)) return "";
  return "";
}

function crpLineThresholdExceeded(line) {
  const request = crpLineRequestAmount(line);
  const limit = Number(line.workingBudget60) || 0;
  return Boolean(request && limit && request > limit + 1);
}

function crpLineSupportLabel(line) {
  if (!crpLineRequested(line)) return { label:"No request", tone:"active", issue:false };
  const issues = crpSupportIssues(line);
  if (issues.length) return { label:issues.length > 1 ? "Support needed" : issues[0].replace(/^(Cash|Cheque) release needs a /, "Missing "), tone:"warn", issue:true };
  return { label:"Support set", tone:"good", issue:false };
}

function parseCrpActualizedSummary(sheet) {
  if (!sheet) return null;
  const rows = sheet.rows || [];
  const headerIndex = rows.findIndex(row => row && keyCell(row.join(" ")).includes("total 40") && keyCell(row.join(" ")).includes("total 60"));
  if (headerIndex < 0) return null;
  const header = rows[headerIndex] || [];
  const col = {
    total40: crpFindColumn(header, [/total 40|40.*inc/]),
    total60: crpFindColumn(header, [/total 60|60.*exp/]),
    subTotal: crpFindColumn(header, [/sub.?total/]),
    cash: crpFindColumn(header, [/total cash/]),
    cheque: crpFindColumn(header, [/total (check|cheque)/]),
    totalExpense: crpFindColumn(header, [/total expense/]),
    primaryInternal: crpFindColumn(header, [/iv from sub.?total/]),
    primaryExpense: crpFindColumn(header, [/ev from sub.?total/]),
    secondaryInternal: crpFindColumn(header, [/iv from 60/]),
    secondaryExpense: crpFindColumn(header, [/ev from 60/])
  };
  const entries = rows.slice(headerIndex + 1, headerIndex + 8).map((row = [], offset) => {
    const label = normalizeCell(row[0]);
    if (!label) return null;
    return {
      label,
      sourceRow: headerIndex + offset + 2,
      total40: parseMoney(row[col.total40]),
      total60: parseMoney(row[col.total60]),
      subTotal: parseMoney(row[col.subTotal]),
      cash: parseMoney(row[col.cash]),
      cheque: parseMoney(row[col.cheque]),
      totalExpense: parseMoney(row[col.totalExpense]),
      primaryInternal: Number(row[col.primaryInternal]) || 0,
      primaryExpense: Number(row[col.primaryExpense]) || 0,
      secondaryInternal: Number(row[col.secondaryInternal]) || 0,
      secondaryExpense: Number(row[col.secondaryExpense]) || 0
    };
  }).filter(Boolean);
  return entries.length ? { sheetName: sheet.name, entries } : null;
}

function parseCrpRunSheet(sheetName, rows = []) {
  if (isCrpSummarySheet(sheetName)) return { name: crpRunDisplayName(sheetName), sourceSheet: sheetName, sections: [] };
  const headerIndex = rows.findIndex((row, index) => row && keyCell(row.join(" ")).includes("particulars") && keyCell(row.join(" ")).includes("unit cost") && keyCell((rows[index + 1] || []).join(" ")).includes("60"));
  if (headerIndex < 0) return { name: crpRunDisplayName(sheetName), sourceSheet: sheetName, sections: [] };
  const columns = crpTemplateColumns(rows[headerIndex] || [], rows[headerIndex + 1] || []);
  const sections = [];
  let currentSection = null;
  let currentGroup = "";
  rows.slice(headerIndex + 1).forEach((row = [], offset) => {
    const sourceRow = headerIndex + offset + 2;
    const rowText = keyCell(row.join(" "));
    if (!rowText || /prepared by|approved by/.test(rowText)) return;
    if (/terms and conditions/.test(rowText)) return;
    const particulars = ceParticularsText(row, columns);
    if (!particulars) return;
    const no = ceNoText(row, columns, particulars);
    const money = ceRowMoney(row, columns);
    const crpMoney = crpRowMoney(row, columns);
    const rawValues = crpRawValues(row, columns, no, particulars);
    if (isCeSectionRow(no, particulars, money)) {
      currentSection = { title: particulars, sourceRow, totals: ceTotalsFromRow(money, rawValues), lines: [] };
      sections.push(currentSection);
      currentGroup = "";
      return;
    }
    if (!currentSection) {
      currentSection = { title: "Unsectioned", sourceRow, totals: { projectCost:0, asf:0, total:0 }, lines: [] };
      sections.push(currentSection);
    }
    const hasAmount = ceRowHasAmount(money);
    const hasRequest = crpRowHasRequest(crpMoney);
    if (!hasAmount && !hasRequest && !/^-|^•|^>/.test(particulars)) {
      currentGroup = particulars;
      currentSection.lines.push({
        sourceRow,
        sourceSheet: sheetName,
        groupHeader: true,
        group: currentGroup,
        description: particulars,
        rawValues,
        parsedFromTemplate: true
      });
      return;
    }
    const requestAmount = roundCent(crpMoney.actual || 0);
    currentSection.lines.push({
      sourceRow,
      sourceSheet: sheetName,
      runName: crpRunDisplayName(sheetName),
      sectionTitle: currentSection.title,
      group: currentGroup,
      description: particulars.replace(/^[-•]\s*/, ""),
      remarks: normalizeCell(row[columns.remarks]),
      rawValues,
      qty: money.qty || "",
      unit: money.unit || "",
      freq: money.freq || "",
      mandays: money.mandays || "",
      months: money.months || "",
      unitCost: money.unitCost || 0,
      selling: money.subTotal || 0,
      ceSubTotal: money.subTotal || 0,
      asfAmount: money.asf || 0,
      totalAmount: money.total || 0,
      budget40: crpMoney.budget40 || 0,
      workingBudget60: crpMoney.budget60 || 0,
      cashRequest: crpMoney.cash || 0,
      chequeRequest: crpMoney.cheque || 0,
      requestAmount,
      amount: requestAmount,
      recipient: normalizeCell(row[columns.recipient]),
      auditRemarks: normalizeCell(row[columns.auditRemarks]),
      quotation: normalizeCell(row[columns.quotation]),
      parsedFromTemplate: true
    });
  });
  return { name: crpRunDisplayName(sheetName), sourceSheet: sheetName, sections: sections.filter(section => section.lines.length || section.totals.projectCost) };
}

function crpRunRequestLines(run = {}) {
  return (run.sections || []).flatMap(section => (section.lines || []).filter(line => !line.groupHeader && crpLineRequested(line)));
}

function crpRunsIssueCount(runs = []) {
  return runs.reduce((sum, run) => sum + (run.sections || []).reduce((sectionSum, section) => sectionSum + (section.lines || []).reduce((lineSum, line) => lineSum + crpLineComputationIssues(line).length + crpSupportIssues(line).length, 0), 0), 0);
}

function crpLineToRequest(line, projectId) {
  const releaseType = line.cashRequest && line.chequeRequest ? "Cash + Cheque" : line.chequeRequest ? "Cheque" : "Cash";
  return {
    ...line,
    projectId,
    holder: line.group || line.sectionTitle || "PRODUCTION / IMPLEMENTATION",
    requestor: currentUser(),
    category: line.description || line.sectionTitle || "Budget Request",
    description: [line.remarks, line.sectionTitle].filter(Boolean).join(" · "),
    amount: crpLineRequestAmount(line),
    expectedAmount: crpLineExpectedRequestAmount(line),
    releaseType,
    dateRequired: dashboardToday,
    issueMessages: crpLineIssueText(line)
  };
}

async function scanCrpWorkbook(file, p) {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Only .xlsx CRP template scanning is available in this prototype.");
  const workbook = await readXlsxWorkbook(file);
  const actualizedSummary = parseCrpActualizedSummary(workbook.sheets.find(sheet => isCrpSummarySheet(sheet.name)));
  const runs = workbook.sheets.map(sheet => parseCrpRunSheet(sheet.name, sheet.rows)).filter(run => run.sections.length);
  if (!runs.length) throw new Error("No CRP run worksheets were found.");
  const requests = runs.flatMap(run => crpRunRequestLines(run).map(line => crpLineToRequest(line, p.id)));
  const issueCount = crpRunsIssueCount(runs);
  const totalAmount = roundCent(requests.reduce((sum, request) => sum + crpLineRequestAmount(request), 0));
  const thresholdMarks = requests.filter(crpRequestBeyondThreshold).length;
  return {
    requests,
    runs,
    actualizedSummary,
    issueCount,
    thresholdMarks,
    totalAmount,
    scanStatus: issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : "Template scan matched"
  };
}

function fallbackCrpScan(file, p, error) {
  return {
    requests: [{
      projectId: p.id,
      holder: "PRODUCTION / IMPLEMENTATION",
      requestor: currentUser(),
      category: "Workbook attachment",
      description: `${file.name} was attached, but this browser could not read CRP rows.`,
      amount: 0,
      expectedAmount: 0,
      releaseType: "Cash",
      recipient: currentUser(),
      quotation: "",
      dateRequired: dashboardToday,
      sourceSheet: "Uploaded workbook",
      sourceRow: ""
    }],
    issueCount: 1,
    totalAmount: 0,
    scanStatus: "Workbook attached; row copy unavailable",
    scanError: error.message || "The workbook could not be parsed in this browser."
  };
}

async function scanCeWorkbook(file, fallbackGross, p) {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Only .xlsx template scanning is available in this prototype.");
  const workbook = await readXlsxWorkbook(file);
  const runs = workbook.sheets
    .map(sheet => parseCeSheet(sheet.name, sheet.rows))
    .filter(run => run.sections.length);
  if (!runs.length) throw new Error("No Spotlight CE table headers were found.");
  const totals = aggregateRunFinancials(runs);
  const computed = totals.projectCost > 0 ? ceFinancialsFromCost(totals.projectCost) : ceFinancialsFromGross(fallbackGross);
  const fileGross = roundCent(runs.reduce((sum, run) => sum + (run.fileGross || 0), 0));
  const variance = fileGross ? roundCent(computed.grandTotal - fileGross) : 0;
  const issueCount = ceWorkbookIssueCount(runs);
  return {
    runs,
    computed,
    fileGross: fileGross || null,
    variance,
    issueCount,
    scanStatus: issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : fileGross ? (Math.abs(variance) > 1 ? "Needs review" : "Template scan matched") : "Template rows captured"
  };
}

async function readXlsxWorkbook(file) {
  const entries = await unzipXlsx(file);
  const workbookXml = xmlDocument(decodeEntry(entries, "xl/workbook.xml"));
  const relsXml = xmlDocument(decodeEntry(entries, "xl/_rels/workbook.xml.rels"));
  const sharedStrings = entries.has("xl/sharedStrings.xml")
    ? parseSharedStrings(xmlDocument(decodeEntry(entries, "xl/sharedStrings.xml")))
    : [];
  const rels = Object.fromEntries(xmlNodes(relsXml, "Relationship").map(rel => [rel.getAttribute("Id"), resolveWorkbookTarget(rel.getAttribute("Target") || "")]));
  const sheets = xmlNodes(workbookXml, "sheet").map(sheet => {
    const relId = sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const path = rels[relId];
    return path && entries.has(path)
      ? { name: sheet.getAttribute("name") || "Sheet", rows: parseWorksheetRows(xmlDocument(decodeEntry(entries, path)), sharedStrings) }
      : null;
  }).filter(Boolean);
  return { sheets };
}

async function unzipXlsx(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocd = findZipEnd(view);
  const entryCount = view.getUint16(eocd + 10, true);
  let pointer = view.getUint32(eocd + 16, true);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) throw new Error("Invalid workbook directory.");
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const fileNameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = new TextDecoder().decode(bytes.slice(pointer + 46, pointer + 46 + fileNameLength)).replace(/^\/+/, "");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? new Uint8Array(await inflateZipEntry(compressed)) : null;
    if (!data) throw new Error(`Unsupported workbook compression method ${method}.`);
    entries.set(name, data);
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function findZipEnd(view) {
  const min = Math.max(0, view.byteLength - 65557);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("Workbook zip directory was not found.");
}

async function inflateZipEntry(compressed) {
  if (typeof DecompressionStream === "undefined") throw new Error("Workbook decompression is not available in this browser.");
  try {
    return await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
  } catch (error) {
    return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
  }
}

function decodeEntry(entries, path) {
  const data = entries.get(path);
  if (!data) throw new Error(`${path} was not found in workbook.`);
  return new TextDecoder("utf-8").decode(data);
}

function xmlDocument(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Workbook XML could not be read.");
  return doc;
}

function xmlNodes(root, tag) {
  return Array.from(root.getElementsByTagNameNS("*", tag));
}

function resolveWorkbookTarget(target) {
  const clean = target.replace(/^\/+/, "").replace(/^\.\//, "");
  return clean.startsWith("xl/") ? clean : `xl/${clean}`;
}

function parseSharedStrings(doc) {
  return xmlNodes(doc, "si").map(node => xmlNodes(node, "t").map(t => t.textContent || "").join(""));
}

function parseWorksheetRows(doc, sharedStrings) {
  const rows = [];
  xmlNodes(doc, "row").forEach((rowNode, fallbackIndex) => {
    const rowNumber = Number(rowNode.getAttribute("r")) || fallbackIndex + 1;
    const row = [];
    xmlNodes(rowNode, "c").forEach(cell => {
      const ref = cell.getAttribute("r") || "";
      const col = columnIndex((ref.match(/[A-Z]+/) || [""])[0]) ?? row.length;
      row[col] = cellValue(cell, sharedStrings);
    });
    rows[rowNumber - 1] = row;
  });
  return rows;
}

function columnIndex(letters) {
  if (!letters) return null;
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function cellValue(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  const value = xmlNodes(cell, "v")[0]?.textContent ?? "";
  if (type === "s") return sharedStrings[Number(value)] || "";
  if (type === "inlineStr") return xmlNodes(cell, "t").map(t => t.textContent || "").join("");
  if (type === "str") return value;
  const numeric = Number(value);
  return value !== "" && Number.isFinite(numeric) ? numeric : value;
}

function parseCeSheet(name, rows) {
  const headerIndex = rows.findIndex(row => row && keyCell(row.join(" ")).includes("particulars") && keyCell(row.join(" ")).includes("unit cost"));
  if (headerIndex < 0) return { name, sections: [], fileGross: 0, footerTotals: {} };
  const columns = ceTemplateColumns(rows[headerIndex]);
  const sections = [];
  let currentSection = null;
  let currentGroup = "";
  let fileGross = 0;
  const footerTotals = {};
  rows.slice(headerIndex + 1).forEach((row = [], offset) => {
    const sourceRow = headerIndex + offset + 2;
    const rowText = keyCell(row.join(" "));
    const footerTotal = ceFooterTotal(row, sourceRow);
    if (footerTotal) {
      footerTotals[footerTotal.kind] = footerTotal;
      if (footerTotal.kind === "grandTotal") fileGross = footerTotal.amount;
      return;
    }
    const gross = grossFromRow(row);
    if (gross) fileGross = gross;
    if (/prepared by|approved by|terms and conditions/.test(rowText)) return;
    const particulars = ceParticularsText(row, columns);
    if (!particulars) return;
    const no = ceNoText(row, columns, particulars);
    const money = ceRowMoney(row, columns);
    const rawValues = ceRawValues(row, columns, no, particulars);
    if (isCeSectionRow(no, particulars, money)) {
      currentSection = { title: particulars, sourceRow, totals: ceTotalsFromRow(money, rawValues), lines: [] };
      sections.push(currentSection);
      currentGroup = "";
      return;
    }
    if (!currentSection) {
      currentSection = { title: "Unsectioned", sourceRow, totals: { projectCost:0, asf:0, total:0 }, lines: [] };
      sections.push(currentSection);
    }
    if (!ceRowHasAmount(money) && !/^-|^•/.test(particulars)) {
      currentGroup = particulars;
      currentSection.lines.push({
        sourceRow,
        groupHeader: true,
        group: currentGroup,
        description: particulars,
        rawValues,
        parsedFromTemplate: true
      });
      return;
    }
    currentSection.lines.push({
      sourceRow,
      group: currentGroup,
      description: particulars.replace(/^[-•]\s*/, ""),
      remarks: normalizeCell(row[columns.remarks]),
      rawValues,
      qty: money.qty || "",
      unit: money.unit || "",
      freq: money.freq || "",
      mandays: money.mandays || "",
      months: money.months || "",
      unitCost: money.unitCost || 0,
      selling: money.subTotal || 0,
      asfAmount: money.asf || 0,
      totalAmount: money.total || 0,
      supplier: "",
      parsedFromTemplate: true
    });
  });
  return { name, sections: sections.filter(section => section.lines.length || section.totals.projectCost), fileGross, footerTotals };
}

function ceTemplateColumns(header = []) {
  const keys = header.map(keyCell);
  const find = predicate => keys.findIndex(predicate);
  let no = find(key => key === "no" || key === "no.");
  let particulars = find(key => key.includes("particulars"));
  const qty = find(key => key === "qty");
  let remarks = find(key => key.includes("remarks"));
  if (particulars < 0) particulars = no >= 0 ? no + 1 : 1;
  if (no < 0) no = Math.max(0, particulars - 1);
  if (particulars <= no) particulars = no + 1;
  if (remarks < 0 && qty > particulars) remarks = qty - 1;
  return {
    no,
    particulars,
    remarks,
    qty,
    unit: find(key => key === "unit"),
    freq: find(key => key === "freq"),
    mandays: find(key => key.includes("manday")),
    months: find(key => key.includes("month")),
    unitCost: find(key => key.includes("unit cost")),
    subTotal: find(key => key.includes("sub total")),
    asf: find(key => key.includes("asf")),
    total: find(key => key === "total")
  };
}

function ceParticularsText(row, columns) {
  const primary = normalizeCell(row[columns.particulars]);
  if (primary && !/^\d+$/.test(primary)) return primary;
  const start = Math.max(0, columns.no + 1, columns.particulars);
  const stopBefore = columns.remarks > start ? columns.remarks : Math.min(row.length, start + 4);
  for (let index = start; index < stopBefore; index += 1) {
    const value = normalizeCell(row[index]);
    if (value && !/^\d+$/.test(value)) return value;
  }
  return primary;
}

function ceNoText(row, columns, particulars) {
  const no = normalizeCell(row[columns.no]);
  if (no && no !== particulars) return no;
  const firstCell = normalizeCell(row[0]);
  return /^\d+$/.test(firstCell) && firstCell !== particulars ? firstCell : no;
}

function ceRawValues(row, columns, no, particulars) {
  return {
    no,
    particulars,
    remarks: normalizeCell(row[columns.remarks]),
    qty: normalizeCell(row[columns.qty]),
    unit: normalizeCell(row[columns.unit]),
    freq: normalizeCell(row[columns.freq]),
    mandays: normalizeCell(row[columns.mandays]),
    months: normalizeCell(row[columns.months]),
    unitCost: normalizeCell(row[columns.unitCost]),
    subTotal: normalizeCell(row[columns.subTotal]),
    asf: normalizeCell(row[columns.asf]),
    total: normalizeCell(row[columns.total])
  };
}

function ceRowMoney(row, columns) {
  return {
    qty: parseMoney(row[columns.qty]),
    unit: normalizeCell(row[columns.unit]),
    freq: parseMoney(row[columns.freq]),
    mandays: parseMoney(row[columns.mandays]),
    months: parseMoney(row[columns.months]),
    unitCost: parseMoney(row[columns.unitCost]),
    subTotal: parseMoney(row[columns.subTotal]),
    asf: parseMoney(row[columns.asf]),
    total: parseMoney(row[columns.total])
  };
}

function isCeSectionRow(no, particulars, money) {
  return /^\d+$/.test(no) && Boolean(particulars) && ceRowHasAmount(money);
}

function ceRowHasAmount(money) {
  return Boolean(money.unitCost || money.subTotal || money.asf || money.total);
}

function ceTotalsFromRow(money, rawValues = {}) {
  const unitCost = roundCent(money.unitCost || 0);
  const projectCost = roundCent(money.subTotal || unitCost || 0);
  const asf = roundCent(money.asf || projectCost * settings.asfDefault);
  const total = roundCent(money.total || projectCost + asf);
  return { unitCost, projectCost, asf, total, rawValues };
}

function grossFromRow(row) {
  const rowText = keyCell(row.join(" "));
  if (!/(grand total|gross amount|total amount|amount due)/.test(rowText)) return 0;
  return [...row].reverse().map(parseMoney).find(value => value > 0) || 0;
}

function ceFooterTotal(row, sourceRow) {
  const cells = row.map(normalizeCell);
  const keys = cells.map(keyCell);
  let kind = "";
  if (keys.some(key => key === "grand total")) kind = "grandTotal";
  else if (keys.some(key => key === "vat 12" || key === "vat")) kind = "vat";
  else if (keys.some(key => key === "sub total" || key === "subtotal")) kind = "subTotal";
  if (!kind) return null;
  const amount = [...row].reverse().map(parseMoney).find(value => Math.abs(value) > 0) || 0;
  return { kind, sourceRow, amount, label: kind === "grandTotal" ? "Grand Total" : kind === "vat" ? "VAT 12%" : "Sub-total", rawValue: amount };
}

function sectionFinancials(section) {
  const amountLines = section.lines.filter(line => !line.groupHeader && !ceLineIsMenuReference(line));
  const unitCost = roundCent(section.lines.filter(line => !line.groupHeader).reduce((sum, line) => sum + (line.unitCost || 0), 0));
  const fromLines = roundCent(amountLines.reduce((sum, line) => sum + ceLineExpectedAmounts(line).subTotal, 0));
  const projectCost = roundCent(fromLines || section.totals?.projectCost || 0);
  const asf = roundCent(projectCost * settings.asfDefault);
  return { unitCost, projectCost, asf, total: roundCent(projectCost + asf) };
}

function sectionUploadedFinancials(section) {
  const totals = section.totals || {};
  const raw = totals.rawValues || null;
  const rawMoney = key => {
    if (!raw) return null;
    const value = normalizeCell(raw[key]);
    return value === "" ? 0 : roundCent(parseMoney(value));
  };
  return {
    unitCost: raw ? rawMoney("unitCost") : roundCent(totals.unitCost || 0),
    projectCost: raw ? rawMoney("subTotal") : roundCent(totals.projectCost || 0),
    asf: raw ? rawMoney("asf") : roundCent(totals.asf || 0),
    total: raw ? rawMoney("total") : roundCent(totals.total || 0)
  };
}

function runFinancials(run) {
  return ceFinancialsFromCost(roundCent(run.sections.reduce((sum, section) => sum + sectionFinancials(section).projectCost, 0)));
}

function aggregateRunFinancials(runs) {
  return ceFinancialsFromCost(roundCent(runs.reduce((sum, run) => sum + runFinancials(run).projectCost, 0)));
}

function fallbackCeScan(file, p, fallbackGross, error) {
  const computed = ceFinancialsFromGross(fallbackGross);
  const sections = [{
    title: "Workbook attachment",
    sourceRow: "",
    totals: ceTotalsFromRow({ subTotal: computed.projectCost }),
    lines: [
      {
        sourceRow: "",
        groupHeader: true,
        description: "Line item copy unavailable in this preview",
        parsedFromTemplate: true
      },
      {
        sourceRow: "",
        group: "Attached file",
        description: `${file.name} was attached, but this browser could not read the workbook rows. Upload a clean .xlsx export so the system can copy every CE line item directly from the template.`,
        remarks: "No generic fallback lines were created",
        qty: "",
        unit: "",
        freq: "",
        mandays: "",
        months: "",
        unitCost: 0,
        selling: 0,
        parsedFromTemplate: true
      }
    ]
  }];
  return {
    runs: [{ name: "Uploaded workbook", sections }],
    computed,
    fileGross: computed.grandTotal,
    variance: 0,
    scanStatus: "Workbook attached; row copy unavailable",
    scanError: error.message || "The workbook could not be parsed in this browser."
  };
}

function ceTable(projectId) {
  const rows = db.ceVersions
    .map((ce, index) => ({ ce, index }))
    .filter(({ ce }) => ce.projectId === projectId)
    .sort((a, b) => b.index - a.index)
    .map(({ ce }) => ce);
  if (!rows.length) return `<div class="empty">No CE uploaded yet</div>`;
  return `<div class="ce-version-scroll"><table class="ce-version-table">
    <colgroup>
      <col class="ce-col-version" />
      <col class="ce-col-file" />
      <col class="ce-col-type" />
      <col class="ce-col-scan" />
      <col class="ce-col-project-cost" />
      <col class="ce-col-asf" />
      <col class="ce-col-vat" />
      <col class="ce-col-gross" />
      <col class="ce-col-status" />
    </colgroup>
    <thead><tr><th>Version</th><th>File</th><th>Type</th><th>Scan</th><th>Project Cost</th><th>ASF</th><th>VAT</th><th>Gross Amount</th><th>Status</th></tr></thead>
    <tbody>${rows.map(c => {
      const computed = ceFinancials(c);
      const canDelete = canDeleteCeVersion(c);
      const issueCount = c.runs?.length ? ceWorkbookIssueCount(c.runs) : (c.issueCount || 0);
      const scanStatus = issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : (c.scanStatus || "Manual");
      return `<tr>
        <td data-label="Version"><b>${escapeHtml(c.version)}</b></td>
        <td class="ce-file-cell" data-label="File">${ceFileCell(c)}</td>
        <td data-label="Type">${c.addendum ? chip("Addendum CE","warn") : chip("Base CE","active")}</td>
        <td data-label="Scan">${ceScanChip(compactCeScanStatus(scanStatus))}</td>
        <td class="ce-money-cell" data-label="Project Cost">${fmtDetailed(computed.projectCost)}</td>
        <td class="ce-money-cell" data-label="ASF">${fmtDetailed(computed.asf)}</td>
        <td class="ce-money-cell" data-label="VAT">${fmtDetailed(computed.vat)}</td>
        <td class="ce-money-cell" data-label="Gross Amount"><b>${fmtDetailed(computed.grandTotal)}</b></td>
        <td data-label="Status">${chip(c.status)}</td>
      </tr>
      <tr class="ce-version-actions-row"><td colspan="9"><span>Actions</span><div class="ce-action-cell"><button class="btn" data-review="cefile:${c.id}">View</button>${ceDownloadAction(c)}${canDelete ? `<button class="btn danger" data-delete-ce="${c.id}">Delete</button>` : `<span class="ce-version-locked">Locked</span>`}</div></td></tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function compactCeScanStatus(status) {
  if (/template scan matched/i.test(status)) return "Matched";
  return status;
}

function ceScanChip(status) {
  if (/matched|manual/i.test(status)) return chip(status, "good");
  if (/unavailable|review|failed|issue/i.test(status)) return chip(status, "warn");
  return chip(status, "active");
}

function canDeleteCeVersion(ce) {
  return !ce.approved && !/approved|signed/i.test(ce.status);
}

function deleteCeVersion(id) {
  const ce = db.ceVersions.find(item => item.id === id);
  if (!ce || !canDeleteCeVersion(ce)) return;
  const confirmed = window.confirm(`Delete ${ce.version}? Approved or signed CE versions stay locked for audit history.`);
  if (!confirmed) return;
  const stored = uploadedCeFiles.get(id);
  if (stored?.objectUrl) URL.revokeObjectURL(stored.objectUrl);
  uploadedCeFiles.delete(id);
  db.ceVersions = db.ceVersions.filter(item => item.id !== id);
  db.ceLines = db.ceLines.filter(line => line.ceId !== id);
  persistSavedCeUploads();
  persistUploadedCeFileRecords();
  if (state.reviewSnapshot === `cefile:${id}`) state.reviewSnapshot = null;
  render();
}

function ceComputationGuard(p) {
  const ce = currentCe(p.id);
  const computed = ce ? ceFinancials(ce) : ceFinancialsFromGross(p.value || 0);
  const threshold = roundCent(computed.projectCost * settings.crpExpenseThreshold);
  return `<div class="ce-guardrail">
    <div><span>Formula</span><b>Project Cost + ASF 12% + VAT 12%</b></div>
    <div><span>Current Gross</span><b>${fmtDetailed(computed.grandTotal)}</b></div>
    <div><span>60% Expense Threshold</span><b>${fmtDetailed(threshold)}</b></div>
  </div>`;
}
function ceLinesTable(projectId) {
  const ceIds = db.ceVersions.filter(c => c.projectId === projectId).map(c => c.id);
  return simpleTable(db.ceLines.filter(l => ceIds.includes(l.ceId) && !l.groupHeader && !isAsfLine(l)).map(l => ({ category:l.category, description:l.description, supplier:l.supplier || "TBD", supplierCost:fmt(l.unitCost), sellingPrice:fmt(l.selling) })), ["category","description","supplier","supplierCost","sellingPrice"]);
}

function crpDashboard(p) {
  const latestUpload = latestCrpUpload(p.id);
  return `<div class="card crp-dashboard-card"><h3>CRP Pre-Actualization</h3>
    <div class="upload-panel crp-upload-panel">
      <input class="crp-upload-input" id="crpUploadInput" type="file" accept=".xlsx,.xls" data-crp-upload-input />
      <button class="btn primary" data-crp-upload-button>Upload</button>
      <p>The latest workbook is the working CRP. Previous uploads stay downloadable as audit history, while Manila and Cebu request lines are checked before liquidation confirms the true final numbers.</p>
    </div>
    ${crpGuardrail(p, latestUpload)}
    ${latestUpload?.actualizedSummary ? crpActualizedSummaryPanel(latestUpload.actualizedSummary) : ""}
    ${crpReviewSummary(p, latestUpload)}
    <div class="crp-section-head"><h4>CRP Workbook History</h4><span>Latest upload is the working CRP.</span></div>
    ${crpUploadTable(p.id)}
    ${latestUpload?.runs?.length ? `<div class="crp-section-head"><h4>Latest Workbook View</h4><span>Approve and release per line item while watching the run and overall threshold.</span></div>${crpWorkbookView(latestUpload)}` : `<div class="crp-section-head"><h4>Request Lines</h4><span>Approve and release per line item while watching the total threshold.</span></div>${budgetTable(p.id)}`}
  </div>`;
}

function latestCrpUpload(projectId) {
  const uploads = db.crpUploads
    .map((upload, index) => ({ upload, index }))
    .filter(({ upload }) => upload.projectId === projectId)
    .sort((a, b) => b.index - a.index);
  return uploads[0]?.upload || null;
}

function crpActualizedTotal(summary) {
  return summary?.entries?.find(entry => /^total$/i.test(entry.label)) || null;
}

function crpLiquidationTotals(projectId) {
  const rows = db.liquidations.filter(l => l.projectId === projectId);
  return {
    rows: rows.length,
    cashReturns: roundCent(rows.reduce((sum, l) => sum + (Number(l.returned) || 0), 0)),
    reimbursements: roundCent(rows.reduce((sum, l) => sum + (Number(l.reimbursable) || 0), 0)),
    actualExpense: roundCent(rows.reduce((sum, l) => sum + (Number(l.liquidated) || 0) - (Number(l.returned) || 0), 0))
  };
}

function crpSavingsBand(ratio = 0) {
  if (ratio >= 0.30) return { label:"Ideal", tone:"good" };
  if (ratio >= 0.21) return { label:"Questionable", tone:"warn" };
  return { label:"Red Flag", tone:"risk" };
}

function crpValueToneClass(value = 0) {
  const amount = roundCent(Number(value) || 0);
  if (amount > 0) return "is-positive";
  if (amount < 0) return "is-negative";
  return "is-zero";
}

function crpPercentOf(value = 0, basis = 0) {
  const denominator = Math.abs(Number(basis) || 0);
  if (!denominator) return "0%";
  const percent = ((Number(value) || 0) / denominator) * 100;
  const decimals = Math.abs(percent) > 0 && Math.abs(percent) < 10 ? 1 : 0;
  return `${percent.toFixed(decimals)}%`;
}

function crpPreActualizationMetric(label, value, hint) {
  return `<div class="crp-pre-metric"><span>${label}</span><b>${fmtDetailed(value)}</b><small>${hint}</small></div>`;
}

function crpOverallReview(projectId, upload = latestCrpUpload(projectId)) {
  const actualizedTotal = crpActualizedTotal(upload?.actualizedSummary);
  const ce = signedCe(projectId) || currentCe(projectId);
  const liquidation = crpLiquidationTotals(projectId);
  const basis = roundCent(actualizedTotal?.subTotal || (ce ? ceFinancials(ce).projectCost : crpBudgetBasis(projectId)));
  const asf = roundCent(ce ? ceFinancials(ce).asf : basis * settings.asfDefault);
  const incomeThreshold = roundCent(actualizedTotal?.total40 || basis * 0.4);
  const threshold = roundCent(actualizedTotal?.total60 || basis * settings.crpExpenseThreshold);
  const requests = upload ? crpRequestsForUpload(upload) : crpRequests(projectId);
  const lineRequestTotal = roundCent(requests.reduce((sum, request) => sum + crpLineRequestAmount(request), 0));
  const requestTotal = roundCent(lineRequestTotal || actualizedTotal?.totalExpense || crpTotal(projectId));
  const remainingBuffer = roundCent(threshold - requestTotal);
  const savingsAmount = roundCent(basis - requestTotal);
  const savingsRatio = basis ? savingsAmount / basis : 0;
  const spendRatio = basis ? requestTotal / basis : 0;
  const actualExpense = roundCent(actualizedTotal?.totalExpense || liquidation.actualExpense || 0);
  const savingsFromExpense = roundCent(threshold - actualExpense);
  const totalProjectEarnings = roundCent(asf + incomeThreshold + Math.max(0, savingsFromExpense));
  const band = crpSavingsBand(savingsRatio);
  const thresholdCrossed = threshold ? requestTotal > threshold : false;
  return {
    basis,
    projectCost: basis,
    asf,
    incomeThreshold,
    threshold,
    expenseThreshold: threshold,
    total: requestTotal,
    requestTotal,
    remaining: remainingBuffer,
    remainingBuffer,
    savingsAmount,
    savingsRatio,
    bufferRatio: threshold ? remainingBuffer / threshold : 0,
    spendRatio,
    actualExpense,
    savingsFromExpense,
    totalProjectEarnings,
    cashReturns: liquidation.cashReturns,
    reimbursements: liquidation.reimbursements,
    hasActualization: Boolean(actualizedTotal || liquidation.rows),
    thresholdCrossed,
    band
  };
}

function crpGuardrail(p, upload = latestCrpUpload(p.id)) {
  const review = crpOverallReview(p.id, upload);
  const bufferTone = crpValueToneClass(review.remainingBuffer);
  const expenseSavingsTone = crpValueToneClass(review.savingsFromExpense);
  return `<div class="crp-summary-stack">
    <div class="crp-guardrail is-pre-actualization">
      ${crpPreActualizationMetric("CE Project Cost", review.projectCost, "Before ASF and VAT")}
      ${crpPreActualizationMetric("ASF Amount", review.asf, "12% of CE project cost")}
      ${crpPreActualizationMetric("40% Income Threshold", review.incomeThreshold, "Planned project income")}
      ${crpPreActualizationMetric("60% Expense Threshold", review.expenseThreshold, "Maximum planned expense")}
      <div class="has-signed-value crp-buffer-metric ${bufferTone}" tabindex="0" aria-label="Remaining Buffer. Hover or focus to view color coding.">
        <span>Remaining Buffer</span>
        <b class="crp-signed-value ${bufferTone}">${fmtDetailed(review.remainingBuffer)}</b>
        <small>${crpPercentOf(review.remainingBuffer, review.expenseThreshold)} of 60% expense threshold</small>
      </div>
    </div>
    ${review.hasActualization ? `<div class="crp-guardrail is-actualized">
      <div class="has-signed-value ${expenseSavingsTone}"><span>Savings from 60% Expense</span><b class="crp-signed-value ${expenseSavingsTone}">${fmtDetailed(review.savingsFromExpense)}</b><small>After liquidation and supplier payments</small></div>
      <div><span>Total Project Earnings</span><b>${fmtDetailed(review.totalProjectEarnings)}</b><small>ASF + 40% income + expense savings</small></div>
      <div><span>Savings Tag</span><b>${Math.round(review.savingsRatio * 100)}% · ${review.band.label}</b><small>Based on retained project cost</small></div>
      <div><span>Reimbursements</span><b>${fmtDetailed(review.reimbursements)}</b><small>${review.reimbursements ? "Requires CEO approval" : "None flagged"}</small></div>
    </div>` : ""}
  </div>`;
}

function ensureCrpBufferTooltip() {
  let tooltip = document.getElementById("crpBufferTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "crpBufferTooltip";
    tooltip.className = "crp-buffer-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.innerHTML = `<b>Remaining Buffer</b>
      <span><i class="crp-legend-swatch good"></i>Above ₱0: Green</span>
      <span><i class="crp-legend-swatch warn"></i>Exactly ₱0: Orange</span>
      <span><i class="crp-legend-swatch risk"></i>Below ₱0: Red</span>`;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function positionCrpBufferTooltip(anchor, tooltip) {
  const rect = anchor.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const width = tooltipRect.width || 286;
  const height = tooltipRect.height || 112;
  let left = rect.right - width;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  let top = rect.top - height - 10;
  if (top < 12) top = rect.bottom + 10;
  tooltip.style.left = `${Math.max(12, left)}px`;
  tooltip.style.top = `${Math.max(12, top)}px`;
}

function showCrpBufferTooltip(anchor) {
  const tooltip = ensureCrpBufferTooltip();
  crpBufferTooltipAnchor = anchor;
  tooltip.classList.add("is-ready");
  tooltip.classList.remove("is-visible");
  positionCrpBufferTooltip(anchor, tooltip);
  requestAnimationFrame(() => {
    if (crpBufferTooltipAnchor === anchor) tooltip.classList.add("is-visible");
  });
}

function hideCrpBufferTooltip(anchor = null) {
  if (anchor && crpBufferTooltipAnchor && anchor !== crpBufferTooltipAnchor) return;
  const tooltip = document.getElementById("crpBufferTooltip");
  if (tooltip) tooltip.classList.remove("is-visible", "is-ready");
  crpBufferTooltipAnchor = null;
}

function bindCrpBufferTooltip() {
  hideCrpBufferTooltip();
  if (!crpBufferTooltipEventsBound) {
    document.addEventListener("click", event => {
      if (!(event.target instanceof Element) || !event.target.closest(".crp-buffer-metric")) hideCrpBufferTooltip();
    });
    window.addEventListener("resize", () => hideCrpBufferTooltip());
    window.addEventListener("scroll", () => hideCrpBufferTooltip(), true);
    crpBufferTooltipEventsBound = true;
  }
  document.querySelectorAll(".crp-buffer-metric").forEach(anchor => {
    anchor.addEventListener("pointerenter", () => showCrpBufferTooltip(anchor));
    anchor.addEventListener("focus", () => showCrpBufferTooltip(anchor));
    anchor.addEventListener("pointermove", () => {
      const tooltip = document.getElementById("crpBufferTooltip");
      if (tooltip?.classList.contains("is-visible")) positionCrpBufferTooltip(anchor, tooltip);
    });
    anchor.addEventListener("pointerleave", () => hideCrpBufferTooltip(anchor));
    anchor.addEventListener("blur", () => hideCrpBufferTooltip(anchor));
    anchor.addEventListener("click", event => {
      event.stopPropagation();
      const tooltip = document.getElementById("crpBufferTooltip");
      if (tooltip?.classList.contains("is-visible") && crpBufferTooltipAnchor === anchor) hideCrpBufferTooltip(anchor);
      else showCrpBufferTooltip(anchor);
    });
  });
}

function crpReviewSummary(p, upload = latestCrpUpload(p.id)) {
  const requests = upload ? crpRequestsForUpload(upload) : crpRequests(p.id);
  const issueCount = upload?.runs?.length ? crpRunsIssueCount(upload.runs) : requests.reduce((sum, request) => sum + crpRequestIssueCount(request), 0);
  const thresholdMarks = requests.filter(crpRequestBeyondThreshold).length;
  const overall = crpOverallReview(p.id, upload);
  return `<div class="crp-review-summary">
    <div>${chip(issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : "All requests checked", issueCount ? "warn" : "good")}<span>Request validation</span></div>
    <div>${chip(thresholdMarks ? `${thresholdMarks} marked` : "No line marks", thresholdMarks ? "warn" : "good")}<span>Line threshold</span></div>
    <div>${chip(`${Math.round(overall.savingsRatio * 100)}% · ${overall.band.label}`, overall.band.tone)}<span>Savings tag</span></div>
    <div>${chip("Per line item", "active")}<span>Approval route</span></div>
  </div>`;
}

function crpActualizedSummaryPanel(summary) {
  const rows = summary?.entries || [];
  if (!rows.length) return "";
  return `<section class="crp-actualized">
    <div class="crp-actualized-title"><h4>Actualized Summary</h4><span>${escapeHtml(summary.sheetName || "ACTUALIZED")}</span></div>
    <div class="crp-actualized-grid">
      ${rows.map(row => {
        const remaining = roundCent(row.subTotal - row.totalExpense);
        const remaining60 = roundCent(row.total60 - row.totalExpense);
        const savingsRatio = row.subTotal ? remaining / row.subTotal : 0;
        const band = crpSavingsBand(savingsRatio);
        const status = chip(`${Math.round(savingsRatio * 100)}% · ${band.label}`, band.tone);
        return `<div class="crp-actualized-row">
          <b>${escapeHtml(row.label)}</b>
          <span><small>Total 60% Exp</small>${fmtDetailed(row.total60)}</span>
          <span><small>Cash</small>${fmtDetailed(row.cash)}</span>
          <span><small>Cheque</small>${fmtDetailed(row.cheque)}</span>
          <span><small>Total Expense</small>${fmtDetailed(row.totalExpense)}</span>
          <span><small>Balance vs 60%</small>${fmtDetailed(remaining60)}</span>
          <span>${status}</span>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function crpUploadTable(projectId) {
  const uploads = db.crpUploads
    .map((upload, index) => ({ upload, index }))
    .filter(({ upload }) => upload.projectId === projectId)
    .sort((a, b) => b.index - a.index)
    .map(({ upload }) => upload);
  if (!uploads.length) return `<div class="empty">No CRP workbook uploaded yet.</div>`;
  return `<table class="crp-upload-table">
    <colgroup><col class="crp-upload-version" /><col class="crp-upload-file" /><col class="crp-upload-lines" /><col class="crp-upload-scan" /><col class="crp-upload-total" /><col class="crp-upload-status" /><col class="crp-upload-action" /></colgroup>
    <thead><tr><th>Version</th><th>File</th><th>Lines</th><th>Scan</th><th>Total Request</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${uploads.map(upload => {
      const requests = crpRequestsForUpload(upload);
      const issueCount = upload.runs?.length ? crpRunsIssueCount(upload.runs) : requests.reduce((sum, request) => sum + crpRequestIssueCount(request), 0);
      const scanStatus = issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : (upload.scanStatus || "Manual");
      const runCount = upload.runs?.length || 0;
      return `<tr>
        <td data-label="Version"><b>${escapeHtml(upload.version)}</b></td>
        <td class="ce-file-cell" data-label="File">${crpFileCell(upload)}</td>
        <td data-label="Lines">${runCount ? `${runCount} runs · ${requests.length}` : requests.length}</td>
        <td data-label="Scan">${ceScanChip(compactCeScanStatus(scanStatus))}</td>
        <td class="ce-money-cell" data-label="Total Request">${fmtDetailed(requests.reduce((sum, request) => sum + request.amount, 0))}</td>
        <td data-label="Status">${chip(upload.status || "for checking")}</td>
        <td data-label="Action"><div class="ce-action-cell"><button class="btn" data-review="crpfile:${upload.id}">View</button>${crpDownloadAction(upload)}</div></td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}

function crpRequestsForUpload(upload) {
  const ids = new Set(upload.requestIds || []);
  return db.budgetRequests.filter(request => request.sourceUploadId === upload.id || ids.has(request.id));
}

function crpUploadForRequest(request) {
  return db.crpUploads.find(upload => upload.id === request.sourceUploadId || (upload.requestIds || []).includes(request.id));
}

function crpRequestExpectedAmount(request) {
  if (Number.isFinite(request.expectedAmount) && (request.expectedAmount > 0 || crpLineRequested(request))) return roundCent(request.expectedAmount);
  if (request.qty && request.unitCost) return roundCent((Number(request.qty) || 1) * (Number(request.unitCost) || 0));
  return 0;
}

function crpComputationCheck(request) {
  const issues = crpLineComputationIssues(request);
  if (issues.length) return { label:"Needs review", tone:"warn", issue:true, issues };
  const expected = crpRequestExpectedAmount(request);
  if (!expected && !crpLineRequested(request)) return { label:"Manual", tone:"active", issue:false };
  const variance = roundCent((request.amount || 0) - expected);
  if (Math.abs(variance) > 1) return { label:"Needs review", tone:"warn", issue:true, variance, expected };
  return { label:"Matched", tone:"good", issue:false };
}

function crpSupportCheck(request) {
  if ("cashRequest" in request || "chequeRequest" in request) {
    return crpLineSupportLabel(request);
  }
  const party = crpCounterpartyRecord(request);
  const type = normalizeCell(request.releaseType || "Cash");
  if (/cheque|check|bank|supplier/i.test(type)) {
    return request.quotation
      ? { label:"Quote attached", tone:"good", issue:false }
      : { label:"Missing quote", tone:"warn", issue:true };
  }
  return party.custodian && employeeByName(party.custodian)
    ? { label:"Person set", tone:"good", issue:false }
    : { label:"Missing person", tone:"warn", issue:true };
}

function crpRequestIssueCount(request) {
  if ("cashRequest" in request || "chequeRequest" in request) {
    return crpLineComputationIssues(request).length + crpSupportIssues(request).length;
  }
  return Number(crpComputationCheck(request).issue) + Number(crpSupportCheck(request).issue);
}

function crpRequestBeyondThreshold(request) {
  if ("workingBudget60" in request) return crpLineThresholdExceeded(request);
  const threshold = crpThresholdAmount(request.projectId);
  return Boolean(threshold && request.amount > threshold);
}

function crpThresholdChip(request) {
  if (!crpLineRequested(request) && "workingBudget60" in request) return chip("No request", "active");
  if (crpRequestBeyondThreshold(request)) return chip("Over line 60%", "warn");
  return chip("Within line 60%", "good");
}

function crpRequestRows(projectId) {
  const uploadOrder = new Map(db.crpUploads.map((upload, index) => [upload.id, index]));
  return crpRequests(projectId)
    .slice()
    .sort((a, b) => (uploadOrder.get(b.sourceUploadId) ?? -1) - (uploadOrder.get(a.sourceUploadId) ?? -1) || String(a.sourceRow || "").localeCompare(String(b.sourceRow || "")));
}

function budgetTable(projectId) {
  if (!projectId) {
    return simpleTable(db.budgetRequests.map(b => ({ project:project(b.projectId).code, holder:b.holder, requestor:b.requestor, category:b.category, amount:fmt(b.amount), status:chip(b.status), exception:b.exception ? chip("Exception") : "No" })), ["project","holder","requestor","category","amount","status","exception"]);
  }
  const rows = crpRequestRows(projectId);
  if (!rows.length) return `<div class="empty">No CRP request lines yet.</div>`;
  return `<table class="crp-request-table">
    <colgroup><col class="crp-col-version" /><col class="crp-col-run" /><col class="crp-col-request" /><col class="crp-col-ce" /><col class="crp-col-amount" /><col class="crp-col-checks" /><col class="crp-col-status" /><col class="crp-col-action" /></colgroup>
    <thead><tr><th>Version</th><th>Run</th><th>Line Item</th><th>CE / 60%</th><th>Request</th><th>Checks</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${rows.map(request => {
      const computation = crpComputationCheck(request);
      const support = crpSupportCheck(request);
      const upload = crpUploadForRequest(request);
      const hasIssue = computation.issue || support.issue;
      const notes = crpLineIssueText(request);
      return `<tr class="${hasIssue ? "has-issue" : ""}${crpRequestBeyondThreshold(request) ? " has-threshold-mark" : ""}">
        <td data-label="Version"><b>${escapeHtml(request.sourceVersion || "Manual")}</b></td>
        <td data-label="Run"><b>${escapeHtml(request.runName || request.sourceSheet || "-")}</b><small>${request.sourceRow ? `Row ${escapeHtml(request.sourceRow)}` : ""}</small></td>
        <td class="crp-request-main" data-label="Line Item"><b>${escapeHtml(request.category)}</b><span>${escapeHtml(request.description || request.holder || "Parsed request line")}</span></td>
        <td class="crp-money-stack" data-label="CE / 60%"><b>${fmtDetailed(request.ceSubTotal || request.expectedAmount || request.unitCost || 0)}</b><small>CE sub-total</small><b>${fmtDetailed(request.workingBudget60 || 0)}</b><small>Line 60%</small></td>
        <td class="crp-money-stack" data-label="Request"><b>${fmtDetailed(request.amount)}</b><small>${escapeHtml(request.releaseType || "Cash")}</small><small>Cash ${fmtDetailed(request.cashRequest || 0)}</small><small>Cheque ${fmtDetailed(request.chequeRequest || 0)}</small></td>
        <td class="crp-check-stack" data-label="Checks">${chip(computation.label, computation.tone)}${crpThresholdChip(request)}${chip(support.label, support.tone)}${notes ? `<small>${escapeHtml(notes)}</small>` : ""}</td>
        <td data-label="Status">${chip(request.status)}</td>
        <td data-label="Action"><div class="ce-action-cell"><button class="btn" data-review="crp:${request.id}">View</button><button class="btn" type="button" data-crp-counterparty="${escapeHtml(encodeURIComponent(crpDecisionKey(request)))}">Classify</button>${upload ? crpDownloadAction(upload) : `<button class="btn is-disabled" type="button" disabled>Download</button>`}</div></td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}
function fundReleaseDashboard(p) {
  const upload = latestCrpUpload(p.id);
  const liveRows = fundReleaseRows(p.id, upload);
  const scenarioPreview = Boolean(state.fundReleaseScenarioPreview);
  const rows = scenarioPreview ? fundReleaseScenarioRows(p.id, liveRows) : liveRows;
  const summary = fundReleaseSummary(rows, p);
  const sourceLabel = upload ? `${upload.version} · ${upload.file}` : "No CRP workbook uploaded yet";
  const canManage = fundReleaseCanManage();
  return `<div class="card fund-release-card">
    <div class="fund-release-head">
      <div>
        <h3>Fund Releases</h3>
        <p>CRP-approved lines stay ready until Finance uploads the line's transfer confirmation. Unused approved funds become project savings when the project ends.</p>
      </div>
      <div class="fund-release-head-actions">
        ${chip(scenarioPreview ? "Scenario preview" : "Finance ledger", scenarioPreview ? "warn" : "active")}
        <button class="btn" type="button" data-fund-scenario-toggle="true" aria-pressed="${scenarioPreview}">${scenarioPreview ? "Live" : "Scenario"}</button>
        ${canManage && !scenarioPreview ? `<button class="btn primary" type="button" data-fund-override-open="true">Reallocate</button>` : ""}
      </div>
    </div>
    ${scenarioPreview ? fundReleaseScenarioBanner(liveRows.length, rows.length) : ""}
    <div class="fund-release-source">
      <span>Source CRP</span>
      <b>${escapeHtml(sourceLabel)}</b>
      ${upload ? `<small>Latest workbook is used as the working release basis.</small>` : `<small>Upload a CRP first to populate release lines.</small>`}
    </div>
    <div class="fund-release-summary" aria-label="Fund release summary">
      ${fundReleaseSummaryTile("Approved for Release", summary.approved, "Cleared CRP budget", "neutral")}
      ${fundReleaseSummaryTile("Released to Date", summary.released, "Cash + cheque + released reallocations", summary.released ? "good" : "neutral")}
      ${fundReleaseSummaryTile("Reallocated Budget", summary.reallocatedBudget, `${fmtDetailed(summary.reallocatedReleased)} released`, summary.reallocatedBudget ? "active" : "neutral")}
      ${fundReleaseSummaryTile("Cash Released", summary.cashReleased, "Employee or professional", summary.cashReleased ? "good" : "neutral")}
      ${fundReleaseSummaryTile("Cheque Released", summary.chequeReleased, "Supplier or company", summary.chequeReleased ? "good" : "neutral")}
      ${fundReleaseSummaryCountTile("Receipt Pending", summary.receiptPending, summary.receiptPending === 1 ? "line awaiting receipt" : "lines awaiting receipt", summary.receiptPending ? "warn" : "good")}
    </div>
    ${fundReleaseLedger(rows)}
  </div>`;
}

function fundReleaseScenarioBanner(liveCount = 0, sampleCount = 0) {
  return `<div class="fund-release-scenario-banner" role="status">
    <div>
      <span>Illustrative data only</span>
      <b>All Fund Release outcomes in one view</b>
      <small>${escapeHtml(sampleCount)} representative lines shown from ${escapeHtml(liveCount)} live release lines. The uploaded CRP and its decisions are unchanged.</small>
    </div>
    <div class="fund-release-scenario-key" aria-label="Summary outcome examples">
      <span class="is-warn">Pending</span>
      <span class="is-good">Savings</span>
      <span class="is-active">Reallocated</span>
    </div>
  </div>`;
}

function fundReleaseSummaryTile(label, value, hint, tone = "neutral") {
  return `<div class="tone-${escapeHtml(tone)}"><span>${label}</span><b>${fmtDetailed(value)}</b><small>${hint}</small></div>`;
}

function fundReleaseSummaryCountTile(label, value, hint, tone = "neutral") {
  return `<div class="tone-${escapeHtml(tone)}"><span>${label}</span><b>${escapeHtml(value)}</b><small>${hint}</small></div>`;
}

function fundReleaseCrpRows(projectId, upload = latestCrpUpload(projectId)) {
  const requestRows = upload ? crpRequestsForUpload(upload) : crpRequestRows(projectId);
  const sourceRows = upload?.runs?.length
    ? upload.runs.flatMap(run => (run.sections || []).flatMap(section => (section.lines || []).map(line => ({
      ...line,
      projectId,
      runName: line.runName || run.name,
      category: line.category || section.title,
      sourceVersion: line.sourceVersion || upload.version,
      sourceFile: line.sourceFile || upload.file,
      sourceUploadId: line.sourceUploadId || upload.id
    }))))
    : requestRows;
  const requestedRows = sourceRows.filter(line => crpLineRequested(line));
  const baseRows = requestedRows.length ? requestedRows : requestRows.filter(line => crpLineRequested(line));
  return baseRows.map(line => fundReleaseRowModel(projectId, line, requestRows, upload)).filter(Boolean);
}

function fundReleaseRows(projectId, upload = latestCrpUpload(projectId)) {
  const crpRows = fundReleaseCrpRows(projectId, upload);
  const rows = crpRows.filter(row => row.approved && !row.hold);
  const releaseIds = new Set(crpRows.map(row => row.release?.id).filter(Boolean));
  const extraReleases = db.releases.filter(release => release.projectId === projectId && !releaseIds.has(release.id));
  const releaseOnlyRows = extraReleases.map(release => fundReleaseReleaseOnlyRow(projectId, release));
  const manualRows = fundReleaseManualItems
    .filter(item => item.projectId === projectId)
    .map(item => fundReleaseManualRow(projectId, item, crpRows));
  return rows.concat(releaseOnlyRows, manualRows);
}

function fundReleaseScenarioRows(projectId, rows = []) {
  if (!rows.length) return [];
  const unused = new Set(rows.map((_, index) => index));
  const take = predicate => {
    const indexes = [...unused];
    let index = indexes.find(item => predicate(rows[item]));
    if (index === undefined) index = indexes[0];
    if (index === undefined) index = 0;
    unused.delete(index);
    return rows[index];
  };
  const clone = (row, index, patch = {}) => ({
    ...row,
    ...patch,
    key: `scenario::${projectId}::${index}`,
    line: { ...(row.line || {}), ...(patch.line || {}) },
    request: { ...(row.request || {}), ...(patch.request || {}) },
    release: patch.release === null ? null : { ...(row.release || {}), ...(patch.release || {}) },
    scenario: true
  });
  const ready = (row, index, label, patch = {}) => clone(row, index, {
    ...patch,
    receipt: null,
    projectSavings: false,
    status: fundReleaseStatus({ approved:true, hold:false, receipt:null, projectSavings:false }),
    cashReleased: 0,
    chequeReleased: 0,
    totalReleased: 0,
    scenarioCase: label,
    scenarioTone: "warn"
  });
  const released = (row, index, label, patch = {}) => {
    const receipt = {
      id: `scenario-receipt-${index}`,
      name: `Transfer Confirmation ${String(index).padStart(2, "0")}.pdf`,
      attachedAt: `2026-09-18T${String(9 + index).padStart(2, "0")}:15:00+08:00`,
      attachedBy: "Finance Officer"
    };
    const cashReleased = roundCent(patch.cashReleased ?? row.cashApproved ?? row.cashRequested);
    const chequeReleased = roundCent(patch.chequeReleased ?? row.chequeApproved ?? row.chequeRequested);
    return clone(row, index, {
      ...patch,
      receipt,
      projectSavings: false,
      status: fundReleaseStatus({ approved:true, hold:false, receipt, projectSavings:false }),
      cashReleased,
      chequeReleased,
      totalReleased: roundCent(cashReleased + chequeReleased),
      scenarioCase: label,
      scenarioTone: "good"
    });
  };

  const cashReadySource = take(row => row.cashRequested > 0 && !row.chequeRequested);
  const chequeReadySource = take(row => row.chequeRequested > 0 && !row.cashRequested);
  const cashReleasedSource = take(row => row.cashRequested > 0 && !row.chequeRequested);
  const chequeReleasedSource = take(row => row.chequeRequested > 0 && !row.cashRequested);
  const splitReleasedSource = take(row => row.cashRequested > 0 && row.chequeRequested > 0);
  const savingsSource = take(() => true);
  const manualReadySource = take(() => true);
  const manualReleasedSource = take(() => true);

  const cashReadyAmount = roundCent(cashReadySource.cashApproved || cashReadySource.cashRequested || 7500);
  const chequeReadyAmount = roundCent(chequeReadySource.chequeApproved || chequeReadySource.chequeRequested || 55000);
  const cashReleasedAmount = roundCent(cashReleasedSource.cashApproved || cashReleasedSource.cashRequested || 30000);
  const chequeReleasedAmount = roundCent(chequeReleasedSource.chequeApproved || chequeReleasedSource.chequeRequested || 15000);
  const splitCashAmount = roundCent(splitReleasedSource.cashApproved || splitReleasedSource.cashRequested || 40000);
  const splitChequeAmount = roundCent(splitReleasedSource.chequeApproved || splitReleasedSource.chequeRequested || 30000);
  const savingsCash = roundCent(savingsSource.cashApproved || savingsSource.cashRequested);
  const savingsCheque = roundCent(savingsSource.chequeApproved || savingsSource.chequeRequested || (!savingsCash ? 12000 : 0));

  return [
    ready(cashReadySource, 1, "Cash · Ready for release", {
      line: { recipient: "Lara Cruz", quotation: "" },
      release: null,
      cashRequested: cashReadyAmount,
      cashApproved: cashReadyAmount,
      chequeRequested: 0,
      chequeApproved: 0,
      totalApproved: cashReadyAmount,
      totalRequested: cashReadyAmount
    }),
    ready(chequeReadySource, 2, "Cheque · Ready for release", {
      line: { recipient: "", quotation: normalizeCell(chequeReadySource.line?.quotation) || "Vantage Point" },
      release: null,
      cashRequested: 0,
      cashApproved: 0,
      chequeRequested: chequeReadyAmount,
      chequeApproved: chequeReadyAmount,
      totalApproved: chequeReadyAmount,
      totalRequested: chequeReadyAmount
    }),
    released(cashReleasedSource, 3, "Cash · Receipt attached and released", {
      line: { recipient: "Lara Cruz", quotation: "" },
      release: { employee:"Lara Cruz", payee:"", mode:"Cash", amount:cashReleasedAmount },
      cashRequested: cashReleasedAmount,
      cashApproved: cashReleasedAmount,
      chequeRequested: 0,
      chequeApproved: 0,
      cashReleased: cashReleasedAmount,
      chequeReleased: 0,
      totalApproved: cashReleasedAmount,
      totalRequested: cashReleasedAmount
    }),
    released(chequeReleasedSource, 4, "Cheque · Receipt attached and released", {
      line: { recipient: "", quotation: "DNX Technical Services" },
      release: { employee:"", payee:"DNX Technical Services", mode:"Bank transfer", amount:chequeReleasedAmount },
      cashRequested: 0,
      cashApproved: 0,
      chequeRequested: chequeReleasedAmount,
      chequeApproved: chequeReleasedAmount,
      cashReleased: 0,
      chequeReleased: chequeReleasedAmount,
      totalApproved: chequeReleasedAmount,
      totalRequested: chequeReleasedAmount
    }),
    released(splitReleasedSource, 5, "Split request · Receipt attached and released", {
      line: {
        recipient: normalizeCell(splitReleasedSource.line?.recipient) || "Mia Santos",
        quotation: normalizeCell(splitReleasedSource.line?.quotation) || "Fast and Easy Fabrication"
      },
      release: { employee:"Mia Santos", payee:"Fast and Easy Fabrication", mode:"Split", amount:roundCent(splitCashAmount + splitChequeAmount) },
      cashRequested: splitCashAmount,
      cashApproved: splitCashAmount,
      chequeRequested: splitChequeAmount,
      chequeApproved: splitChequeAmount,
      cashReleased: splitCashAmount,
      chequeReleased: splitChequeAmount,
      totalApproved: roundCent(splitCashAmount + splitChequeAmount),
      totalRequested: roundCent(splitCashAmount + splitChequeAmount),
      scenarioNotes: [
        { by:"Paolo Reyes · Accounts", at:"Sep 18, 2026 · 10:12 AM", text:"Client requested that part of this allocation be moved to additional registration counters. Keep the signed client file unchanged and track the instruction here." },
        { by:"Mia Santos · CEO", at:"Sep 18, 2026 · 10:31 AM", text:"Reallocation acknowledged. Proceed within the approved combined amount and retain this trail for actualization." }
      ]
    }),
    clone(savingsSource, 6, {
      receipt: null,
      projectSavings: true,
      status: fundReleaseStatus({ approved:true, hold:false, receipt:null, projectSavings:true }),
      cashRequested: savingsCash,
      cashApproved: savingsCash,
      chequeRequested: savingsCheque,
      chequeApproved: savingsCheque,
      cashReleased: 0,
      chequeReleased: 0,
      totalApproved: roundCent(savingsCash + savingsCheque),
      totalRequested: roundCent(savingsCash + savingsCheque),
      totalReleased: 0,
      scenarioCase: "Project ended · Unused savings",
      scenarioTone: "done"
    }),
    ready(manualReadySource, 7, "Reallocation · Receipt pending", {
      manual: true,
      manualLabel: "Budget reallocation · Simulation",
      line: {
        sourceRow: "REALLOC-01",
        description: "Additional supplier delivery fee",
        remarks: `Moved from Creative Requirement to ${manualReadySource.line?.description || "Staging & Setup"}`,
        recipient: "",
        quotation: "Fast and Easy Fabrication"
      },
      request: {},
      release: null,
      cashRequested: 0,
      cashApproved: 0,
      chequeRequested: 25000,
      chequeApproved: 0,
      totalApproved: 0,
      totalRequested: 25000,
      scenarioNotes: [
        { by:"Finance Officer", at:"Sep 18, 2026 · 11:05 AM", text:"Reallocated ₱25,000 from Creative Requirement to cover the approved line's additional delivery fee." }
      ]
    }),
    released(manualReleasedSource, 8, "Reallocation · Receipt attached", {
      manual: true,
      manualLabel: "Budget reallocation · Simulation",
      line: {
        sourceRow: "REALLOC-02",
        description: "Emergency permit processing",
        remarks: `Moved from Logistics Reserve to ${manualReleasedSource.line?.description || "Permits"}`,
        recipient: "Ram Villanueva",
        quotation: ""
      },
      request: {},
      release: { employee:"Ram Villanueva", payee:"", mode:"Cash", amount:12000 },
      cashRequested: 12000,
      cashApproved: 0,
      chequeRequested: 0,
      chequeApproved: 0,
      cashReleased: 12000,
      chequeReleased: 0,
      totalApproved: 0,
      totalRequested: 12000
    })
  ];
}

function fundReleaseRowModel(projectId, line, requests = [], upload = null) {
  const request = fundReleaseMatchingRequest(line, requests) || line;
  const release = fundReleaseMatchingRelease(projectId, line, request);
  const key = fundReleaseLineKey(line, request, release);
  const receipt = fundReleaseReceiptRecords[key] || null;
  const projectEnded = fundReleaseProjectEnded(project(projectId));
  const cashRequested = roundCent(crpEffectiveCashRequest(line) || fundReleaseLegacySplit(request, "cash"));
  const chequeRequested = roundCent(crpEffectiveChequeRequest(line) || fundReleaseLegacySplit(request, "cheque"));
  const decision = fundReleaseDecision(line, request, release);
  const approved = decision.status === "approved" || Boolean(release) || /released|documented/i.test(request.status || "");
  const hold = /rejected|responded|unapproved/i.test(decision.status || "");
  const cashApproved = approved ? cashRequested : 0;
  const chequeApproved = approved ? chequeRequested : 0;
  const released = fundReleaseReleasedSplit(line, request, release, receipt, cashApproved, chequeApproved);
  const projectSavings = projectEnded && approved && !receipt;
  const status = fundReleaseStatus({ approved, hold, receipt, projectSavings });
  return {
    key,
    projectId,
    upload,
    line,
    request,
    release,
    receipt,
    cashRequested,
    chequeRequested,
    cashApproved,
    chequeApproved,
    cashReleased: released.cash,
    chequeReleased: released.cheque,
    approved,
    hold,
    projectEnded,
    projectSavings,
    manual: false,
    status,
    totalApproved: roundCent(cashApproved + chequeApproved),
    totalRequested: roundCent(cashRequested + chequeRequested),
    totalReleased: roundCent(released.cash + released.cheque)
  };
}

function fundReleaseReleaseOnlyRow(projectId, release) {
  const key = `release::${release.id}`;
  const receipt = fundReleaseReceiptRecords[key] || null;
  const projectEnded = fundReleaseProjectEnded(project(projectId));
  const cash = /cash/i.test(release.mode || "") ? roundCent(release.amount) : 0;
  const cheque = cash ? 0 : roundCent(release.amount);
  const released = receipt ? { cash, cheque } : { cash:0, cheque:0 };
  return {
    key,
    projectId,
    line: {
      id: release.requestId || release.id,
      description: release.category || release.payee || "Fund release",
      category: release.category || "Released budget",
      sourceRow: release.id,
      recipient: release.employee,
      quotation: release.payee
    },
    request: {},
    release,
    receipt,
    cashRequested: cash,
    chequeRequested: cheque,
    cashApproved: 0,
    chequeApproved: 0,
    cashReleased: released.cash,
    chequeReleased: released.cheque,
    approved: true,
    hold: false,
    projectEnded,
    projectSavings: false,
    manual: true,
    manualLabel: "Release not found in CRP",
    status: fundReleaseStatus({ approved:true, hold:false, receipt, projectSavings:false }),
    totalApproved: 0,
    totalRequested: roundCent(release.amount),
    totalReleased: roundCent(released.cash + released.cheque)
  };
}

function fundReleaseManualRow(projectId, item = {}, crpRows = []) {
  const key = `manual::${item.id}`;
  const receipt = fundReleaseReceiptRecords[key] || null;
  const amount = roundCent(item.amount);
  const isCash = item.mode === "cash";
  const reference = crpRows.find(row => row.key === item.referenceKey) || null;
  const source = crpRows.find(row => row.key === item.sourceKey) || null;
  const cash = isCash ? amount : 0;
  const cheque = isCash ? 0 : amount;
  const released = receipt ? { cash, cheque } : { cash:0, cheque:0 };
  return {
    key,
    projectId,
    line: {
      id: item.id,
      description: item.description || "Budget reallocation",
      category: item.description || "Budget reallocation",
      sourceVersion: "Budget reallocation",
      recipient: isCash ? item.party : "",
      quotation: isCash ? "" : item.party,
      remarks: item.sourceLabel && item.referenceLabel
        ? `Moved from ${item.sourceLabel} to ${item.referenceLabel}`
        : item.referenceLabel ? `Moved to ${item.referenceLabel}` : "Reallocated between CRP lines"
    },
    request: {},
    release: null,
    receipt,
    source,
    reference,
    manualItem: item,
    manual: true,
    manualLabel: "Budget reallocation",
    cashRequested: cash,
    chequeRequested: cheque,
    cashApproved: 0,
    chequeApproved: 0,
    cashReleased: released.cash,
    chequeReleased: released.cheque,
    approved: true,
    hold: false,
    projectEnded: fundReleaseProjectEnded(project(projectId)),
    projectSavings: false,
    status: fundReleaseStatus({ approved:true, hold:false, receipt, projectSavings:false }),
    totalApproved: 0,
    totalRequested: amount,
    totalReleased: roundCent(released.cash + released.cheque)
  };
}

function fundReleaseProjectEnded(p) {
  if (!p) return false;
  if (["POST-PRODUCTION", "FOR BILLING", "BILLED", "COLLECTION", "CLOSURE", "CLOSED", "LOST", "CANCELLED"].includes(p.stage)) return true;
  const endDate = p.endDate;
  if (!endDate) return false;
  const end = new Date(`${endDate}T23:59:59+08:00`);
  return !Number.isNaN(end.getTime()) && end < new Date();
}

function fundReleaseCanManage() {
  return /^(FINANCE LEAD|FINANCE OFFICER)$/.test(canonicalRole());
}

function fundReleaseMatchingRequest(line = {}, requests = []) {
  const lineKey = crpDecisionKey(line);
  return requests.find(request => request.id && request.id === line.id)
    || requests.find(request => crpDecisionKey(request) === lineKey)
    || requests.find(request =>
      normalizeCell(request.sourceSheet || request.runName) === normalizeCell(line.sourceSheet || line.runName)
      && normalizeCell(request.sourceRow) === normalizeCell(line.sourceRow)
      && Math.abs(crpLineRequestAmount(request) - crpLineRequestAmount(line)) <= 1
    )
    || requests.find(request =>
      normalizeCell(request.category || request.description) === normalizeCell(line.category || line.description)
      && Math.abs(crpLineRequestAmount(request) - crpLineRequestAmount(line)) <= 1
    )
    || null;
}

function fundReleaseMatchingRelease(projectId, line = {}, request = {}) {
  const requestId = request.id || line.id;
  const amount = crpLineRequestAmount(line) || crpLineRequestAmount(request);
  const parties = [line.recipient, line.quotation, request.recipient, request.quotation].map(keyCell).filter(Boolean);
  return db.releases.find(release => release.projectId === projectId && requestId && release.requestId === requestId)
    || db.releases.find(release =>
      release.projectId === projectId
      && Math.abs((Number(release.amount) || 0) - amount) <= 1
      && parties.some(party => keyCell(release.employee) === party || keyCell(release.payee) === party)
    )
    || null;
}

function fundReleaseLineKey(line = {}, request = {}, release = {}) {
  if (request.id) return `request::${request.id}`;
  if (release.id) return `release::${release.id}`;
  return `line::${crpDecisionKey(line)}`;
}

function fundReleaseNoteRecord(key = "") {
  const raw = fundReleaseLineNotes[key];
  if (!raw) return { notes: [] };
  if (Array.isArray(raw)) return { notes: raw };
  return { notes: Array.isArray(raw.notes) ? raw.notes : [] };
}

function persistFundReleaseLineNotes() {
  try {
    localStorage.setItem(fundReleaseNoteStorageKey, JSON.stringify(fundReleaseLineNotes));
  } catch (error) {
    // Prototype notes remain optional if browser storage is unavailable.
  }
}

function fundReleaseNoteEntry(text) {
  return {
    text: normalizeCell(text),
    by: currentUser(),
    at: crpDecisionTimestamp()
  };
}

function fundReleaseSaveNote(key, text) {
  const record = fundReleaseNoteRecord(key);
  fundReleaseLineNotes[key] = {
    notes: [...record.notes, fundReleaseNoteEntry(text)]
  };
  persistFundReleaseLineNotes();
}

function fundReleaseLineLookup(key = "") {
  const p = project(state.selectedProjectId);
  if (!p) return null;
  const rows = fundReleaseRows(p.id);
  const visibleRows = state.fundReleaseScenarioPreview ? fundReleaseScenarioRows(p.id, rows) : rows;
  return visibleRows.find(row => row.key === key) || null;
}

function fundReleaseDecision(line = {}, request = {}, release = null) {
  const lineDecision = crpDecisionRecord(crpDecisionKey(line));
  if (lineDecision.status) return lineDecision;
  const requestDecision = request && request !== line ? crpDecisionRecord(crpDecisionKey(request)) : { status:"", history:[] };
  if (requestDecision.status) return requestDecision;
  if (release || /released|documented/i.test(request.status || "")) return { status:"approved", history:[] };
  return { status:"", history:[] };
}

function fundReleaseLegacySplit(request = {}, type = "cash") {
  const amount = crpLineRequestAmount(request);
  const releaseType = normalizeCell(request.releaseType || "");
  if (!amount) return 0;
  if (type === "cash") return /cash/i.test(releaseType) ? amount : 0;
  return /cash/i.test(releaseType) ? 0 : amount;
}

function fundReleaseReleasedSplit(line = {}, request = {}, release = null, receipt = null, cashApproved = 0, chequeApproved = 0) {
  if (!receipt) return { cash:0, cheque:0 };
  if (!release) return { cash:cashApproved, cheque:chequeApproved };
  const amount = roundCent(release.amount);
  if (/cash/i.test(release.mode || "")) return { cash: amount, cheque: 0 };
  const hasCash = cashApproved > 0;
  const hasCheque = chequeApproved > 0;
  if (hasCheque && !hasCash) return { cash: 0, cheque: amount };
  if (hasCash && !hasCheque) return { cash: amount, cheque: 0 };
  return /cheque|check|bank|supplier/i.test(`${request.releaseType || ""} ${line.releaseType || ""}`) ? { cash: 0, cheque: amount } : { cash: amount, cheque: 0 };
}

function fundReleaseStatus({ approved, hold, receipt, projectSavings }) {
  if (hold) return { label:"On Hold", tone:"warn" };
  if (receipt) return { label:"Released", tone:"good" };
  if (projectSavings) return { label:"Project savings", tone:"done" };
  if (approved) return { label:"Ready for release", tone:"warn" };
  return { label:"Awaiting CRP", tone:"done" };
}

function fundReleaseSummary(rows = [], p = null) {
  const summary = rows.reduce((result, row) => {
    result.approved = roundCent(result.approved + (row.manual ? 0 : row.totalApproved));
    result.approvedReleased = roundCent(result.approvedReleased + (row.manual ? 0 : row.totalReleased));
    result.reallocatedBudget = roundCent(result.reallocatedBudget + (row.manual ? row.totalRequested : 0));
    result.reallocatedReleased = roundCent(result.reallocatedReleased + (row.manual ? row.totalReleased : 0));
    result.cashReleased = roundCent(result.cashReleased + (row.manual ? 0 : row.cashReleased));
    result.chequeReleased = roundCent(result.chequeReleased + (row.manual ? 0 : row.chequeReleased));
    if (!row.receipt && !row.projectSavings) result.receiptPending += 1;
    return result;
  }, { approved:0, approvedReleased:0, released:0, pending:0, cashReleased:0, chequeReleased:0, reallocatedBudget:0, reallocatedReleased:0, receiptPending:0, savings:0, projectEnded:fundReleaseProjectEnded(p) });
  summary.released = roundCent(summary.cashReleased + summary.chequeReleased + summary.reallocatedReleased);
  summary.pending = roundCent(Math.max(0, summary.approved - summary.approvedReleased));
  summary.savings = summary.projectEnded ? summary.pending : 0;
  return summary;
}

function fundReleaseLedger(rows = []) {
  if (!rows.length) return `<div class="empty">No release lines yet. Approved CRP lines will appear here for Finance release tracking.</div>`;
  return `<div class="fund-release-ledger">
    <div class="fund-release-grid fund-release-header">
      <span>Particulars</span><span>Cash</span><span>Cheque</span><span>Person's Name</span><span>Supplier's Name</span><span>Release Status</span><span>Receipt</span><span>Action</span>
    </div>
    ${rows.map(fundReleaseLedgerRow).join("")}
  </div>`;
}

function fundReleaseLedgerRow(row) {
  const line = row.line || {};
  const storedNotes = fundReleaseNoteRecord(row.key).notes;
  const noteRecord = { notes: [...(row.scenarioNotes || []), ...storedNotes] };
  const noteCount = noteRecord.notes.length;
  const classes = ["fund-release-grid", "fund-release-row"];
  if (row.manual) classes.push("is-manual");
  else if (row.hold) classes.push("is-hold");
  else if (row.receipt) classes.push("is-documented");
  else if (row.projectSavings) classes.push("is-savings");
  else if (row.approved || row.release) classes.push("is-ready");
  else classes.push("is-waiting");
  const cells = `
    <div class="fund-release-main" data-label="Particulars">
      <span>${escapeHtml(row.manualLabel || line.sourceVersion || row.request?.sourceVersion || row.upload?.version || "CRP")}${line.sourceRow ? ` · Row ${escapeHtml(line.sourceRow)}` : ""}</span>
      <b>${escapeHtml(line.description || line.category || row.release?.category || "Budget release")}</b>
      ${row.scenarioCase ? `<em class="fund-release-scenario-case is-${escapeHtml(row.scenarioTone || "active")}">${escapeHtml(row.scenarioCase)}</em>` : ""}
      ${line.remarks ? `<small>${escapeHtml(line.remarks)}</small>` : ""}
      ${noteCount ? `<small class="fund-release-note-cue">${noteCount} ${noteCount === 1 ? "note" : "notes"}</small>` : ""}
    </div>
    <div data-label="Cash">${fundReleaseAmountStack(row.cashRequested, row.cashApproved, row.cashReleased, row.manual)}</div>
    <div data-label="Cheque">${fundReleaseAmountStack(row.chequeRequested, row.chequeApproved, row.chequeReleased, row.manual)}</div>
    <div data-label="Person's Name">${fundReleasePersonCell(row)}</div>
    <div data-label="Supplier's Name">${fundReleaseSupplierCell(row)}</div>
    <div class="fund-release-dot-cell" data-label="Release Status">${fundReleaseDot(row.receipt?.attachedAt ? `${row.status.label} · ${fundReleaseDateLabel(row.receipt.attachedAt)}` : row.status.label, row.status.tone, "release")}</div>
    <div data-label="Receipt">${fundReleaseReceiptCell(row)}</div>
    <div data-label="Action">${fundReleaseActionCell(row)}</div>
  `;
  if (!noteCount) return `<div class="${classes.join(" ")}">${cells}</div>`;
  return `<details class="fund-release-note-disclosure" open>
    <summary class="${classes.join(" ")}">${cells}</summary>
    ${fundReleaseNoteTrail(row, noteRecord)}
  </details>`;
}

function fundReleaseAmountStack(requested = 0, approved = 0, released = 0, manual = false) {
  if (!requested && !approved && !released) return "";
  return `<div class="fund-release-amount">
    <b>${fmtDetailed(approved || requested)}</b>
    <small>${manual ? "reallocated" : approved ? "approved" : "requested"}</small>
    ${released ? `<em>${fmtDetailed(released)} released</em>` : ""}
  </div>`;
}

function fundReleasePersonCell(row = {}) {
  const cashAmount = row.cashRequested || row.cashApproved || row.cashReleased;
  const line = row.line || {};
  const person = normalizeCell(row.release?.employee || (cashAmount ? crpCounterpartyRecord(line).custodian : "") || (cashAmount ? row.request?.recipient : ""));
  if (!person || crpSupportValueMissing(person)) return "";
  const employee = employeeByName(person);
  const name = employee
    ? `<button type="button" class="fund-release-link" data-review="employee:${employeeProfileToken(person)}">${escapeHtml(person)}</button>`
    : escapeHtml(person);
  return `<span class="fund-party-tag"><small>${employee ? "Spotlight employee" : "Cash custodian"}</small><b>${name}</b></span>`;
}

function fundReleaseSupplierCell(row = {}) {
  const chequeAmount = row.chequeRequested || row.chequeApproved || row.chequeReleased;
  const line = row.line || {};
  const request = row.request || {};
  const party = crpCounterpartyRecord(line);
  const supplier = normalizeCell((chequeAmount ? row.release?.payee : "") || party.provider || (chequeAmount ? request.recipient : "") || request.quotation);
  if (!supplier || crpSupportValueMissing(supplier)) return "";
  return `<span class="fund-party-tag is-supplier"><small>${escapeHtml(counterpartyTypeLabel(party.type))}</small><b>${escapeHtml(supplier)}</b></span>`;
}

function fundReleaseReceiptCell(row = {}) {
  const state = fundReleaseReceiptState(row);
  return fundReleaseDot(state.label, state.tone, "receipt");
}

function fundReleaseReceiptState(row = {}) {
  if (row.receipt) return { label:"Receipt attached", tone:"good" };
  if (row.projectSavings) return { label:"Project savings", tone:"done" };
  return { label:"Upload receipt", tone:"warn" };
}

function fundReleaseDotLegend(kind, label) {
  const current = escapeHtml(label);
  if (kind === "release") {
    return `<b>Release Status</b>
      <span><i class="crp-legend-swatch good"></i>Released</span>
      <span><i class="crp-legend-swatch warn"></i>Ready for release</span>
      <span><i class="crp-legend-swatch done"></i>Project savings</span>
      <em>Current: ${current}</em>`;
  }
  if (kind === "receipt") {
    return `<b>Transfer Confirmation</b>
      <span><i class="crp-legend-swatch good"></i>Receipt attached</span>
      <span><i class="crp-legend-swatch warn"></i>Upload receipt</span>
      <span><i class="crp-legend-swatch done"></i>Project savings</span>
      <em>Current: ${current}</em>`;
  }
  if (kind === "liquidation") {
    return `<b>Liquidation Status</b>
      <span><i class="crp-legend-swatch good"></i>Cleared</span>
      <span><i class="crp-legend-swatch warn"></i>Finance action due</span>
      <span><i class="crp-legend-swatch risk"></i>Overdue or CEO clearance</span>
      <em>Current: ${current}</em>`;
  }
  if (kind === "supplier-documents") {
    return `<b>Supplier Documents</b>
      <span><i class="crp-legend-swatch good"></i>Invoice and support complete</span>
      <span><i class="crp-legend-swatch warn"></i>Documents pending</span>
      <em>Current: ${current}</em>`;
  }
  if (kind === "supplier-actualization") {
    return `<b>Supplier Actualization</b>
      <span><i class="crp-legend-swatch good"></i>Fully paid and actualized</span>
      <span><i class="crp-legend-swatch warn"></i>Payment or clearing in progress</span>
      <span><i class="crp-legend-swatch risk"></i>Exception needs review</span>
      <em>Current: ${current}</em>`;
  }
  return `<em>${current}</em>`;
}

function fundReleaseDot(label, tone = "active", kind = "") {
  return `<span class="crp-dot-wrap fund-release-dot-wrap" tabindex="0" aria-label="${escapeHtml(label)}">
    <span class="crp-dot ${escapeHtml(tone)}" aria-hidden="true"></span>
    <span class="crp-dot-popover" role="tooltip">${fundReleaseDotLegend(kind, label)}</span>
  </span>`;
}

function fundReleaseSpotlightRecipient(row = {}) {
  return normalizeCell(row.release?.employee || row.manualItem?.party || (row.line ? crpCounterpartyRecord(row.line).custodian : "") || row.request?.recipient);
}

function fundReleaseActionCell(row = {}) {
  const reviewTarget = row.request?.id ? `crp:${row.request.id}` : row.upload?.id ? `crpfile:${row.upload.id}` : "";
  const review = reviewTarget ? `<button class="btn" type="button" data-review="${escapeHtml(reviewTarget)}">View</button>` : "";
  const canManage = fundReleaseCanManage();
  const encodedKey = escapeHtml(encodeURIComponent(row.key));
  let releaseAction = "";
  if (row.receipt) releaseAction = `<span class="fund-release-action-state is-released">Released</span>${row.receipt.dataUrl ? `<a class="btn" href="${escapeHtml(row.receipt.dataUrl)}" download="${escapeHtml(row.receipt.name || "transfer-confirmation")}">Download</a>` : ""}`;
  else if (row.projectSavings) releaseAction = `<span class="fund-release-action-state is-savings">Savings</span>`;
  else if (row.scenario) releaseAction = `<button class="btn primary" type="button" disabled title="Upload receipt. Actions are disabled in Scenario Preview.">Upload</button>`;
  else if (canManage) releaseAction = `<button class="btn primary" type="button" data-fund-receipt-button="${encodedKey}" title="Upload transfer confirmation">Upload</button><input class="fund-receipt-input" type="file" accept=".pdf,image/*" data-fund-receipt-input="${encodedKey}" />`;
  const noteCount = (row.scenarioNotes || []).length + fundReleaseNoteRecord(row.key).notes.length;
  const note = `<button class="btn" type="button" data-fund-note="${escapeHtml(encodeURIComponent(row.key))}" title="Add or view notes">${noteCount ? `Notes ${noteCount}` : "Notes"}</button>`;
  return `<div class="fund-release-actions">${releaseAction}${review}${note}</div>`;
}

function fundReleaseNoteTrail(row = {}, record = { notes: [] }) {
  if (!record.notes.length) return "";
  return `<div class="fund-release-note-trail" aria-label="Fund release note trail">
    ${record.notes.map((note, index) => `<div class="fund-release-note-row">
      <span><b>${index === 0 ? "Line note" : `Note ${index + 1}`}</b><small>${escapeHtml(note.by || "System")} · ${escapeHtml(note.at || "Now")}</small></span>
      <p>${escapeHtml(note.text || "")}</p>
    </div>`).join("")}
  </div>`;
}

function fundReleaseDateLabel(value) {
  if (!value) return "Uploaded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Uploaded";
  return date.toLocaleDateString("en-PH", { month:"short", day:"numeric", year:"numeric" });
}

function persistFundReleaseReceiptRecords() {
  try {
    localStorage.setItem(fundReleaseReceiptStorageKey, JSON.stringify(fundReleaseReceiptRecords));
  } catch (error) {
    // Prototype receipts remain available for this session if browser storage is full.
  }
}

function persistFundReleaseManualItems() {
  try {
    localStorage.setItem(fundReleaseManualStorageKey, JSON.stringify(fundReleaseManualItems));
  } catch (error) {
    // The prototype keeps the reallocation in memory when storage is unavailable.
  }
}

async function uploadFundReleaseReceiptFile(file, encodedKey = "") {
  if (!file || !encodedKey) return;
  const key = crpDecodeDecisionKey(encodedKey);
  const row = fundReleaseLineLookup(key);
  if (!row || row.scenario) return;
  if ((row.cashApproved > 0 || row.cashRequested > 0) && !employeeByName(fundReleaseSpotlightRecipient(row))) return;
  const dataUrl = await fileToDataUrl(file);
  fundReleaseReceiptRecords[key] = {
    id: `receipt-${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    dataUrl,
    attachedAt: new Date().toISOString(),
    attachedBy: currentUser()
  };
  persistFundReleaseReceiptRecords();
  state.liquidationScenarioPreview = false;
  render();
}

function liquidationDashboard(p) {
  const scenarioPreview = Boolean(state.liquidationScenarioPreview);
  const access = liquidationRoleAccess();
  const sourceModel = scenarioPreview ? liquidationScenarioData(p) : liquidationLiveData(p);
  const model = access.canViewSummary ? sourceModel : {
    employees:(sourceModel.employees || []).filter(employee => keyCell(employee.name) === keyCell(currentUser())),
    suppliers:[]
  };
  const summary = liquidationDashboardSummary(model);
  return `<div class="card liquidation-dashboard-card">
    <div class="liquidation-dashboard-head">
      <div>
        <h3>Liquidation &amp; Actualization</h3>
        <p>Employees liquidate cash entrusted to them. Finance Officer substantiates direct supplier payments separately below.</p>
      </div>
      <div class="liquidation-dashboard-actions">
        ${chip(scenarioPreview ? "Draft scenario" : "Live records", scenarioPreview ? "warn" : "active")}
        <button class="btn" type="button" data-liq-scenario-toggle="true" aria-pressed="${scenarioPreview}">${scenarioPreview ? "Live" : "Draft"}</button>
        ${access.canSubmit ? `<button class="btn primary" type="button" data-liq-submit-open="true">Submit</button>` : ""}
        ${scenarioPreview && access.isCeo ? `<button class="btn" type="button" data-liq-finance-preview-open="true">View</button>` : ""}
      </div>
    </div>
    <div class="liquidation-access-banner tone-${escapeHtml(access.tone)}">
      <div><span>${escapeHtml(access.label)}</span><b>${escapeHtml(access.title)}</b></div>
      <p>${escapeHtml(access.description)}</p>
    </div>
    ${scenarioPreview ? `<div class="liquidation-draft-banner" role="status">
      <div><span>Illustrative data only</span><b>Employee cash and direct supplier payments have separate owners</b><small>Employees account for entrusted cash; Finance Officer substantiates direct cash, cheque, and bank payments to suppliers.</small></div>
      <div class="liquidation-draft-key"><span class="is-good">Cleared</span><span class="is-warn">Action due</span><span class="is-risk">Overdue / CEO</span></div>
    </div>` : ""}
    <div class="liquidation-kpis" aria-label="Liquidation summary">
      ${liquidationKpiTile("Cash Released", summary.cashReleased, "From Spotlight; transfers excluded", "neutral")}
      ${liquidationKpiTile("Expenses Submitted", summary.submitted, `${percentOf(summary.submitted, summary.cashReleased)}% of released cash`, "active")}
      ${liquidationKpiTile("Cash Returns", summary.cashReturns, `${fmtDetailed(summary.cashReturnReceived)} received · ${fmtDetailed(summary.cashReturnDue)} due`, summary.cashReturnDue ? "warn" : "good")}
      ${liquidationKpiTile("Reimbursements", summary.reimbursements, summary.reimbursementPending ? `${fmtDetailed(summary.reimbursementPending)} awaiting CEO` : "No pending CEO clearance", summary.reimbursementPending ? "risk" : summary.reimbursements ? "good" : "neutral")}
      ${liquidationKpiTile("Overdue Exposure", `${summary.overdueCount} ${summary.overdueCount === 1 ? "employee" : "employees"}`, `${fmtDetailed(summary.overdueAmount)} accountable`, summary.overdueCount ? "risk" : "good", false)}
      ${liquidationKpiTile("Verified Actual Cost", summary.verifiedActualCost, "Employee + supplier expenses", "good")}
    </div>
    ${liquidationUsageOverview(model.employees, model.suppliers)}
    ${liquidationEmployeeLedger(model.employees, scenarioPreview)}
    ${liquidationSupplierLedger(model.suppliers, scenarioPreview)}
  </div>`;
}

function liquidationRoleAccess(employee = null) {
  const role = canonicalRole();
  const isCeo = role === "CEO";
  const isCoo = role === "COO";
  const isCompliance = role === "FINANCE COMPLIANCE & ASSISTANT";
  const isFinanceOfficer = role === "FINANCE OFFICER" || role === "FINANCE LEAD";
  const isProduction = /^(PRODUCTION HEAD|PROJECT MANAGER|PROJECT COORDINATOR)$/.test(role);
  const viewerBand = liquidationRoleBand(role);
  const employeeRole = employee ? liquidationEmployeeRole(employee.name) : "";
  const employeeBand = liquidationRoleBand(employeeRole);
  const canSupervise = viewerBand.level >= 3 || role === "PROJECT COORDINATOR";
  const canViewAll = isCeo || isCoo || isCompliance || isFinanceOfficer;
  const canViewSummary = canViewAll || canSupervise || isProduction;
  const ownsPacket = employee ? keyCell(employee.name) === keyCell(currentUser()) : false;
  const supervisesPacket = Boolean(employee && canSupervise && viewerBand.department && viewerBand.department === employeeBand.department && viewerBand.level > employeeBand.level);
  const canViewDetails = canViewAll || ownsPacket || supervisesPacket;
  if (isCeo) return { isCeo, isCompliance, isFinanceOfficer, isProduction, canSupervise, canViewAll, canViewSummary, canViewDetails, canAssess:true, canSubmit:true, ownsPacket, tone:"good", label:"CEO access", title:"Full audit and final approval", description:"All packets, supporting files, reimbursement decisions, and final approvals are visible." };
  if (isCoo) return { isCeo, isCompliance, isFinanceOfficer, isProduction, canSupervise, canViewAll, canViewSummary, canViewDetails, canAssess:false, canSubmit:true, ownsPacket, tone:"neutral", label:"COO access", title:"Full read-only visibility", description:"All liquidation packets and supporting files are visible without approval controls." };
  if (isCompliance) return { isCeo, isCompliance, isFinanceOfficer, isProduction, canSupervise, canViewAll, canViewSummary, canViewDetails, canAssess:true, canSubmit:true, ownsPacket, tone:"active", label:"Finance Compliance access", title:"Initial assessment", description:"All packets can be audited, approved, or returned before CEO final approval." };
  if (isFinanceOfficer) return { isCeo, isCompliance, isFinanceOfficer, isProduction, canSupervise, canViewAll, canViewSummary, canViewDetails, canAssess:false, canSubmit:true, ownsPacket, tone:"neutral", label:"Finance Officer access", title:"Cash and cheque liquidation", description:"All packets are visible. Finance can file cash expenses and is the only role that liquidates cheque expenses." };
  if (canSupervise) return { isCeo, isCompliance, isFinanceOfficer, isProduction, canSupervise, canViewAll:false, canViewSummary:true, canViewDetails, canAssess:false, canSubmit:true, ownsPacket, tone:"warn", label:"Supervisory access", title:"Team details and peer summaries", description:"Direct reports can be reviewed in detail. Peers and other teams remain visible only as project totals." };
  return { isCeo, isCompliance, isFinanceOfficer, isProduction, canSupervise, canViewAll:false, canViewSummary:false, canViewDetails, canAssess:false, canSubmit:true, ownsPacket, tone:"active", label:"Personal access", title:"Own liquidation and reimbursement", description:"Your packet is fully visible. Other employees' expense lines and supporting documents remain private." };
}

function liquidationEmployeeRole(name = "") {
  const employee = db.users.find(item => keyCell(item.name) === keyCell(name));
  return canonicalRole(employee?.role || "FIELD STAFF");
}

function liquidationRoleBand(role = "") {
  const canonical = canonicalRole(role);
  if (/^(CEO|COO)$/.test(canonical)) return { department:"executive", level:5 };
  if (canonical === "ACCOUNTS HEAD") return { department:"accounts", level:4 };
  if (canonical === "ACCOUNT MANAGER") return { department:"accounts", level:3 };
  if (canonical === "ACCOUNT EXECUTIVE") return { department:"accounts", level:2 };
  if (canonical === "PRODUCTION HEAD") return { department:"production", level:4 };
  if (canonical === "PROJECT MANAGER") return { department:"production", level:3 };
  if (canonical === "PROJECT COORDINATOR") return { department:"production", level:2 };
  if (/^(FIELD CASHIER|PROCUREMENT OFFICER|FIELD STAFF)$/.test(canonical)) return { department:"production", level:1 };
  if (canonical === "CREATIVE DIRECTOR") return { department:"creative", level:4 };
  if (canonical === "ASSOCIATE CREATIVE DIRECTOR") return { department:"creative", level:3.5 };
  if (canonical === "ART LEAD") return { department:"creative", level:3 };
  if (/^(COPYWRITER|GRAPHIC ARTIST|3D ARTIST)$/.test(canonical)) return { department:"creative", level:2 };
  if (canonical === "ADMIN & HR OFFICER") return { department:"admin", level:3 };
  if (canonical === "FINANCE LEAD") return { department:"finance", level:4 };
  if (canonical === "FINANCE OFFICER") return { department:"finance", level:3 };
  if (canonical === "FINANCE COMPLIANCE & ASSISTANT") return { department:"finance", level:2 };
  return { department:"", level:1 };
}

function liquidationPageProjectGroup(projectId, items, open = false) {
  const projectRecord = project(projectId);
  const released = items.reduce((sum, item) => sum + Number(item.released || 0), 0);
  const submitted = items.reduce((sum, item) => sum + Number(item.liquidated || 0), 0);
  const openItems = items.filter(item => !/cleared/i.test(item.status));
  const overdue = openItems.filter(item => agingDays(item.due) > 0);
  const detailed = items.filter(item => liquidationRoleAccess({ name:item.employee }).canViewDetails);
  const summaryOnly = items.filter(item => !liquidationRoleAccess({ name:item.employee }).canViewDetails);
  const detailRows = detailed.map(item => {
    const focused = item.id === state.liquidationPageRecordId;
    const days = /cleared/i.test(item.status) ? 0 : agingDays(item.due);
    return `<article class="liquidation-page-person ${focused ? "is-focused" : ""}" ${focused ? `id="liquidation-focus-record"` : ""}>
      <span><b>${escapeHtml(item.employee)}</b><small>${escapeHtml(liquidationEmployeeRole(item.employee))} · ${escapeHtml(item.findings || "No finding")}</small></span>
      <span><small>Released</small><b>${fmt(item.released)}</b></span>
      <span><small>Submitted</small><b>${fmt(item.liquidated)}</b></span>
      <span><small>Return / Reimbursement</small><b>${fmt(item.returned)} / ${fmt(item.reimbursable)}</b></span>
      <span class="${days ? "is-overdue" : ""}"><small>Due / Aging</small><b>${formatShortDate(item.due)}${days ? ` · ${days}d` : ""}</b></span>
      <span><small>Status</small>${chip(item.status)}</span>
      <button class="btn compact" type="button" data-liquidation-open-record="${escapeHtml(item.id)}">View</button>
    </article>`;
  }).join("");
  const privateSummary = summaryOnly.length ? `<div class="liquidation-peer-summary"><span><b>${summaryOnly.length} peer packet${summaryOnly.length === 1 ? "" : "s"}</b><small>Names, expense lines, findings, and supporting files are private.</small></span><span><small>Released</small><b>${fmt(summaryOnly.reduce((sum, item) => sum + Number(item.released || 0), 0))}</b></span><span><small>Submitted</small><b>${fmt(summaryOnly.reduce((sum, item) => sum + Number(item.liquidated || 0), 0))}</b></span><span><small>Open</small><b>${summaryOnly.filter(item => !/cleared/i.test(item.status)).length}</b></span></div>` : "";
  return `<details class="liquidation-page-project" ${open ? "open" : ""}>
    <summary><span><b>${escapeHtml(projectRecord?.name || "Project")}</b><small>${escapeHtml(projectRecord?.code || "")} · ${items.length} packet${items.length === 1 ? "" : "s"}</small></span><span><small>Released</small><b>${fmt(released)}</b></span><span><small>Submitted</small><b>${fmt(submitted)}</b></span><span class="${overdue.length ? "is-overdue" : ""}"><small>Open / Overdue</small><b>${openItems.length} / ${overdue.length}</b></span></summary>
    <div class="liquidation-page-project-body">${detailRows}${privateSummary}</div>
  </details>`;
}

function liquidationKpiTile(label, value, hint, tone = "neutral", currency = true) {
  const display = currency ? fmtDetailed(value) : escapeHtml(value);
  return `<div class="tone-${escapeHtml(tone)}"><span>${escapeHtml(label)}</span><b>${display}</b><small>${hint}</small></div>`;
}

function percentOf(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) || 0) / total * 100);
}

function liquidationMockDocument(label = "Receipt", owner = "Spotlight OS", amount = 0, type = "Receipt image") {
  const safeLabel = escapeHtml(label);
  const safeOwner = escapeHtml(owner);
  const safeAmount = escapeHtml(fmtDetailed(amount));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1160" viewBox="0 0 900 1160"><rect width="900" height="1160" fill="#f7f3e8"/><rect x="55" y="55" width="790" height="1050" rx="18" fill="#fffdf7" stroke="#c8b98f" stroke-width="4"/><text x="95" y="135" fill="#221f19" font-family="Montserrat,Arial,sans-serif" font-size="38" font-weight="800">${safeLabel}</text><text x="95" y="195" fill="#766d5e" font-family="Montserrat,Arial,sans-serif" font-size="23">Illustrative supporting document</text><line x1="95" y1="235" x2="805" y2="235" stroke="#d9cfb5" stroke-width="3"/><text x="95" y="320" fill="#766d5e" font-family="Montserrat,Arial,sans-serif" font-size="20">ISSUED BY / PAYEE</text><text x="95" y="365" fill="#221f19" font-family="Montserrat,Arial,sans-serif" font-size="30" font-weight="700">${safeOwner}</text><text x="95" y="465" fill="#766d5e" font-family="Montserrat,Arial,sans-serif" font-size="20">AMOUNT</text><text x="95" y="525" fill="#157346" font-family="Montserrat,Arial,sans-serif" font-size="46" font-weight="800">${safeAmount}</text><rect x="95" y="610" width="710" height="230" rx="12" fill="#f1ebdc"/><text x="125" y="670" fill="#766d5e" font-family="Montserrat,Arial,sans-serif" font-size="19">DOCUMENT TYPE</text><text x="125" y="715" fill="#221f19" font-family="Montserrat,Arial,sans-serif" font-size="28" font-weight="700">${escapeHtml(type)}</text><text x="125" y="785" fill="#766d5e" font-family="Montserrat,Arial,sans-serif" font-size="18">Demo evidence for workflow review</text><text x="95" y="1010" fill="#9b9079" font-family="Montserrat,Arial,sans-serif" font-size="18">SPOTLIGHT OS · SIMULATED DOCUMENT</text></svg>`;
  return {
    name:`${label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "receipt"}.png`,
    type:"image/svg+xml",
    documentType:type,
    dataUrl:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  };
}

function liquidationApplySupplierAction(supplier = {}) {
  return { ...supplier, ...(liquidationSupplierActions[supplier.id] || {}) };
}

function liquidationSupplierPaymentHistory(supplier = {}) {
  if (Array.isArray(supplier.payments)) return supplier.payments;
  if (!(Number(supplier.paid) > 0)) return [];
  return [{
    id:`opening-${supplier.id}`,
    amount:roundCent(supplier.paid),
    stage:supplier.paid >= supplier.finalInvoice ? "FP" : "DP",
    date:supplier.paymentDate || "",
    method:supplier.paymentMethod || "",
    reference:supplier.reference || "",
    proof:supplier.paymentProof || null,
    opening:true
  }];
}

function liquidationSupplierAge(supplier = {}) {
  const balance = roundCent(Math.max(0, (Number(supplier.finalInvoice) || 0) - (Number(supplier.paid) || 0)));
  const due = String(supplier.dueDate || "");
  if (!balance || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { balance, days:0, missingDue:Boolean(balance && !due) };
  const today = new Date(`${manilaSubmissionDate()}T12:00:00Z`);
  const deadline = new Date(`${due}T12:00:00Z`);
  return { balance, days:Math.max(0, Math.floor((today - deadline) / 86400000)), missingDue:false };
}

function liquidationSupplierPaymentLateDays(dueDate = "", paymentDate = "") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return 0;
  return Math.max(0, Math.floor((new Date(`${paymentDate}T12:00:00Z`) - new Date(`${dueDate}T12:00:00Z`)) / 86400000));
}

function liquidationProjectManualSuppliers(projectId = "") {
  return liquidationManualSuppliers.filter(item => item.projectId === projectId).map(liquidationApplySupplierAction);
}

function liquidationApplyInternalTransfers(employees = [], projectId = "") {
  const projectRecord = project(projectId);
  const records = employees.map(employee => ({ ...employee }));
  const firstRecipient = new Map();
  records.forEach((employee, index) => {
    const key = keyCell(employee.name);
    if (key && !firstRecipient.has(key)) firstRecipient.set(key, index);
  });
  const incoming = new Map();
  records.forEach(sender => (sender.transfers || []).forEach(transfer => {
    const recipient = keyCell(transfer.to);
    const amount = roundCent(Number(transfer.amount) || 0);
    if (!recipient || recipient === keyCell(sender.name) || amount <= 0) return;
    if (transfer.projectId && transfer.projectId !== projectId) return;
    const rows = incoming.get(recipient) || [];
    rows.push({
      date:transfer.date || sender.submittedAt || "",
      to:transfer.to,
      from:sender.name,
      method:transfer.method || "Internal transfer",
      reference:transfer.remarks || "Acknowledgment receipt",
      remarks:`Cash release from ${sender.name}`,
      amount,
      acknowledgment:transfer.acknowledgment || null,
      projectId
    });
    incoming.set(recipient, rows);
  }));
  incoming.forEach((rows, key) => {
    if (firstRecipient.has(key)) return;
    firstRecipient.set(key, records.length);
    records.push({
      id:`liq-incoming-${projectId}-${key.replace(/[^a-z0-9]+/g, "-")}`,
      name:rows[0].to || rows[0].recipient || key,
      released:0, submitted:0, validated:0, cashReturn:0, cashReturnState:"",
      reimbursement:0, reimbursementStatus:"", due:liquidationProjectDueDate(projectRecord), submittedAt:"", daysLate:0,
      status:{ label:"Awaiting liquidation", tone:"warn" }, categories:[], note:"Internal project funds received; liquidation has not been submitted.", notes:[]
    });
  });
  return records.map((employee, index) => {
    const spotlightRows = (employee.releasedFunds || []).filter(row => keyCell(row.from || "Spotlight") === "spotlight");
    const spotlightReleased = employee.spotlightReleased != null
      ? roundCent(Number(employee.spotlightReleased) || 0)
      : spotlightRows.length
        ? roundCent(spotlightRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0))
        : roundCent(Number(employee.released) || 0);
    if (!spotlightRows.length && spotlightReleased > 0) spotlightRows.push({
      date:employee.submittedAt || "", from:"Spotlight", method:"Bank Transfer",
      reference:"Project cash release", remarks:"Project cash release from Spotlight", amount:spotlightReleased
    });
    const inbound = firstRecipient.get(keyCell(employee.name)) === index ? incoming.get(keyCell(employee.name)) || [] : [];
    const transferredIn = roundCent(inbound.reduce((sum, row) => sum + row.amount, 0));
    return {
      ...employee,
      spotlightReleased,
      transferredIn,
      released:roundCent(spotlightReleased + transferredIn),
      releasedFunds:[...spotlightRows, ...inbound]
    };
  });
}

function liquidationScenarioData(p) {
  const laraReceipts = [
    ["Crew meals", "Mall Catering", 12000],
    ["Printing supplies", "Print Hub", 10000],
    ["Site transportation", "City Van Rental", 9000],
    ["Setup materials", "Hardware Central", 8000],
    ["Bottled water", "Fresh Supply Co.", 11000]
  ];
  const laraWithoutReceipts = [
    ["Loading crew allowance", "Site loading crew", 7000],
    ["Parking fees", "Venue parking attendant", 6000],
    ["Messenger fares", "Project messenger", 5000],
    ["On-site incidentals", "Field team", 4000],
    ["Setup overtime", "Setup crew", 8000]
  ];
  const laraExpenses = [
    ...laraReceipts.map(([particulars, vendor, amount], index) => ({
      id:`lara-receipt-${index + 1}`,
      date:`2026-09-${String(index + 9).padStart(2, "0")}`,
      particulars, vendor, amount, kind:"With receipt", payeeKind:"supplier-business",
      support:liquidationMockDocument(`${particulars} official receipt`, vendor, amount, "Official receipt")
    })),
    ...laraWithoutReceipts.map(([particulars, vendor, amount], index) => ({
      id:`lara-no-receipt-${index + 1}`,
      date:`2026-09-${String(index + 9).padStart(2, "0")}`,
      particulars, vendor, amount, kind:"Without receipt",
      payeeKind:index === 1 ? "supplier-individual" : index === 3 ? "other" : "professional",
      payeeClassification:index === 3 ? "Project incidentals" : "",
      support:liquidationMockDocument(`${particulars} acknowledgment`, vendor, amount, "Acknowledgment / expense support")
    }))
  ];
  const employees = [
      {
        id: "liq-scenario-lara",
        name: "Lara Cruz",
        released: 100000,
        submitted: 80000,
        validated: 0,
        cashReturn: 0,
        cashReturnState: "",
        reimbursement: 0,
        reimbursementStatus: "",
        due: "2026-09-15",
        submittedAt: "2026-09-14",
        daysLate: 0,
        status: { label:"Submitted for audit", tone:"warn" },
        expenses: laraExpenses,
        transfers: [
          { date:"2026-09-10", to:"Iya Salcedo", method:"Bank Transfer", remarks:"Field replenishment · AR-101", amount:5000, acknowledgment:liquidationMockDocument("AR-101", "Iya Salcedo", 5000, "Internal transfer acknowledgment") },
          { date:"2026-09-11", to:"Marco Dela Paz", method:"Bank Transfer", remarks:"Transport float · AR-102", amount:4000, acknowledgment:liquidationMockDocument("AR-102", "Marco Dela Paz", 4000, "Internal transfer acknowledgment") },
          { date:"2026-09-12", to:"Carlo Mendoza", method:"Cash", remarks:"Venue setup float · AR-103", amount:3000, acknowledgment:liquidationMockDocument("AR-103", "Carlo Mendoza", 3000, "Internal transfer acknowledgment") },
          { date:"2026-09-13", to:"Iya Salcedo", method:"Bank Transfer", remarks:"On-site supplies · AR-104", amount:6000, acknowledgment:liquidationMockDocument("AR-104", "Iya Salcedo", 6000, "Internal transfer acknowledgment") },
          { date:"2026-09-14", to:"Marco Dela Paz", method:"Cash", remarks:"Crew dispatch float · AR-105", amount:2000, acknowledgment:liquidationMockDocument("AR-105", "Marco Dela Paz", 2000, "Internal transfer acknowledgment") }
        ],
        note: "Illustrative packet: ₱80,000 in expenses and ₱20,000 in internal transfers account for the ₱100,000 cash release. Finance audit is pending.",
        notes: []
      },
      {
        id: "liq-scenario-marco",
        name: "Marco Dela Paz",
        released: 55000,
        submitted: 61200,
        validated: 61000,
        cashReturn: 0,
        cashReturnState: "",
        reimbursement: 200,
        reimbursementStatus: "pending",
        due: "2026-09-12",
        submittedAt: "2026-09-18",
        daysLate: 6,
        status: { label:"CEO clearance required", tone:"risk" },
        categories: [
          { label:"Crew meals", amount:18000 },
          { label:"Site transportation", amount:25000 },
          { label:"Event permits", amount:13200 },
          { label:"Loading assistance", amount:5000 }
        ],
        note: "After the ₱6,000 transfer from Lara Cruz, the remaining ₱200 reimbursement requires Finance audit and CEO approval.",
        notes: []
      },
      {
        id: "liq-scenario-iya",
        name: "Iya Salcedo",
        released: 40000,
        submitted: 31500,
        validated: 31500,
        cashReturn: 19500,
        cashReturnState: "due",
        reimbursement: 0,
        reimbursementStatus: "",
        due: "2026-09-20",
        submittedAt: "2026-09-18",
        daysLate: 0,
        status: { label:"Cash return due", tone:"warn" },
        categories: [
          { label:"Crew meals", amount:8000 },
          { label:"Printing supplies", amount:9500 },
          { label:"Local transportation", amount:14000 }
        ],
        note: "Expense review is complete; clearance waits for the ₱19,500 cash return, including cash transferred by Lara Cruz.",
        notes: []
      },
      {
        id: "liq-scenario-carlo",
        name: "Carlo Mendoza",
        released: 30000,
        submitted: 29000,
        validated: 29000,
        cashReturn: 4000,
        cashReturnState: "received",
        reimbursement: 0,
        reimbursementStatus: "",
        due: "2026-09-16",
        submittedAt: "2026-09-15",
        daysLate: 0,
        status: { label:"Cleared", tone:"good" },
        categories: [
          { label:"Team meals", amount:6000 },
          { label:"Hardware supplies", amount:6000 },
          { label:"Delivery transportation", amount:12000 },
          { label:"On-site replenishment", amount:5000 }
        ],
        note: "Liquidation and the ₱4,000 cash return, including Lara Cruz's transfer, are fully cleared.",
        notes: []
      }
    ];
  const customRecords = liquidationScenarioRecords.filter(record => record.projectId === p.id);
  const customNames = new Set(customRecords.map(record => keyCell(record.name)));
  return {
    projectId: p.id,
    employees: liquidationApplyInternalTransfers(customRecords.concat(employees.filter(employee => !customNames.has(keyCell(employee.name)))).map(liquidationApplyStoredActions), p.id),
    suppliers: [
      { id:"supplier-vantage", name:"Vantage Point", category:"Photo & Documentation", approved:55000, finalInvoice:55000, paid:55000, savings:0, documents:true, invoice:liquidationMockDocument("Vantage Point Invoice 0921", "Vantage Point", 55000, "Supplier invoice"), paymentProof:liquidationMockDocument("Transfer Confirmation", "Vantage Point", 55000, "Bank transfer"), invoiceDate:"2026-08-18", dueDate:"2026-09-18", paymentDate:"2026-09-18", paymentMethod:"Bank transfer", reference:"UB-0921-4471", status:{ label:"Actualized", tone:"good" } },
      { id:"supplier-dnx", name:"DNX Technical Services", category:"Technicals", approved:70000, finalInvoice:68000, paid:30000, savings:2000, documents:false, invoice:liquidationMockDocument("DNX Partial Invoice", "DNX Technical Services", 68000, "Supplier invoice"), paymentProof:null, invoiceDate:"2026-05-15", dueDate:"2026-06-22", paymentDate:"2026-09-19", paymentMethod:"Cheque", reference:"CHQ-10482", status:{ label:"Payment proof pending", tone:"warn" } },
      { id:"supplier-fast", name:"Fast and Easy Fabrication", category:"Staging & Fabrication", approved:100000, finalInvoice:94000, paid:94000, savings:6000, documents:true, invoice:liquidationMockDocument("F&E Final Invoice", "Fast and Easy Fabrication", 94000, "Supplier invoice"), paymentProof:liquidationMockDocument("Acknowledgement Receipt", "Fast and Easy Fabrication", 94000, "Acknowledgement receipt"), invoiceDate:"2026-08-20", dueDate:"2026-09-20", paymentDate:"2026-09-19", paymentMethod:"Cheque", reference:"CHQ-10483", status:{ label:"Actualized", tone:"good" } }
    ].map(liquidationApplySupplierAction).concat(liquidationProjectManualSuppliers(p.id))
  };
}

function persistLiquidationScenario() {
  try {
    localStorage.setItem(liquidationScenarioRecordStorageKey, JSON.stringify(liquidationScenarioRecords));
    localStorage.setItem(liquidationScenarioActionStorageKey, JSON.stringify(liquidationScenarioActions));
    localStorage.setItem(liquidationSupplierActionStorageKey, JSON.stringify(liquidationSupplierActions));
    localStorage.setItem(liquidationManualSupplierStorageKey, JSON.stringify(liquidationManualSuppliers));
  } catch (error) {
    // The scenario remains usable for the current session if browser storage is unavailable.
  }
}

function liquidationApplyStoredActions(employee) {
  const stored = liquidationScenarioActions[employee.id] || {};
  const storedNotes = Array.isArray(stored.notes) ? stored.notes : [];
  const { notes, ...changes } = stored;
  const merged = {
    ...employee,
    ...changes,
    notes: [...(employee.notes || []), ...storedNotes]
  };
  merged.categories = liquidationParticularTotals(merged);
  return merged;
}

function liquidationExpenseDetails(employee = {}) {
  const expenses = Array.isArray(employee.expenses) && employee.expenses.length ? employee.expenses.map((expense, index) => ({
    ...expense,
    support:expense.support || null
  })) : (employee.categories || []).map((item, index) => {
    const legacyParticulars = normalizeCell(employee.note) && !/simulated liquidation packet submitted/i.test(employee.note)
      ? normalizeCell(employee.note)
      : "Particulars not captured in legacy submission";
    return {
      id:`${employee.id || "expense"}-summary-${index}`,
      particulars:keyCell(item.label) === "other" ? legacyParticulars : normalizeCell(item.label) || legacyParticulars,
      amount:roundCent(item.amount), kind:"Summary", vendor:employee.name || "Payee",
      support:String(employee.id || "").startsWith("liq-scenario-")
        ? liquidationMockDocument(`${keyCell(item.label) === "other" ? legacyParticulars : item.label} receipt`, employee.name || "Payee", item.amount, "Illustrative receipt")
        : null
    };
  });
  return expenses.map(expense => ({
    ...expense,
    ...(liquidationPayeeClassifications[`${state.selectedProjectId}::${employee.id}::${expense.id}`] || {}),
    payeeKind:liquidationPayeeClassifications[`${state.selectedProjectId}::${employee.id}::${expense.id}`]?.payeeKind || expense.payeeKind || "unclassified"
  }));
}

function liquidationParticularTotals(employee = {}) {
  const grouped = new Map();
  liquidationExpenseDetails(employee).forEach(expense => {
    const label = normalizeCell(expense.particulars) || "Unspecified particulars";
    const key = keyCell(label);
    const current = grouped.get(key) || { label, amount:0 };
    current.amount = roundCent(current.amount + (Number(expense.amount) || 0));
    grouped.set(key, current);
  });
  return [...grouped.values()].sort((a, b) => b.amount - a.amount);
}

function liquidationAttachments(employee = {}) {
  const files = [];
  liquidationExpenseDetails(employee).forEach(expense => {
    if (expense.support) files.push({ ...expense.support, particulars:expense.particulars });
  });
  (employee.chequeExpenses || []).forEach(expense => {
    if (expense.support) files.push({ ...expense.support, particulars:`${expense.vendor} invoice` });
    if (expense.paymentProof) files.push({ ...expense.paymentProof, particulars:`${expense.vendor} cheque proof` });
  });
  (employee.transfers || []).forEach(transfer => {
    if (transfer.acknowledgment) files.push({ ...transfer.acknowledgment, particulars:`Transfer to ${transfer.to}` });
  });
  (employee.releasedFunds || []).forEach(release => {
    if (release.acknowledgment) files.push({ ...release.acknowledgment, particulars:`Transfer from ${release.from}` });
  });
  (employee.receiptFiles || []).forEach(file => {
    if (!files.some(item => item.name === file.name && item.size === file.size)) files.push(file);
  });
  if (employee.returnConfirmation) files.push({ ...employee.returnConfirmation, particulars:"Cash return confirmation" });
  return files;
}

function liquidationLatestNote(employee = {}) {
  const trail = employee.notes || [];
  return trail.at(-1)?.message || employee.note || "No Finance note.";
}

function liquidationEmployeeLookup(id = "") {
  const p = project(state.selectedProjectId);
  if (!p || !id) return null;
  const model = state.liquidationScenarioPreview ? liquidationScenarioData(p) : liquidationLiveData(p);
  return model.employees.find(employee => employee.id === id) || null;
}

function liquidationEmployeeByName(name = "") {
  const p = project(state.selectedProjectId);
  if (!p || !name) return null;
  const model = state.liquidationScenarioPreview ? liquidationScenarioData(p) : liquidationLiveData(p);
  return model.employees.find(employee => keyCell(employee.name) === keyCell(name)) || null;
}

function liquidationSupplierLookup(id = "") {
  const p = project(state.selectedProjectId);
  if (!p || !id) return null;
  const model = state.liquidationScenarioPreview ? liquidationScenarioData(p) : liquidationLiveData(p);
  return model.suppliers.find(supplier => supplier.id === id) || null;
}

function liquidationUpdateEmployee(id, changes = {}, message = "") {
  if (!id) return;
  const current = liquidationScenarioActions[id] || {};
  const notes = Array.isArray(current.notes) ? current.notes : [];
  liquidationScenarioActions[id] = {
    ...current,
    ...changes,
    notes: message ? [...notes, {
      id:`liq-note-${Date.now()}`,
      author:currentUser(),
      at:new Date().toISOString(),
      message
    }] : notes
  };
  state.liquidationFocusId = id;
  persistLiquidationScenario();
}

function liquidationProjectDueDate(projectRecord = {}) {
  const eventDate = projectRecord?.liveDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate || "")) return "";
  const date = new Date(`${eventDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (projectRecord.provincial ? settings.liquidationDeadlineProvincialDays : settings.liquidationDeadlineMetroDays));
  return date.toISOString().slice(0, 10);
}

function liquidationDaysLate(due = "") {
  if (!due) return 0;
  const today = new Date(`${manilaSubmissionDate()}T00:00:00+08:00`);
  const deadline = new Date(`${due}T00:00:00+08:00`);
  return Math.max(0, Math.floor((today - deadline) / 86400000));
}

function liquidationSpotlightCashReleases(p) {
  const byEmployee = new Map();
  fundReleaseRows(p.id).forEach(row => {
    if (!row.receipt || !(row.cashReleased > 0)) return;
    const name = fundReleaseSpotlightRecipient(row);
    if (!employeeByName(name)) return;
    const key = keyCell(name);
    const record = byEmployee.get(key) || { name, rows:[] };
    record.rows.push({
      date:manilaDateFrom(row.receipt.attachedAt),
      from:"Spotlight",
      method:row.release?.mode || "Bank transfer",
      reference:row.receipt.name || row.release?.reference || "Transfer confirmation",
      remarks:row.line?.description || row.line?.category || "Approved CRP cash release",
      amount:roundCent(row.cashReleased)
    });
    byEmployee.set(key, record);
  });
  return byEmployee;
}

function liquidationIsChequeRelease(release = {}) {
  const request = db.budgetRequests.find(item => item.id === release.requestId);
  if (request?.releaseType) return /cheque|check/i.test(request.releaseType);
  if (/cheque|check/i.test(release.mode || "")) return true;
  return Boolean(release.payee && keyCell(release.payee) !== keyCell(release.employee));
}

function liquidationLiveData(p) {
  const records = db.liquidations.filter(item => {
    if (item.projectId !== p.id) return false;
    const release = db.releases.find(entry => entry.id === item.releaseId);
    return !release || !liquidationIsChequeRelease(release);
  });
  const grouped = new Map();
  records.forEach(item => {
    const name = normalizeCell(item.employee) || "Unassigned employee";
    const key = keyCell(name);
    const release = db.releases.find(entry => entry.id === item.releaseId) || {};
    const current = grouped.get(key) || {
      id: item.id,
      name,
      released:0,
      submitted:0,
      validated:0,
      cashReturn:0,
      cashReturnState:"",
      reimbursement:0,
      reimbursementStatus:"",
      due:item.due,
      submittedAt:item.submitted,
      daysLate:0,
      status:{ label:"Under Finance review", tone:"warn" },
      categories:[],
      note:"",
      notes:[]
    };
    current.released = roundCent(current.released + item.released);
    current.submitted = roundCent(current.submitted + item.liquidated);
    current.validated = roundCent(current.validated + Math.max(0, item.liquidated - item.reimbursable));
    current.cashReturn = roundCent(current.cashReturn + item.returned);
    current.reimbursement = roundCent(current.reimbursement + item.reimbursable);
    if (current.reimbursement) current.reimbursementStatus = "pending";
    current.daysLate = Math.max(current.daysLate, /Cleared/i.test(item.status) ? 0 : agingDays(item.due));
    if (!current.due || item.due < current.due) current.due = item.due;
    if (item.submitted && (!current.submittedAt || item.submitted > current.submittedAt)) current.submittedAt = item.submitted;
    const category = normalizeCell(item.particulars || release.particulars || release.category) || "Unspecified particulars";
    const categoryRow = current.categories.find(entry => keyCell(entry.label) === keyCell(category));
    if (categoryRow) categoryRow.amount = roundCent(categoryRow.amount + item.liquidated);
    else current.categories.push({ label:category, amount:roundCent(item.liquidated) });
    if (item.findings) current.note = [current.note, item.findings].filter(Boolean).join(" ");
    if (current.daysLate) current.status = { label:"Overdue", tone:"risk" };
    else if (current.reimbursement) current.status = { label:"CEO clearance required", tone:"risk" };
    else if (current.cashReturn && !/Cleared/i.test(item.status)) current.status = { label:"Cash return due", tone:"warn" };
    else if (/Cleared/i.test(item.status)) current.status = { label:"Cleared", tone:"good" };
    current.cashReturnState = current.cashReturn ? (/Cleared/i.test(item.status) ? "received" : "due") : current.cashReturnState;
    grouped.set(key, current);
  });
  liquidationSpotlightCashReleases(p).forEach(({ name, rows }, key) => {
    const released = roundCent(rows.reduce((sum, row) => sum + row.amount, 0));
    const current = grouped.get(key) || {
      id:`liq-release-${p.id}-${key.replace(/[^a-z0-9]+/g, "-")}`,
      name, submitted:0, validated:0, cashReturn:0, cashReturnState:"",
      reimbursement:0, reimbursementStatus:"", submittedAt:"", daysLate:0,
      status:{ label:"Awaiting liquidation", tone:"warn" }, categories:[], note:"", notes:[]
    };
    grouped.set(key, {
      ...current,
      spotlightReleased:released,
      releasedFunds:rows,
      due:liquidationProjectDueDate(p),
      daysLate:current.submittedAt ? current.daysLate : liquidationDaysLate(liquidationProjectDueDate(p)),
      status:current.submittedAt ? current.status : liquidationDaysLate(liquidationProjectDueDate(p))
        ? { label:"Liquidation overdue", tone:"risk" }
        : { label:"Awaiting liquidation", tone:"warn" }
    });
  });
  const suppliers = db.releases
    .filter(release => release.projectId === p.id && liquidationIsChequeRelease(release))
    .map(release => {
      const request = db.budgetRequests.find(item => item.id === release.requestId) || {};
      const approved = roundCent(request.amount || release.amount);
      const finalInvoice = roundCent(release.amount);
      const paymentProof = fundReleaseRows(p.id).find(row => row.release?.id === release.id)?.receipt || null;
      const documents = false;
      return {
        id: release.id,
        name: normalizeCell(release.payee) || "Unassigned supplier",
        category:normalizeCell(request.category || release.category) || "Supplier Costs",
        approved,
        finalInvoice,
        paid: paymentProof ? finalInvoice : 0,
        savings: roundCent(Math.max(0, approved - finalInvoice)),
        documents,
        invoice:null,
        paymentProof,
        paymentDate:release.date || "",
        paymentMethod:release.mode || "",
        reference:release.reference || "",
        status:{ label:"Documents pending", tone:"warn" }
      };
    }).map(liquidationApplySupplierAction).concat(liquidationProjectManualSuppliers(p.id));
  const submitted = liquidationScenarioRecords.filter(record => record.projectId === p.id);
  submitted.forEach(record => grouped.set(keyCell(record.name), record));
  return { projectId:p.id, employees:liquidationApplyInternalTransfers([...grouped.values()].map(liquidationApplyStoredActions), p.id), suppliers };
}

function liquidationDashboardSummary(model = { employees:[], suppliers:[] }) {
  const employees = model.employees || [];
  const suppliers = model.suppliers || [];
  const summary = employees.reduce((result, item) => {
    result.cashReleased = roundCent(result.cashReleased + (item.spotlightReleased ?? item.released));
    result.submitted = roundCent(result.submitted + item.submitted);
    result.validated = roundCent(result.validated + item.validated);
    result.cashReturns = roundCent(result.cashReturns + item.cashReturn);
    result.reimbursements = roundCent(result.reimbursements + item.reimbursement);
    if (item.reimbursementStatus === "pending") result.reimbursementPending = roundCent(result.reimbursementPending + item.reimbursement);
    if (item.cashReturnState === "received") result.cashReturnReceived = roundCent(result.cashReturnReceived + item.cashReturn);
    if (item.cashReturnState === "due") result.cashReturnDue = roundCent(result.cashReturnDue + item.cashReturn);
    if (item.daysLate > 0) {
      result.overdueCount += 1;
      result.overdueAmount = roundCent(result.overdueAmount + item.released);
    }
    return result;
  }, { cashReleased:0, submitted:0, validated:0, cashReturns:0, cashReturnReceived:0, cashReturnDue:0, reimbursements:0, reimbursementPending:0, overdueCount:0, overdueAmount:0, verifiedActualCost:0 });
  const supplierActual = suppliers.reduce((sum, item) => sum + item.finalInvoice, 0);
  summary.verifiedActualCost = roundCent(summary.validated + supplierActual);
  return summary;
}

function liquidationCategoryUsage(employees = [], suppliers = []) {
  const grouped = new Map();
  employees.forEach(employee => liquidationParticularTotals(employee).forEach(category => {
    const key = keyCell(category.label || "Unspecified particulars");
    const current = grouped.get(key) || { label:category.label || "Unspecified particulars", amount:0, people:new Map() };
    current.amount = roundCent(current.amount + category.amount);
    current.people.set(employee.name, roundCent((current.people.get(employee.name) || 0) + category.amount));
    grouped.set(key, current);
  }));
  suppliers.forEach(supplier => {
    const label = normalizeCell(supplier.category) || "Supplier Costs";
    const key = keyCell(label);
    const current = grouped.get(key) || { label, amount:0, people:new Map() };
    current.amount = roundCent(current.amount + (Number(supplier.finalInvoice) || 0));
    current.people.set("Supplier invoices", roundCent((current.people.get("Supplier invoices") || 0) + (Number(supplier.finalInvoice) || 0)));
    grouped.set(key, current);
  });
  const rows = [...grouped.values()].sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows.map((row, index) => ({
    ...row,
    people:[...row.people.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    share:total ? row.amount / total * 100 : 0,
    percent:total ? Math.round(row.amount / total * 100) : 0,
    tone:index % 8
  }));
}

function liquidationUsageOverview(employees = [], suppliers = []) {
  const rows = liquidationCategoryUsage(employees, suppliers);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  let offset = 0;
  const slices = rows.map((row, index) => {
    const dash = `${Math.max(.35, row.share)} ${Math.max(0, 100 - row.share)}`;
    const dashOffset = -offset;
    offset += row.share;
    return `<g class="liquidation-pie-slice tone-${row.tone}" data-liq-pie-slice="${index}">
      <circle cx="21" cy="21" r="15.9155" pathLength="100" stroke-dasharray="${dash}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 21 21)"><title>${escapeHtml(row.label)} · ${row.percent}% · ${row.people.map(person => `${person.name}: ${fmtDetailed(person.amount)}`).join(" | ")}</title></circle>
    </g>`;
  }).join("");
  const popups = rows.map((row, index) => `<div class="liquidation-pie-tooltip" data-liq-pie-popup="${index}" hidden><strong>${escapeHtml(row.label)}</strong><small>${fmtDetailed(row.amount)} · ${row.percent}%</small>${row.people.map(person => `<span><b>${escapeHtml(person.name)}</b><em>${fmtDetailed(person.amount)} · ${percentOf(person.amount, row.amount)}%</em></span>`).join("")}</div>`).join("");
  return `<section class="liquidation-usage-section">
    <div class="liquidation-section-head"><div><span>Project Actualization</span><b>Expense mix by category / particulars</b></div><div><span>Employee + supplier spend</span><b>${fmtDetailed(total)}</b></div></div>
    ${rows.length ? `<div class="liquidation-pie-layout">
      <div class="liquidation-pie-chart" aria-label="Expense mix pie chart"><svg viewBox="0 0 42 42" role="img"><circle class="liquidation-pie-base" cx="21" cy="21" r="15.9155" pathLength="100"></circle><circle class="liquidation-pie-hole" cx="21" cy="21" r="10.8"></circle><text x="21" y="20.2" text-anchor="middle">TOTAL</text><text class="is-value" x="21" y="23" text-anchor="middle">${rows.length}</text>${slices}</svg><div class="liquidation-pie-popover-layer">${popups}</div><small>Hover a slice to see the employee split or supplier-invoice share.</small></div>
      <div class="liquidation-pie-legend">${rows.map(row => `<div class="tone-${row.tone}"><i></i><span><b>${escapeHtml(row.label)}</b><small>${fmtDetailed(row.amount)}</small></span><em>${row.percent}%</em></div>`).join("")}</div>
    </div>` : `<div class="empty">No submitted expenses to categorize yet.</div>`}
  </section>`;
}

function liquidationEmployeeLedger(employees = [], scenarioPreview = false) {
  return `<section class="liquidation-workstream">
    <div class="liquidation-section-head"><div><span>Cash Releases · Employee-Owned</span><b>Employee Liquidations</b></div><small>One accountability row per cash recipient</small></div>
    ${employees.length ? `<div class="liquidation-employee-ledger">
      <div class="liquidation-employee-grid liquidation-ledger-head"><span>Employee</span><span>Released</span><span>Submitted</span><span>Cash Return</span><span>Reimbursement</span><span>Due / Aging</span><span>Status</span><span></span></div>
      ${employees.map((employee, index) => liquidationEmployeeRow(employee, index === 0 || employee.id === state.liquidationFocusId, scenarioPreview)).join("")}
    </div>` : `<div class="empty">No employee cash releases are ready for liquidation.</div>`}
  </section>`;
}

function liquidationEmployeeRow(employee, open = false, scenarioPreview = false) {
  const usagePercent = percentOf(employee.submitted, employee.released);
  const transferred = (employee.transfers || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const accountability = transferred ? ` · ${percentOf(employee.submitted + transferred + (Number(employee.cashReturn) || 0), employee.released)}% accounted` : "";
  const rowClass = employee.status.tone === "risk" ? "is-risk" : employee.status.tone === "good" ? "is-good" : "is-warn";
  const access = liquidationRoleAccess(employee);
  const particulars = liquidationParticularTotals(employee);
  return `<details class="liquidation-employee-record ${rowClass} ${access.canViewDetails ? "" : "is-private"}" ${open && access.canViewDetails ? "open" : ""}>
    <summary class="liquidation-employee-grid">
      <div class="liquidation-employee-name" data-label="Employee"><i>${escapeHtml(employee.name.charAt(0) || "-")}</i><span><b>${escapeHtml(employee.name)}</b><small>${usagePercent}% cash spent${accountability}${employee.chequeSubmitted ? ` · ${fmtDetailed(employee.chequeSubmitted)} cheque` : ""}</small></span></div>
      <div data-label="Released"><b>${fmtDetailed(employee.released)}</b><small>${employee.transferredIn ? `Spotlight ${fmtDetailed(employee.spotlightReleased)} · Team ${fmtDetailed(employee.transferredIn)}` : "cash advance"}</small></div>
      <div data-label="Submitted"><b>${fmtDetailed(employee.submitted)}</b><small>${fmtDetailed(employee.validated)} validated</small></div>
      <div data-label="Cash Return">${employee.cashReturn ? `<b>${fmtDetailed(employee.cashReturn)}</b><small>${employee.cashReturnState === "received" ? "received" : "return due"}</small>` : `<span class="liquidation-none">None</span>`}</div>
      <div data-label="Reimbursement">${employee.reimbursement ? `<b class="${employee.reimbursementStatus === "pending" ? "liquidation-risk-text" : ""}">${fmtDetailed(employee.reimbursement)}</b><small>${employee.reimbursementStatus === "approved" ? "CEO approved" : employee.reimbursementStatus === "rejected" ? "correction required" : "CEO clearance"}</small>` : `<span class="liquidation-none">None</span>`}</div>
      <div data-label="Due / Aging"><b>${formatShortDate(employee.due)}</b><small class="${employee.daysLate ? "liquidation-risk-text" : ""}">${employee.daysLate ? `${employee.daysLate} days late` : "On time"}</small></div>
      <div class="liquidation-status-cell" data-label="Status">${fundReleaseDot(employee.status.label, employee.status.tone, "liquidation")}<small>${escapeHtml(employee.status.label)}</small></div>
      <em class="liquidation-row-toggle">+</em>
    </summary>
    <div class="liquidation-employee-detail">
      ${access.canViewDetails ? `<div class="liquidation-category-breakdown">
        <span>Expense Particulars</span>
        ${particulars.map(category => {
          const percent = percentOf(category.amount, employee.submitted);
          return `<div><span>${escapeHtml(category.label)}</span><b>${fmtDetailed(category.amount)}</b><em>${percent}%</em><i><u style="--usage:${percent}%"></u></i></div>`;
        }).join("") || `<small>No categorized expenses yet.</small>`}
      </div>
      <div class="liquidation-review-panel">
        <span>Accountability Note${employee.notes?.length ? ` · ${employee.notes.length} update${employee.notes.length === 1 ? "" : "s"}` : ""}</span><p>${escapeHtml(liquidationLatestNote(employee))}</p>
        <div><button class="btn primary" type="button" data-liq-review="${escapeHtml(employee.id)}">View</button><button class="btn" type="button" data-liq-note="${escapeHtml(employee.id)}">Note</button></div>
      </div>` : `<div class="liquidation-private-detail"><b>Private liquidation details</b><p>This team member's totals remain visible, but line items, notes, and supporting files are limited to the filer and authorized reviewers.</p></div>`}
    </div>
  </details>`;
}

function liquidationSupplierLedger(suppliers = [], scenarioPreview = false) {
  const approved = suppliers.reduce((sum, item) => sum + item.approved, 0);
  const invoiced = suppliers.reduce((sum, item) => sum + item.finalInvoice, 0);
  const paid = suppliers.reduce((sum, item) => sum + item.paid, 0);
  const savings = suppliers.reduce((sum, item) => sum + item.savings, 0);
  return `<section class="liquidation-workstream liquidation-supplier-workstream">
      <div class="liquidation-section-head"><div><span>Direct payments · Finance Officer-Owned</span><b>Supplier Payables &amp; Actualization</b></div><div class="liquidation-supplier-heading-actions"><small>${fmtDetailed(paid)} paid · ${fmtDetailed(Math.max(0, invoiced - paid))} outstanding · ${fmtDetailed(savings)} savings</small>${liquidationRoleAccess().isFinanceOfficer && suppliers.length ? `<button class="btn primary" type="button" data-liq-supplier-batch-open>Update</button>` : ""}</div></div>
    ${suppliers.length ? `<div class="liquidation-supplier-ledger">
      <div class="liquidation-supplier-grid liquidation-ledger-head"><span>Supplier</span><span>Approved</span><span>Final Invoice</span><span>Paid</span><span>Balance</span><span>Savings</span><span>Supplier Invoice</span><span>Payment Proof</span><span>Status</span><span>Action</span></div>
      ${suppliers.map(supplier => `<div class="liquidation-supplier-grid liquidation-supplier-row is-${escapeHtml(supplier.status.tone)}">
        <div data-label="Supplier"><b>${escapeHtml(supplier.name)}</b><small>Supplier / company</small></div>
        <div data-label="Approved"><b>${fmtDetailed(supplier.approved)}</b><small>release basis</small></div>
        <div data-label="Final Invoice"><b>${fmtDetailed(supplier.finalInvoice)}</b><small>actual cost</small></div>
        <div data-label="Paid"><b>${fmtDetailed(supplier.paid)}</b><small>paid to date</small></div>
        <div data-label="Balance"><b>${fmtDetailed(Math.max(0, supplier.finalInvoice - supplier.paid))}</b><small>outstanding</small></div>
        <div data-label="Savings"><b>${fmtDetailed(supplier.savings)}</b><small>vs approved</small></div>
        ${liquidationSupplierDocumentCell(supplier.invoice, "Supplier invoice", supplier.id, "invoice")}
        ${liquidationSupplierDocumentCell(supplier.paymentProof, "Payment proof", supplier.id, "paymentProof")}
        <div class="liquidation-status-cell" data-label="Status">${fundReleaseDot(supplier.status.label, supplier.status.tone, "supplier-actualization")}<small>${escapeHtml(supplier.status.label)}</small></div>
        <div class="liquidation-supplier-action" data-label="Action">${liquidationRoleAccess().canViewAll ? `<button class="btn primary" type="button" data-liq-supplier-review="${escapeHtml(supplier.id)}">View</button>` : `<span class="liquidation-none">Summary only</span>`}</div>
      </div>`).join("")}
      <div class="liquidation-supplier-total"><span>Supplier Total</span><b>${fmtDetailed(approved)}</b><b>${fmtDetailed(invoiced)}</b><b>${fmtDetailed(paid)}</b><b>${fmtDetailed(Math.max(0, invoiced - paid))}</b><b>${fmtDetailed(savings)}</b><span></span><span></span><span></span><span></span></div>
    </div>` : `<div class="empty">No supplier releases are ready for actualization.</div>`}
  </section>`;
}

function liquidationSupplierDocumentCell(file, label, supplierId = "", documentType = "") {
  const complete = Boolean(file);
  const canView = liquidationRoleAccess().canViewAll;
  return `<div class="liquidation-supplier-document" data-label="${escapeHtml(label)}">
    ${fundReleaseDot(complete ? `${label} on file` : `${label} missing`, complete ? "good" : "warn", "supplier-documents")}
    ${complete && file.dataUrl ? canView ? `<button class="btn compact" type="button" data-liq-supplier-document="${escapeHtml(supplierId)}" data-liq-supplier-document-type="${escapeHtml(documentType)}">View</button>` : `<span class="liquidation-support-label">On file</span>` : `<span class="liquidation-support-label is-required">Missing</span>`}
  </div>`;
}

function liquidationTable(projectId) {
  const access = liquidationRoleAccess();
  const permittedProjectIds = new Set(accessibleProjects().map(item => item.id));
  const visible = db.liquidations.filter(item => {
    if (projectId && item.projectId !== projectId) return false;
    if (access.canViewAll) return true;
    if (!access.canViewSummary) return keyCell(item.employee) === keyCell(currentUser());
    if (!permittedProjectIds.has(item.projectId)) return false;
    return liquidationRoleAccess({ name:item.employee }).canViewDetails;
  });
  const rows = visible.sort((a,b) => agingDays(b.due) - agingDays(a.due)).map(l => ({ project:project(l.projectId).code, employee:l.employee, released:fmt(l.released), liquidated:fmt(l.liquidated), returned:fmt(l.returned), reimbursable:fmt(l.reimbursable), due:formatShortDate(l.due), aging:`${agingDays(l.due)} days`, balance:fmt(Math.max(0,l.released-l.liquidated-l.returned)), status:chip(l.status), findings:l.findings || "None" }));
  return simpleTable(rows, ["project","employee","released","liquidated","returned","reimbursable","due","aging","balance","status","findings"]);
}
function invoiceTable(projectId, source = db.invoices) {
  const rows = source.filter(i => !projectId || i.projectId === projectId).map(i => ({ project:project(i.projectId).code, invoice:i.invoiceNo, amount:fmt(i.amount), collected:fmt(i.collected), outstanding:fmt(i.amount-i.collected), due:formatShortDate(i.due), aging:chip(arAging(i)), status:chip(i.status) }));
  return simpleTable(rows, ["project","invoice","amount","collected","outstanding","due","aging","status"]);
}

const billingClientDefaults = {
  c1: { registeredName:"UNILAB, INC.", tin:"000-125-344-000", businessAddress:"66 United Street, Mandaluyong City" },
  c2: { registeredName:"AYALA LAND, INC.", tin:"", businessAddress:"" },
  c3: { registeredName:"JOLLIBEE FOODS CORPORATION", tin:"", businessAddress:"" }
};

function billingCanManage() {
  return state.role === "FINANCE OFFICER" || state.role === "FINANCE LEAD";
}

function billingIsAccounts() {
  return /^(ACCOUNTS HEAD|ACCOUNT MANAGER|ACCOUNT EXECUTIVE)$/.test(canonicalRole());
}

function billingInvoiceDetails(invoice = {}) {
  const p = project(invoice.projectId) || project(state.selectedProjectId);
  const c = client(p?.clientId) || {};
  const clientDefaults = billingClientDefaults[c.id] || {};
  const gross = roundCent(invoice.grossAmount ?? invoice.totalSales ?? invoice.amount ?? p?.approvedCe ?? p?.value ?? 0);
  const netOfVat = roundCent(invoice.netOfVat ?? gross / (1 + settings.vatDefault));
  const vatRate = Number.isFinite(Number(invoice.vatRate)) ? Number(invoice.vatRate) : settings.vatDefault * 100;
  const vat = roundCent(invoice.vat ?? netOfVat * vatRate / 100);
  const discount = roundCent(invoice.discount || 0);
  const withholdingRate = Number(invoice.withholdingRate || 0);
  const withholdingTax = roundCent(invoice.withholdingTax ?? netOfVat * withholdingRate / 100);
  const totalSales = roundCent(invoice.totalSales ?? netOfVat + vat);
  const amountDue = roundCent(invoice.amountDue ?? invoice.amount ?? totalSales - discount - withholdingTax);
  const lines = invoice.lines?.length ? invoice.lines : [{
    description:`Project Cost - ${p?.code || "Project"}`,
    quantity:1,
    unitCost:netOfVat,
    amount:netOfVat
  }];
  return {
    ...invoice,
    projectRecord:p,
    clientRecord:c,
    invoiceNo:invoice.invoiceNo || billingNextInvoiceNumber(),
    salesType:invoice.salesType || "Charge",
    paymentTerms:Number(invoice.paymentTerms || c.paymentTerms || 30),
    issued:invoice.issued || billingToday(),
    due:invoice.due || billingAddDays(invoice.issued || billingToday(), Number(invoice.paymentTerms || c.paymentTerms) || 30),
    registeredName:invoice.registeredName || clientDefaults.registeredName || c.company || "",
    tin:invoice.tin ?? clientDefaults.tin ?? "",
    businessAddress:invoice.businessAddress ?? clientDefaults.businessAddress ?? "",
    projectName:invoice.projectName || p?.name || "",
    poReference:invoice.poReference || "",
    preparedBy:invoice.preparedBy || "Maricar Tinitigan-Opeña",
    vatRate,
    netOfVat,
    vat,
    totalSales,
    discount,
    withholdingRate,
    withholdingTax,
    amountDue,
    lines
  };
}

function billingNextInvoiceNumber() {
  const configured = Number(localStorage.getItem(billingInvoiceSequenceStorageKey) || 0);
  if (!configured) return "";
  const max = [...db.invoices, ...billingArchivedInvoices].reduce((highest, invoice) => {
    const match = String(invoice.invoiceNo || "").match(/^INV\s*0*(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, configured);
  return `INV ${String(max + 1).padStart(4, "0")}`;
}

function billingAddDays(date, days) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(value.getTime())) return date;
  value.setUTCDate(value.getUTCDate() + Number(days || 0));
  return value.toISOString().slice(0, 10);
}

function billingToday() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Manila", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function billingDashboard(p) {
  const invoices = db.invoices.filter(invoice => invoice.projectId === p.id);
  const archived = billingArchivedInvoices.filter(invoice => invoice.projectId === p.id);
  const invoiceIds = new Set(invoices.map(invoice => invoice.id));
  const collections = db.collections.filter(collection => invoiceIds.has(collection.invoiceId)).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const billed = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const collected = invoices.reduce((sum, invoice) => sum + Number(invoice.collected || 0), 0);
  const outstanding = Math.max(0, billed - collected);
  const overdue = invoices.filter(invoice => billingAgingDays(invoice) > 0 && Number(invoice.collected || 0) < Number(invoice.amount || 0)).length;
  const clientRecord = client(p.clientId);
  const collectionComplete = invoices.length > 0 && outstanding <= 0;
  const invoiceTerms = [...new Set(invoices.map(invoice => billingInvoiceDetails(invoice).paymentTerms))];
  const termLabel = invoiceTerms.length > 1 ? "Per invoice" : `${invoiceTerms[0] || Number(clientRecord?.paymentTerms || 30)} days`;
  const reminders = billingCollectionReminders(p.id);
  const route = billingCanManage()
    ? "Record the BIR-accredited invoice, monitor its payment term, and document each partial or full collection until the project can close."
    : billingIsAccounts()
      ? "Accounts sends the uploaded invoice to the client and follows up until Finance records full collection."
      : "Billing records and uploaded BIR-accredited invoices are available here as project references.";
  return `<section class="billing-dashboard">
    <div class="billing-dashboard-head"><div><span>Revenue cycle</span><h2>Billing &amp; Collection</h2><p>${route}</p></div><div class="billing-head-actions">${archived.length ? `<button class="btn" type="button" data-billing-archived-toggle>Archived (${archived.length})</button>` : ""}${billingCanManage() ? `<button class="btn primary" type="button" data-billing-create>Record</button>` : ""}</div></div>
    <div class="billing-route is-four-step"><span>1</span><div><b>Accounts</b><small>Requests billing</small></div><i></i><span>2</span><div><b>Finance Officer</b><small>Writes, records, and uploads</small></div><i></i><span>3</span><div><b>Accounts</b><small>Sends and follows up</small></div><i></i><span>4</span><div><b>Finance Officer</b><small>Records collection</small></div></div>
    ${reminders.length ? `<section class="billing-reminders"><div><span>Collection Alerts</span><b>Finance, Accounts, and CEO notified</b></div>${reminders.map(reminder => `<article class="${reminder.days < 0 ? "is-overdue" : "is-due"}"><div><b>${escapeHtml(reminder.invoiceNo)}</b><small>${escapeHtml(reminder.urgency)} · ${formatShortDate(reminder.due)}</small></div><strong>${fmtDetailed(reminder.outstanding)}</strong></article>`).join("")}</section>` : ""}
    <div class="billing-collection-gate ${collectionComplete ? "is-complete" : "is-open"}"><div><span>Project Completion Gate</span><b>${collectionComplete ? "Collection complete · ready for final completion review" : `Project remains open · ${invoices.length ? `${fmtDetailed(outstanding)} still collectible` : "billing has not started"}`}</b><small>Post-audit may be completed earlier, but the project cannot close until every active invoice is fully collected.</small></div><div><span>Payment Terms</span><b>${escapeHtml(termLabel)}</b><small>Set manually per invoice: 30, 60, 90, or 120 days</small></div></div>
    <div class="billing-kpis">
      <div class="tone-neutral"><span>Approved Billing Basis</span><b>${fmtDetailed(p.approvedCe || p.value)}</b><small>Signed CE or project award</small></div>
      <div class="tone-active"><span>Billed to Date</span><b>${fmtDetailed(billed)}</b><small>${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}</small></div>
      <div class="tone-good"><span>Collected to Date</span><b>${fmtDetailed(collected)}</b><small>${collections.length} collection ${collections.length === 1 ? "entry" : "entries"}</small></div>
      <div class="${outstanding ? "tone-warn" : "tone-good"}"><span>Outstanding</span><b>${fmtDetailed(outstanding)}</b><small>${overdue} overdue</small></div>
    </div>
    <div class="billing-ledger">
      <div class="billing-ledger-head"><span>Invoice</span><span>Issued</span><span>Amount Due</span><span>Collected</span><span>Outstanding</span><span>Due</span><span>Status</span><span>Action</span></div>
      ${invoices.length ? invoices.map(invoice => {
        const detail = billingInvoiceDetails(invoice);
        const balance = Math.max(0, Number(invoice.amount || detail.amountDue) - Number(invoice.collected || 0));
        const tone = !balance ? "good" : billingAgingDays({ ...invoice, amount:detail.amountDue, due:detail.due }) > 0 ? "risk" : "warn";
        return `<div class="billing-ledger-row is-${tone}">
          <div data-label="Invoice"><b>${escapeHtml(detail.invoiceNo)}</b><small>${escapeHtml(detail.salesType)} sales</small></div>
          <div data-label="Issued"><b>${formatShortDate(detail.issued)}</b><small>${Number(detail.paymentTerms)}-day terms</small></div>
          <div data-label="Amount Due"><b>${fmtDetailed(detail.amountDue)}</b><small>${detail.withholdingTax ? `${fmtDetailed(detail.withholdingTax)} withholding` : "No withholding"}</small></div>
          <div data-label="Collected"><b>${fmtDetailed(invoice.collected || 0)}</b></div>
          <div data-label="Outstanding"><b>${fmtDetailed(balance)}</b></div>
          <div data-label="Due"><b>${formatShortDate(detail.due)}</b><small>${escapeHtml(billingDueLabel({ ...invoice, amount:detail.amountDue, due:detail.due }))}</small></div>
          <div data-label="Status">${fundReleaseDot(invoice.status || "Draft", tone, "billing")}<small>${escapeHtml(invoice.status || "Draft")}</small></div>
          <div data-label="Action" class="billing-row-actions"><button class="btn primary compact" type="button" data-billing-view="${escapeHtml(invoice.id)}">View</button>${billingCanManage() && balance > 0 ? `<button class="btn compact" type="button" data-billing-collect="${escapeHtml(invoice.id)}">Collect</button>` : ""}${billingCanManage() ? `<button class="btn danger compact" type="button" data-billing-archive="${escapeHtml(invoice.id)}">Archive</button>` : ""}</div>
        </div>`;
      }).join("") : `<div class="billing-empty">No invoice has been recorded for this project.</div>`}
    </div>
    <section class="billing-collection-register"><div class="billing-register-title"><div><span>Collection History</span><h3>Recorded Client Payments</h3></div><small>Partial collections accumulate against the invoice until its outstanding balance reaches zero.</small></div>${collections.length ? `<div class="billing-collection-head"><span>Date</span><span>Invoice</span><span>Amount</span><span>Method</span><span>Reference</span><span>Proof</span></div>${collections.map(collection => `<div class="billing-collection-row"><div data-label="Date"><b>${formatShortDate(collection.date)}</b></div><div data-label="Invoice"><b>${escapeHtml(db.invoices.find(invoice => invoice.id === collection.invoiceId)?.invoiceNo || collection.invoiceNo || "Invoice")}</b></div><div data-label="Amount"><b>${fmtDetailed(collection.amount)}</b></div><div data-label="Method"><b>${escapeHtml(collection.mode || "-")}</b></div><div data-label="Reference"><b>${escapeHtml(collection.reference || "-")}</b></div><div data-label="Proof">${collection.document?.dataUrl ? `<button class="btn compact" type="button" data-billing-collection-view="${escapeHtml(collection.id)}">View</button>` : `<small>No file</small>`}</div></div>`).join("")}` : `<div class="billing-empty">No collection has been recorded yet.</div>`}</section>
    ${state.billingArchivedOpen && archived.length ? `<section class="billing-archive-register"><div class="billing-archive-title"><div><span>Audit Register</span><h3>Archived Billing Entries</h3></div><small>Archived records are retained and excluded from active billing totals.</small></div>${archived.map(invoice => `<div class="billing-archive-row"><div><b>${escapeHtml(invoice.invoiceNo)}</b><small>${formatShortDate(invoice.issued)} · ${fmtDetailed(invoice.amount)}</small></div><div><span>Archived by</span><b>${escapeHtml(invoice.archivedBy || "Unknown")}</b><small>${escapeHtml(invoice.archivedAt ? new Date(invoice.archivedAt).toLocaleString("en-PH") : "")}</small></div><div><span>Reason</span><p>${escapeHtml(invoice.archiveReason || "No reason recorded")}</p></div><div class="billing-row-actions"><button class="btn compact" type="button" data-billing-view="${escapeHtml(invoice.id)}">View</button>${billingCanManage() && (invoice.document?.dataUrl || invoice.source !== "generated") ? `<button class="btn compact" type="button" data-billing-restore="${escapeHtml(invoice.id)}">Restore</button>` : ""}</div></div>`).join("")}</section>` : ""}
  </section>`;
}

function billingDaysToDue(invoice) {
  const today = new Date(`${billingToday()}T00:00:00+08:00`);
  const due = new Date(`${invoice.due}T00:00:00+08:00`);
  return Math.ceil((due - today) / 86400000);
}

function billingAgingDays(invoice) {
  return Math.max(0, -billingDaysToDue(invoice));
}

function billingDueLabel(invoice) {
  if (Number(invoice.collected || 0) >= Number(invoice.amount || 0)) return "Paid";
  const days = billingDaysToDue(invoice);
  if (days > 1) return `${days} days remaining`;
  if (days === 1) return "Due tomorrow";
  if (days === 0) return "Due today";
  const aging = Math.abs(days);
  return `Aging: ${aging} day${aging === 1 ? "" : "s"}`;
}

function billingReminderRoleEligible(role = state.role) {
  return /^(CEO|FINANCE LEAD|FINANCE OFFICER|ACCOUNTS HEAD|ACCOUNT MANAGER|ACCOUNT EXECUTIVE)$/.test(canonicalRole(role));
}

function billingCollectionReminders(projectId = "") {
  if (!billingReminderRoleEligible()) return [];
  return db.invoices.filter(invoice => (!projectId || invoice.projectId === projectId) && Number(invoice.collected || 0) < Number(invoice.amount || 0)).map(invoice => {
    const days = billingDaysToDue(invoice);
    if (![5, 3, 0].includes(days) && days >= 0) return null;
    const p = project(invoice.projectId);
    const urgency = days < 0 ? `Aging ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}` : days === 0 ? "Due today" : `Due in ${days} days`;
    return { projectId:invoice.projectId, invoiceId:invoice.id, invoiceNo:invoice.invoiceNo, project:p?.name || "Project", due:invoice.due, days, urgency, outstanding:Math.max(0, Number(invoice.amount || 0) - Number(invoice.collected || 0)) };
  }).filter(Boolean);
}

function billingLineRow(values = {}) {
  return `<div class="billing-form-line">
    <label><span>Nature of Service</span><input name="serviceDescription[]" value="${escapeHtml(values.description || "")}" placeholder="Project cost or service description" data-billing-line-required /></label>
    <label><span>Quantity</span><input name="serviceQuantity[]" type="number" min="0.01" step="0.01" value="${escapeHtml(values.quantity ?? 1)}" data-billing-calculate /></label>
    <label><span>Unit Cost</span><input name="serviceUnitCost[]" value="${values.unitCost ? escapeHtml(Number(values.unitCost).toFixed(2)) : ""}" data-money-input data-billing-calculate placeholder="0.00" /></label>
    <label><span>Amount</span><input name="serviceAmount[]" value="${values.amount ? escapeHtml(Number(values.amount).toFixed(2)) : "0.00"}" data-money-input readonly tabindex="-1" /></label>
    <button class="billing-line-remove" type="button" data-billing-line-remove aria-label="Remove service line" title="Remove service line">×</button>
  </div>`;
}

function billingInvoiceFormModal() {
  if (!state.billingFormOpen) return "";
  const p = project(state.selectedProjectId);
  if (!p || !billingCanManage()) return "";
  const c = client(p.clientId);
  const issued = billingToday();
  const due = billingAddDays(issued, c.paymentTerms || 30);
  const grossBasis = Number(p.approvedCe || p.value || 0);
  const suggestedInvoiceNo = billingNextInvoiceNumber();
  const sequenceConfigured = Boolean(Number(localStorage.getItem(billingInvoiceSequenceStorageKey) || 0));
  return `<div class="review-backdrop" role="presentation" data-billing-form-close>
    <section class="review-modal billing-entry-modal" role="dialog" aria-modal="true" aria-label="Record service invoice">
      <button class="modal-close" type="button" data-billing-form-close aria-label="Close billing form">×</button>
      <header class="billing-entry-heading">
        <div class="modal-kicker">${escapeHtml(state.role)}</div>
        <h2>Record BIR-Accredited Invoice</h2>
        <p>Record the invoice exactly as issued, then attach the scanned BIR-accredited copy for reference and collection tracking.</p>
      </header>
      <form id="billingInvoiceForm" class="billing-entry-form">
        <section class="billing-form-section is-project">
          <div class="is-project-context"><span>Project</span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.code)}</small></div>
          <div class="is-client-context"><span>Client</span><b>${escapeHtml(c.company)}</b><small>${escapeHtml(c.unit || c.brand)}</small></div>
          <div class="is-preparer-context"><span>Prepared By</span><b>${escapeHtml(currentUser())}</b><small>Filled from signed-in user</small></div>
          <div class="is-basis-context"><span>Billing Basis</span><b>${fmtDetailed(grossBasis)}</b><small>${p.approvedCe ? "Approved project value" : "Current project value"}</small></div>
        </section>
        <section class="billing-form-section is-invoice-details">
          <div class="billing-form-section-head"><div><span>Invoice Details</span><b>Enter the information shown on the issued invoice</b></div><small>Required fields must match the uploaded copy.</small></div>
          <div class="billing-form-grid">
            <div class="billing-number-control"><label><span>Invoice Number</span><input name="invoiceNo" value="${escapeHtml(suggestedInvoiceNo)}" placeholder="Enter current SI number" required /></label>${sequenceConfigured ? `<small>Suggested from the current Finance sequence; editable when needed.</small>` : `<label class="billing-sequence-toggle"><input name="setSequence" type="checkbox" /><span>Use as the current SI number</span></label>`}</div>
            <label class="billing-field-invoice-date"><span>Invoice Date</span><input name="issued" type="date" value="${issued}" required data-billing-issued /></label>
            <label class="billing-field-terms"><span>Payment Terms</span><select name="paymentTerms" required data-billing-terms>${[30,60,90,120].map(days => `<option value="${days}" ${Number(c.paymentTerms) === days ? "selected" : ""}>${days} days</option>`).join("")}</select></label>
            <label class="billing-field-due"><span>Due Date</span><input name="due" type="date" value="${due}" required data-billing-due /><small>Calculated automatically; editable.</small></label>
            <fieldset class="billing-sales-type"><legend>Sales Type</legend><label><input name="salesType" type="radio" value="Charge" checked /><span>Charge</span></label><label><input name="salesType" type="radio" value="Cash" /><span>Cash</span></label></fieldset>
            <label class="billing-field-particulars"><span>Particulars</span><textarea name="particulars" rows="2" placeholder="Service or billing milestone stated on the invoice" required></textarea></label>
            <label class="billing-field-amount"><span>Amount Due</span><input name="amount" inputmode="decimal" data-money-input placeholder="0.00" required /></label>
            <label class="billing-field-tax"><span>Withholding Tax</span><input name="withholdingTax" inputmode="decimal" data-money-input placeholder="0.00" value="0.00" /></label>
            <label class="billing-field-reference"><span>PO / Reference</span><input name="poReference" placeholder="Client PO or billing reference" /></label>
          </div>
        </section>
        <section class="billing-form-section billing-upload-section is-compact">
          <div class="billing-upload-copy"><span>Required Document</span><b>Scanned BIR-Accredited Invoice</b><small>PDF, JPG, or PNG. The original remains available to view or download.</small></div>
          <label class="billing-file-control"><input name="invoiceFile" type="file" accept="application/pdf,image/jpeg,image/png" data-billing-file /><span class="btn primary">Upload</span><small data-billing-file-name>No file uploaded</small></label>
        </section>
        <div class="modal-actions billing-entry-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-billing-form-close>Cancel</button></div>
      </form>
    </section>
  </div>`;
}

function billingInvoicePaper(invoice) {
  const detail = billingInvoiceDetails(invoice);
  const rows = [...detail.lines, ...Array.from({ length:Math.max(0, 9 - detail.lines.length) }, () => null)].slice(0, 9);
  const checked = type => detail.salesType.toLowerCase() === type.toLowerCase() ? "☑" : "☐";
  return `<article class="billing-invoice-paper">
    <header class="billing-paper-head">
      <div class="billing-paper-company"><div class="billing-paper-mark"><i></i><b>S</b></div><div><h1>SPOTLIGHT MULTIMEDIA INC.</h1><p>VAT Reg. TIN: 602-430-988-00000<br>86 Jasmin St. Roxas 1103 Quezon City NCR<br>Second District Philippines</p></div></div>
      <div class="billing-paper-title"><h2>SERVICE INVOICE</h2><strong>No. ${escapeHtml(String(detail.invoiceNo).replace(/^INV\s*/i, ""))}</strong><span>Date: ${formatShortDate(detail.issued)}</span></div>
    </header>
    <div class="billing-paper-sales"><span>${checked("Cash")} Cash Sales</span><span>${checked("Charge")} Charge Sales</span></div>
    <section class="billing-paper-client">
      <h3>Received from</h3>
      <div><span>Registered Name</span><b>${escapeHtml(detail.registeredName)}</b></div>
      <div><span>TIN</span><b>${escapeHtml(detail.tin)}</b></div>
      <div><span>Business Address</span><b>${escapeHtml(detail.businessAddress)}</b></div>
    </section>
    <section class="billing-paper-services">
      <div class="billing-paper-service-head"><span>Nature of Service</span><span>Quantity</span><span>Unit Cost</span><span>AMOUNT</span></div>
      ${rows.map((line, index) => `<div class="billing-paper-service-row"><span>${line ? escapeHtml(line.description) : index === 5 ? `<em>Project Name: ${escapeHtml(detail.projectName)}</em>` : ""}</span><span>${line ? escapeHtml(line.quantity) : ""}</span><span>${line ? fmtDetailed(line.unitCost) : ""}</span><span>${line ? fmtDetailed(line.amount) : ""}</span></div>`).join("")}
    </section>
    <section class="billing-paper-summary">
      <div class="billing-paper-vat"><div><span>VATABLE Sales</span><b>${fmtDetailed(detail.netOfVat)}</b></div><div><span>VAT</span><b>${fmtDetailed(detail.vat)}</b></div><div><span>Zero-Rated Sales</span><b>${fmtDetailed(0)}</b></div><div><span>VAT Exempt Sales</span><b>${fmtDetailed(0)}</b></div></div>
      <div class="billing-paper-totals"><div><span>Total Sales (VAT Inclusive)</span><b>${fmtDetailed(detail.totalSales)}</b></div><div><span>Less: VAT</span><b>${fmtDetailed(detail.vat)}</b></div><div><span>Amount Net of VAT</span><b>${fmtDetailed(detail.netOfVat)}</b></div><div><span>Less: Discount</span><b>${fmtDetailed(detail.discount)}</b></div><div><span>Add: VAT</span><b>${fmtDetailed(detail.vat)}</b></div><div><span>LESS: WITHHOLDING TAX</span><b>${fmtDetailed(detail.withholdingTax)}</b></div><div class="is-total"><span>TOTAL AMOUNT DUE</span><b>${fmtDetailed(detail.amountDue)}</b></div></div>
    </section>
    <section class="billing-paper-signature"><div><span>By:</span><strong>${escapeHtml(detail.preparedBy)}</strong><small>Cashier / Authorized Representative</small></div></section>
    <footer class="billing-paper-footer"><span>System-generated printable copy</span><span>${escapeHtml(detail.poReference ? `Reference: ${detail.poReference}` : detail.projectRecord?.code || "")}</span><span>Verify invoice serial and statutory details before client submission.</span></footer>
  </article>`;
}

function billingInvoicePreviewModal() {
  if (!state.billingPreviewId) return "";
  const invoice = db.invoices.find(item => item.id === state.billingPreviewId) || billingArchivedInvoices.find(item => item.id === state.billingPreviewId);
  if (!invoice) return "";
  const detail = billingInvoiceDetails(invoice);
  const documentRecord = invoice.document || {};
  const preview = documentRecord.dataUrl
    ? documentRecord.type === "application/pdf"
      ? `<iframe class="billing-document-frame" src="${escapeHtml(documentRecord.dataUrl)}" title="${escapeHtml(documentRecord.name || invoice.invoiceNo)}"></iframe>`
      : `<div class="billing-document-image"><img src="${escapeHtml(documentRecord.dataUrl)}" alt="Uploaded invoice ${escapeHtml(invoice.invoiceNo)}" /></div>`
    : `<div class="billing-document-missing"><b>No uploaded file is available.</b><p>This may be a legacy billing entry recorded before document uploads were required.</p></div>`;
  return `<div class="review-backdrop billing-preview-backdrop" role="presentation" data-billing-preview-close>
    <section class="review-modal billing-preview-modal billing-document-modal" role="dialog" aria-modal="true" aria-label="Uploaded service invoice">
      <div class="billing-preview-toolbar"><div><span>BIR-Accredited Invoice</span><b>${escapeHtml(invoice.invoiceNo)}</b><small>${escapeHtml(documentRecord.name || "No uploaded file")}</small></div>${documentRecord.dataUrl ? `<button class="btn primary" type="button" data-billing-download>Download</button>` : ""}<button class="btn" type="button" data-billing-preview-close>Close</button></div>
      <div class="billing-document-summary"><div><span>Project</span><b>${escapeHtml(detail.projectName)}</b></div><div><span>Invoice Date</span><b>${formatShortDate(detail.issued)}</b></div><div><span>Amount Due</span><b>${fmtDetailed(detail.amountDue)}</b></div><div><span>Status</span><b>${escapeHtml(invoice.status || "Recorded")}</b></div></div>
      ${preview}
    </section>
  </div>`;
}

function billingArchiveModal() {
  if (!state.billingArchiveId) return "";
  const invoice = db.invoices.find(item => item.id === state.billingArchiveId);
  if (!invoice) return "";
  return `<div class="review-backdrop" role="presentation" data-billing-archive-close><section class="review-modal billing-archive-modal" role="dialog" aria-modal="true" aria-label="Archive billing entry"><button class="modal-close" type="button" data-billing-archive-close aria-label="Close archive form">×</button><div class="modal-kicker">Audit-Safe Correction</div><h2>Archive ${escapeHtml(invoice.invoiceNo)}?</h2><p>This removes the entry from active billing totals without destroying its history or uploaded document.</p><form id="billingArchiveForm"><label><span>Reason for Archiving</span><textarea name="reason" rows="4" placeholder="Describe the mistake or why this entry should no longer be active." required></textarea></label><div class="modal-actions"><button class="btn danger" type="submit">Archive</button><button class="btn" type="button" data-billing-archive-close>Cancel</button></div></form></section></div>`;
}

function billingPersistInvoices() {
  const stored = db.invoices.filter(invoice => ["uploaded", "generated", "restored"].includes(invoice.source));
  try {
    localStorage.setItem(billingInvoiceStorageKey, JSON.stringify(stored));
  } catch (error) {
    const metadataOnly = stored.map(invoice => invoice.document ? { ...invoice, document:{ ...invoice.document, dataUrl:"", sessionOnly:true } } : invoice);
    localStorage.setItem(billingInvoiceStorageKey, JSON.stringify(metadataOnly));
  }
  billingGeneratedInvoices.splice(0, billingGeneratedInvoices.length, ...stored);
}

function billingPersistArchivedInvoices() {
  try {
    localStorage.setItem(billingArchiveStorageKey, JSON.stringify(billingArchivedInvoices));
  } catch (error) {
    const metadataOnly = billingArchivedInvoices.map(invoice => invoice.document ? { ...invoice, document:{ ...invoice.document, dataUrl:"", sessionOnly:true } } : invoice);
    localStorage.setItem(billingArchiveStorageKey, JSON.stringify(metadataOnly));
  }
}

async function billingSaveInvoice(formElement) {
  const form = new FormData(formElement);
  const invoiceNo = normalizeCell(form.get("invoiceNo"));
  const duplicate = [...db.invoices, ...billingArchivedInvoices].some(invoice => normalizeCell(invoice.invoiceNo).toLowerCase() === invoiceNo.toLowerCase());
  if (duplicate) {
    showFieldPrompt(formElement.querySelector('[name="invoiceNo"]'), "Use a unique invoice number.");
    return;
  }
  const fileInput = formElement.querySelector('[name="invoiceFile"]');
  const file = fileInput?.files?.[0];
  if (!file) {
    showFieldPrompt(fileInput, "Upload the BIR-accredited invoice before submitting.");
    return;
  }
  const amountDue = roundCent(parseMoney(form.get("amount")));
  if (amountDue <= 0) {
    showFieldPrompt(formElement.querySelector('[name="amount"]'), "Enter the amount shown on the invoice.");
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  const particulars = normalizeCell(form.get("particulars"));
  const withholdingTax = roundCent(parseMoney(form.get("withholdingTax")));
  const invoice = {
    id:`inv-uploaded-${Date.now()}`,
    source:"uploaded",
    projectId:state.selectedProjectId,
    invoiceNo,
    salesType:String(form.get("salesType") || "Charge"),
    paymentTerms:Number(form.get("paymentTerms") || 30),
    issued:String(form.get("issued") || ""),
    due:String(form.get("due") || ""),
    registeredName:client(project(state.selectedProjectId)?.clientId)?.company || "",
    projectName:project(state.selectedProjectId)?.name || "",
    poReference:normalizeCell(form.get("poReference")),
    preparedBy:currentUser(),
    particulars,
    lines:[{ description:particulars, quantity:1, unitCost:amountDue, amount:amountDue }],
    totalSales:amountDue,
    grossAmount:amountDue,
    withholdingTax,
    amountDue,
    amount:amountDue,
    collected:0,
    status:"FOR CLIENT SUBMISSION",
    document:{ name:file.name, type:file.type || "application/octet-stream", size:file.size, dataUrl, uploadedAt:new Date().toISOString(), uploadedBy:currentUser() }
  };
  const serialMatch = invoiceNo.match(/(\d+)(?!.*\d)/);
  const currentSequence = Number(localStorage.getItem(billingInvoiceSequenceStorageKey) || 0);
  if ((form.get("setSequence") || currentSequence) && serialMatch) {
    localStorage.setItem(billingInvoiceSequenceStorageKey, String(Math.max(currentSequence, Number(serialMatch[1]))));
  }
  db.invoices.push(invoice);
  db.activity.push({ projectId:invoice.projectId, at:new Date().toISOString().slice(0, 16).replace("T", " "), user:currentUser(), action:"BIR invoice recorded", from:"FOR BILLING", to:"FOR CLIENT SUBMISSION", comment:`${invoice.invoiceNo} recorded with ${file.name} for ${fmtDetailed(invoice.amountDue)}.` });
  billingPersistInvoices();
  state.billingFormOpen = false;
  state.billingPreviewId = invoice.id;
  render();
}

function billingArchiveInvoice(invoiceId, reason) {
  const index = db.invoices.findIndex(invoice => invoice.id === invoiceId);
  if (index < 0) return;
  const [invoice] = db.invoices.splice(index, 1);
  billingArchivedInvoices.unshift({ ...invoice, archivedAt:new Date().toISOString(), archivedBy:currentUser(), archiveReason:normalizeCell(reason) });
  db.activity.push({ projectId:invoice.projectId, at:new Date().toISOString().slice(0, 16).replace("T", " "), user:currentUser(), action:"Billing entry archived", from:invoice.status || "ACTIVE", to:"ARCHIVED", comment:`${invoice.invoiceNo}: ${normalizeCell(reason)}` });
  billingPersistInvoices();
  billingPersistArchivedInvoices();
  state.billingArchiveId = null;
  state.billingArchivedOpen = true;
  render();
}

function billingRestoreInvoice(invoiceId) {
  const index = billingArchivedInvoices.findIndex(invoice => invoice.id === invoiceId);
  if (index < 0) return;
  const [archived] = billingArchivedInvoices.splice(index, 1);
  const { archivedAt, archivedBy, archiveReason, ...invoice } = archived;
  db.invoices.push({ ...invoice, source:invoice.source === "generated" ? "restored" : invoice.source || "restored" });
  db.activity.push({ projectId:invoice.projectId, at:new Date().toISOString().slice(0, 16).replace("T", " "), user:currentUser(), action:"Billing entry restored", from:"ARCHIVED", to:invoice.status || "ACTIVE", comment:`${invoice.invoiceNo} restored to the active billing register.` });
  billingPersistInvoices();
  billingPersistArchivedInvoices();
  render();
}

function billingDownloadDocument(invoice) {
  const documentRecord = invoice?.document;
  if (!documentRecord?.dataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = documentRecord.dataUrl;
  anchor.download = documentRecord.name || `${invoice.invoiceNo}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function billingCollectionModal() {
  if (!state.billingCollectionInvoiceId) return "";
  const invoice = db.invoices.find(item => item.id === state.billingCollectionInvoiceId);
  if (!invoice || !billingCanManage()) return "";
  const detail = billingInvoiceDetails(invoice);
  const balance = Math.max(0, Number(detail.amountDue) - Number(invoice.collected || 0));
  return `<div class="review-backdrop" role="presentation" data-billing-collection-close><section class="review-modal billing-collection-modal" role="dialog" aria-modal="true" aria-label="Record client collection"><button class="modal-close" type="button" data-billing-collection-close aria-label="Close collection form">×</button><div class="modal-kicker">${escapeHtml(state.role)}</div><h2>Record Client Collection</h2><p>Record partial or full payment against ${escapeHtml(detail.invoiceNo)} and retain the collection proof.</p><div class="billing-collection-context"><div><span>Invoice Amount</span><b>${fmtDetailed(detail.amountDue)}</b></div><div><span>Previously Collected</span><b>${fmtDetailed(invoice.collected || 0)}</b></div><div><span>Outstanding</span><b>${fmtDetailed(balance)}</b></div><div><span>Due Date</span><b>${formatShortDate(detail.due)}</b><small>${escapeHtml(billingDueLabel({ ...invoice, amount:detail.amountDue, due:detail.due }))}</small></div></div><form id="billingCollectionForm" class="billing-entry-form"><section class="billing-form-section billing-form-grid"><label><span>Collection Date</span><input name="date" type="date" value="${billingToday()}" required /></label><label><span>Amount Collected</span><input name="amount" inputmode="decimal" data-money-input placeholder="0.00" required /></label><label><span>Payment Method</span><select name="mode" required><option value="">Select method</option><option>Bank transfer</option><option>Cheque deposit</option><option>Cash</option><option>Online payment</option></select></label><label><span>Reference Number</span><input name="reference" placeholder="Deposit, transfer, or OR reference" required /></label></section><section class="billing-form-section billing-upload-section"><div><span>Required Document</span><b>Proof of Collection</b><small>Upload the deposit slip, transfer confirmation, cheque clearing proof, or official receipt.</small></div><label class="billing-file-control"><input name="collectionFile" type="file" accept="application/pdf,image/jpeg,image/png" data-billing-collection-file /><span class="btn primary">Upload</span><small data-billing-collection-file-name>No file uploaded</small></label></section><div class="modal-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-billing-collection-close>Cancel</button></div></form></section></div>`;
}

function billingCollectionProofModal() {
  if (!state.billingCollectionPreviewId) return "";
  const collection = db.collections.find(item => item.id === state.billingCollectionPreviewId);
  if (!collection) return "";
  const documentRecord = collection.document || {};
  const preview = documentRecord.dataUrl
    ? documentRecord.type === "application/pdf"
      ? `<iframe class="billing-document-frame" src="${escapeHtml(documentRecord.dataUrl)}" title="${escapeHtml(documentRecord.name || "Collection proof")}"></iframe>`
      : `<div class="billing-document-image"><img src="${escapeHtml(documentRecord.dataUrl)}" alt="Collection proof" /></div>`
    : `<div class="billing-document-missing"><b>No collection proof is available.</b></div>`;
  return `<div class="review-backdrop billing-preview-backdrop" role="presentation" data-billing-collection-proof-close><section class="review-modal billing-preview-modal billing-document-modal" role="dialog" aria-modal="true" aria-label="Collection proof"><div class="billing-preview-toolbar"><div><span>Collection Proof</span><b>${escapeHtml(collection.invoiceNo || "Client payment")}</b><small>${escapeHtml(documentRecord.name || "No uploaded file")}</small></div>${documentRecord.dataUrl ? `<button class="btn primary" type="button" data-billing-collection-download>Download</button>` : ""}<button class="btn" type="button" data-billing-collection-proof-close>Close</button></div><div class="billing-document-summary"><div><span>Collection Date</span><b>${formatShortDate(collection.date)}</b></div><div><span>Amount</span><b>${fmtDetailed(collection.amount)}</b></div><div><span>Method</span><b>${escapeHtml(collection.mode || "-")}</b></div><div><span>Reference</span><b>${escapeHtml(collection.reference || "-")}</b></div></div>${preview}</section></div>`;
}

function billingPersistCollections() {
  try {
    localStorage.setItem(billingCollectionStorageKey, JSON.stringify(billingRecordedCollections));
  } catch (error) {
    const metadataOnly = billingRecordedCollections.map(collection => collection.document ? { ...collection, document:{ ...collection.document, dataUrl:"", sessionOnly:true } } : collection);
    localStorage.setItem(billingCollectionStorageKey, JSON.stringify(metadataOnly));
  }
}

async function billingSaveCollection(formElement) {
  const invoice = db.invoices.find(item => item.id === state.billingCollectionInvoiceId);
  if (!invoice) return;
  const detail = billingInvoiceDetails(invoice);
  const form = new FormData(formElement);
  const amount = roundCent(parseMoney(form.get("amount")));
  const balance = Math.max(0, Number(detail.amountDue) - Number(invoice.collected || 0));
  if (amount <= 0 || amount > balance) {
    showFieldPrompt(formElement.querySelector('[name="amount"]'), amount > balance ? `Amount cannot exceed the ${fmtDetailed(balance)} outstanding balance.` : "Enter the collected amount.");
    return;
  }
  const fileInput = formElement.querySelector('[name="collectionFile"]');
  const file = fileInput?.files?.[0];
  if (!file) {
    showFieldPrompt(fileInput, "Upload proof of collection before submitting.");
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  const collection = {
    id:`collection-${Date.now()}`,
    source:"recorded",
    projectId:invoice.projectId,
    invoiceId:invoice.id,
    invoiceNo:invoice.invoiceNo,
    date:String(form.get("date") || ""),
    amount,
    mode:String(form.get("mode") || ""),
    reference:normalizeCell(form.get("reference")),
    recordedAt:new Date().toISOString(),
    recordedBy:currentUser(),
    document:{ name:file.name, type:file.type || "application/octet-stream", size:file.size, dataUrl, uploadedAt:new Date().toISOString(), uploadedBy:currentUser() }
  };
  db.collections.push(collection);
  billingRecordedCollections.push(collection);
  invoice.collected = roundCent(Number(invoice.collected || 0) + amount);
  invoice.status = invoice.collected >= detail.amountDue ? "PAID" : "PARTIALLY PAID";
  db.activity.push({ projectId:invoice.projectId, at:new Date().toISOString().slice(0, 16).replace("T", " "), user:currentUser(), action:"Client collection recorded", from:"OUTSTANDING", to:invoice.status, comment:`${fmtDetailed(amount)} recorded against ${invoice.invoiceNo} via ${collection.mode}.` });
  billingPersistCollections();
  billingPersistInvoices();
  state.billingCollectionInvoiceId = null;
  render();
}

function billingDownloadCollectionProof(collection) {
  if (!collection?.document?.dataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = collection.document.dataUrl;
  anchor.download = collection.document.name || `${collection.invoiceNo || "collection"}-proof`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function billingUpdateFormTotals(formElement) {
  let netOfVat = 0;
  formElement.querySelectorAll(".billing-form-line").forEach(row => {
    const quantity = Number(row.querySelector('[name="serviceQuantity[]"]')?.value || 0);
    const unitCost = parseMoney(row.querySelector('[name="serviceUnitCost[]"]')?.value || 0);
    const amount = roundCent(quantity * unitCost);
    const amountInput = row.querySelector('[name="serviceAmount[]"]');
    if (amountInput) amountInput.value = amount.toLocaleString("en-PH", { minimumFractionDigits:2, maximumFractionDigits:2 });
    netOfVat += amount;
  });
  netOfVat = roundCent(netOfVat);
  const vatRate = Number(formElement.elements.vatRate?.value || 0);
  const vat = roundCent(netOfVat * vatRate / 100);
  const discount = roundCent(parseMoney(formElement.elements.discount?.value || 0));
  const withholdingRate = Number(formElement.elements.withholdingRate?.value || 0);
  const withholdingTax = roundCent(netOfVat * withholdingRate / 100);
  const totalSales = roundCent(netOfVat + vat);
  const amountDue = roundCent(totalSales - discount - withholdingTax);
  const values = { net:netOfVat, vat, sales:totalSales, withholding:withholdingTax, due:amountDue };
  Object.entries(values).forEach(([key, value]) => {
    const target = formElement.querySelector(`[data-billing-total="${key}"]`);
    if (target) target.textContent = fmtDetailed(value);
  });
  const issueDate = formElement.elements.issued?.value;
  const dueInput = formElement.elements.due;
  const p = project(state.selectedProjectId);
  const c = client(p?.clientId);
  if (issueDate && dueInput && document.activeElement === formElement.elements.issued) dueInput.value = billingAddDays(issueDate, c?.paymentTerms || 30);
}

function billingPdfText(value = "") {
  return String(value).normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function billingPdfMoney(value) {
  return Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function downloadBillingInvoicePdf(invoice) {
  const detail = billingInvoiceDetails(invoice);
  const commands = [];
  const text = (x, y, size, value, bold = false) => commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${billingPdfText(value)}) Tj ET`);
  const line = (x1, y1, x2, y2, width = .6) => commands.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const rect = (x, y, w, h, width = .6) => commands.push(`${width} w ${x} ${y} ${w} ${h} re S`);
  commands.push("0.36 0.15 0.46 rg 36 754 30 40 re f");
  commands.push("1 1 1 rg"); text(46, 770, 14, "S", true); commands.push("0 0 0 rg");
  text(76, 790, 17, "SPOTLIGHT MULTIMEDIA INC.", true);
  text(76, 775, 8, "VAT Reg. TIN: 602-430-988-00000");
  text(76, 764, 8, "86 Jasmin St. Roxas 1103 Quezon City NCR");
  text(76, 753, 8, "Second District Philippines");
  text(410, 790, 14, "SERVICE INVOICE", true);
  text(446, 762, 15, `No. ${String(detail.invoiceNo).replace(/^INV\s*/i, "")}`, true);
  text(426, 742, 9, `Date: ${formatShortDate(detail.issued)}`);
  text(44, 724, 9, `${detail.salesType === "Cash" ? "[x]" : "[ ]"} Cash Sales`);
  text(44, 710, 9, `${detail.salesType === "Charge" ? "[x]" : "[ ]"} Charge Sales`);
  rect(36, 632, 523, 66);
  line(36, 681, 559, 681); line(36, 657, 559, 657);
  text(42, 685, 8, "Received from", true);
  text(42, 666, 8, "Registered Name:"); text(145, 666, 9, detail.registeredName, true);
  text(42, 642, 8, "TIN:"); text(145, 642, 9, detail.tin, true);
  text(290, 642, 8, "Business Address:"); text(382, 642, 8, detail.businessAddress.slice(0, 45));
  rect(36, 340, 523, 280);
  [415, 487].forEach(x => line(x, 340, x, 620)); line(360, 340, 360, 620);
  line(36, 596, 559, 596);
  for (let y = 568; y >= 344; y -= 28) line(36, y, 559, y);
  text(138, 604, 8, "Nature of Service", true); text(370, 604, 8, "Quantity", true); text(435, 604, 8, "Unit Cost", true); text(510, 604, 8, "AMOUNT", true);
  detail.lines.slice(0, 8).forEach((item, index) => {
    const y = 579 - index * 28;
    text(44, y, 8, item.description.slice(0, 46)); text(382, y, 8, item.quantity); text(421, y, 7.2, billingPdfMoney(item.unitCost)); text(493, y, 7.2, billingPdfMoney(item.amount));
  });
  text(44, 353, 8, `Project Name: ${detail.projectName}`, true);
  rect(36, 242, 205, 80); line(36, 302, 241, 302); line(36, 282, 241, 282); line(36, 262, 241, 262);
  text(42, 308, 8, "VATABLE Sales"); text(155, 308, 8, billingPdfMoney(detail.netOfVat), true);
  text(42, 288, 8, "VAT"); text(155, 288, 8, billingPdfMoney(detail.vat), true);
  text(42, 268, 8, "Zero-Rated Sales"); text(155, 268, 8, billingPdfMoney(0));
  text(42, 248, 8, "VAT Exempt Sales"); text(155, 248, 8, billingPdfMoney(0));
  rect(315, 182, 244, 140); for (let y = 302; y >= 202; y -= 20) line(315, y, 559, y); line(455, 182, 455, 322);
  const totals = [["Total Sales (VAT Inclusive)", detail.totalSales], ["Less: VAT", detail.vat], ["Amount Net of VAT", detail.netOfVat], ["Less: Discount", detail.discount], ["Add: VAT", detail.vat], ["LESS: WITHHOLDING TAX", detail.withholdingTax], ["TOTAL AMOUNT DUE", detail.amountDue]];
  totals.forEach((item, index) => { const y = 308 - index * 20; text(322, y, 7.5, item[0], index === totals.length - 1); text(462, y, 7.5, billingPdfMoney(item[1]), index === totals.length - 1); });
  text(388, 132, 8, "By:"); text(420, 132, 10, detail.preparedBy, true); line(388, 118, 550, 118); text(407, 106, 7.5, "Cashier / Authorized Representative");
  text(36, 62, 7, "System-generated printable copy"); text(36, 50, 7, detail.poReference ? `Reference: ${detail.poReference}` : detail.projectRecord?.code || ""); text(335, 50, 7, "Verify statutory details before client submission.");
  const content = commands.join("\n");
  const objects = [null,
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type:"application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${detail.invoiceNo.replace(/[^a-z0-9]+/gi, "-")}-${detail.projectRecord?.code || "invoice"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function approvalTable() {
  return `<div class="review-table ce-review-table">
    <div class="review-head"><span>Project</span><span>Type</span><span>Approver</span><span>Status</span><span>Timestamp</span><span>Comments</span></div>
    ${db.approvals.map(a => `<button class="review-row" data-review="ce:${a.id}">
      <span><b>${project(a.projectId).code}</b></span>
      <span>${a.type}</span>
      <span>${a.approver}</span>
      <span>${chip(a.status)}</span>
      <span>${a.at || "Waiting"}</span>
      <span>${a.comments}</span>
    </button>`).join("")}
  </div>`;
}

function reviewSnapshotModal() {
  if (!state.reviewSnapshot) return "";
  const snapshot = reviewSnapshotData(state.reviewSnapshot);
  if (!snapshot) return "";
  return `<div class="review-backdrop" role="presentation" data-review-close="true">
    <section class="review-modal ${snapshot.kind ? `is-${snapshot.kind}` : ""}" role="dialog" aria-modal="true" aria-label="${snapshot.title}">
      <button class="modal-close" data-review-close="true" aria-label="Close review snapshot">×</button>
      <div class="modal-kicker">${snapshot.kicker}</div>
      <h2>${snapshot.title}</h2>
      <p>${snapshot.summary}</p>
      <div class="modal-grid">${snapshot.metrics.map(item => mini(item.label, item.value)).join("")}</div>
      ${snapshot.details}
      <div class="modal-actions">
        ${snapshot.projectId && snapshot.tab ? `<button class="btn primary" data-review-open="${snapshot.projectId}:${snapshot.tab}">View</button>` : ""}
        <button class="btn" data-review-close="true">Close</button>
      </div>
    </section>
  </div>`;
}

function crpDecisionModal() {
  if (!state.crpDecisionModal?.key) return "";
  const key = state.crpDecisionModal.key;
  const mode = state.crpDecisionModal.mode || "reject";
  const line = crpDecisionLineLookup(key) || {};
  const encodedKey = escapeHtml(encodeURIComponent(key));
  const isReject = mode === "reject";
  const isUnapprove = mode === "unapprove";
  const isAmount = mode === "amount";
  const title = isReject ? "Reject Request Line" : isUnapprove ? "Remove Approval" : isAmount ? "Edit Request Amount" : "Reply to Review Note";
  const kicker = isReject ? "Reason required" : isUnapprove ? "Undo approval" : isAmount ? "Requester correction" : "Requester response";
  const textareaLabel = isReject ? "Reason for rejection" : isUnapprove ? "Reason for removing approval" : isAmount ? "Correction note" : "Reply";
  const buttonLabel = "Submit";
  const helper = isReject
    ? "This will notify the requester and place the note under the line item until it is answered or approved."
    : isUnapprove
      ? "This removes the approval and adds the reason under the line item for tracking."
    : "This response will be added under the line item so approvers can review the trail before approving.";
  const amount = crpLineRequestAmount(line);
  return `<div class="review-backdrop" role="presentation" data-crp-decision-modal-close="true">
    <section class="review-modal crp-decision-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <button class="modal-close" data-crp-decision-modal-close="true" aria-label="Close decision form">×</button>
      <div class="modal-kicker">${kicker}</div>
      <h2>${title}</h2>
      <p>${helper}</p>
      <form id="crpDecisionForm" class="crp-decision-form" data-crp-decision-form="${encodedKey}" data-crp-decision-mode="${escapeHtml(mode)}">
        <div class="crp-modal-line">
          <span>${escapeHtml(line.runName || line.sourceSheet || "CRP line")}${line.sourceRow ? ` · Row ${escapeHtml(line.sourceRow)}` : ""}</span>
          <b>${escapeHtml(line.description || line.category || "Budget request")}</b>
          ${amount ? `<small>Current request ${fmtDetailed(amount)}</small>` : ""}
        </div>
        ${isAmount ? `<label><span>Corrected amount</span><input name="amount" data-money-input value="${amount || ""}" required /></label>` : ""}
        <label><span>${textareaLabel}</span><textarea name="message" required placeholder="${isReject ? "Example: supplier quote missing, amount needs correction, or recipient needs clarification." : isUnapprove ? "Example: approved by mistake, still needs supplier support, or amount needs another look." : "Add the response or correction made for this request line."}"></textarea></label>
        <div class="modal-actions">
          <button class="btn primary" type="submit">${buttonLabel}</button>
          <button class="btn" type="button" data-crp-decision-modal-close="true">Cancel</button>
        </div>
      </form>
    </section>
  </div>`;
}

function crpCounterpartyModal() {
  const key = state.crpCounterpartyKey;
  if (!key) return "";
  const line = crpDecisionLineLookup(key);
  if (!line) return "";
  const party = crpCounterpartyRecord(line);
  const cashRequest = (Number(line.cashRequest) || 0) > 0 || (!Object.hasOwn(line, "cashRequest") && /cash/i.test(normalizeCell(line.releaseType)) && (Number(line.amount) || 0) > 0);
  return `<div class="review-backdrop" role="presentation" data-crp-counterparty-close="true">
    <section class="review-modal crp-counterparty-modal" role="dialog" aria-modal="true" aria-label="Classify CRP counterparties">
      <button class="modal-close" type="button" data-crp-counterparty-close="true" aria-label="Close classification">×</button>
      <div class="modal-kicker">CRP · Counterparties</div>
      <h2>Classify This Request</h2>
      <div class="crp-modal-line"><span>${escapeHtml(line.runName || line.sourceSheet || "CRP")}${line.sourceRow ? ` · Row ${escapeHtml(line.sourceRow)}` : ""}</span><b>${escapeHtml(line.description || line.category || "Budget line")}</b></div>
      ${party.mixed ? `<p class="counterparty-warning">Two names may share one workbook cell. Confirm which person holds the cash and who provides the goods or service.</p>` : ""}
      <form id="crpCounterpartyForm" class="counterparty-form" data-crp-counterparty-form="${escapeHtml(encodeURIComponent(key))}">
        <label><span>Spotlight employee holding cash</span><input name="custodian" value="${escapeHtml(party.custodian)}" ${cashRequest ? "required" : ""} placeholder="Employee name, if cash is released" /></label>
        <label><span>Final provider / payee</span><input name="provider" value="${escapeHtml(party.provider)}" placeholder="Supplier, small vendor, or professional" /></label>
        <label><span>Provider type</span><select name="type" required>${counterpartyTypeOptions(party.type)}</select></label>
        <div class="modal-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-crp-counterparty-close="true">Cancel</button></div>
      </form>
      ${party.history.length ? `<div class="counterparty-history"><b>Classification trail</b>${party.history.map(item => `<p>${escapeHtml(item.by)} · ${formatLiquidationTimestamp(item.at)} · ${escapeHtml(counterpartyTypeLabel(item.type))} · ${escapeHtml(item.provider || "No provider recorded")}</p>`).join("")}</div>` : ""}
    </section>
  </div>`;
}

function fundReleaseNoteModal() {
  if (!state.fundReleaseNoteModal?.key) return "";
  const key = state.fundReleaseNoteModal.key;
  const row = fundReleaseLineLookup(key);
  const line = row?.line || {};
  const encodedKey = escapeHtml(encodeURIComponent(key));
  const amount = row ? roundCent((row.cashRequested || 0) + (row.chequeRequested || 0)) : 0;
  return `<div class="review-backdrop" role="presentation" data-fund-note-modal-close="true">
    <section class="review-modal fund-note-modal" role="dialog" aria-modal="true" aria-label="Add release note">
      <button class="modal-close" data-fund-note-modal-close="true" aria-label="Close release note">×</button>
      <div class="modal-kicker">Release Note</div>
      <h2>Add Line Note</h2>
      <p>Use this for client-directed reallocations, finance context, or internal instructions that should be tracked without changing the signed file.</p>
      <form id="fundReleaseNoteForm" class="crp-decision-form" data-fund-note-form="${encodedKey}">
        <div class="crp-modal-line">
          <span>${escapeHtml(line.sourceVersion || row?.upload?.version || "Fund release")}${line.sourceRow ? ` · Row ${escapeHtml(line.sourceRow)}` : ""}</span>
          <b>${escapeHtml(line.description || line.category || row?.release?.category || "Budget release")}</b>
          ${amount ? `<small>Request amount ${fmtDetailed(amount)}</small>` : ""}
        </div>
        <label><span>Note</span><textarea name="message" required placeholder="Example: Client requested reallocation from Styling to Staging. Keep signed file unchanged and track the instruction here."></textarea></label>
        <div class="modal-actions">
          <button class="btn primary" type="submit">Submit</button>
          <button class="btn" type="button" data-fund-note-modal-close="true">Cancel</button>
        </div>
      </form>
    </section>
  </div>`;
}

function fundReleaseOverrideModal() {
  if (!state.fundReleaseOverrideOpen || !fundReleaseCanManage()) return "";
  const p = project(state.selectedProjectId);
  if (!p) return "";
  const references = fundReleaseCrpRows(p.id);
  const sourceOptions = references.map(row => {
    const line = row.line || {};
    const label = `${line.sourceVersion || row.upload?.version || "CRP"}${line.sourceRow ? ` · Row ${line.sourceRow}` : ""} · ${line.description || line.category || "Budget line"}`;
    return `<option value="${escapeHtml(encodeURIComponent(row.key))}">${escapeHtml(label)}</option>`;
  }).join("");
  const targetOptions = references.map((row, index) => {
    const line = row.line || {};
    const label = `${line.sourceVersion || row.upload?.version || "CRP"}${line.sourceRow ? ` · Row ${line.sourceRow}` : ""} · ${line.description || line.category || "Budget line"}`;
    return `<option value="${escapeHtml(encodeURIComponent(row.key))}" ${index === 1 ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
  const canReallocate = references.length > 1;
  return `<div class="review-backdrop" role="presentation" data-fund-override-close="true">
    <section class="review-modal fund-override-modal" role="dialog" aria-modal="true" aria-label="Add budget reallocation">
      <button class="modal-close" type="button" data-fund-override-close="true" aria-label="Close budget reallocation">×</button>
      <div class="modal-kicker">Budget Reallocation</div>
      <h2>Reallocate Budget</h2>
      <p>Move an amount from one approved CRP line to another. The original CRP stays unchanged while this red line preserves the Finance trail.</p>
      <form id="fundReleaseOverrideForm" class="crp-decision-form">
        <label><span>Take budget from</span><select name="sourceKey" required ${canReallocate ? "" : "disabled"}>${sourceOptions || `<option value="">No CRP line items available</option>`}</select></label>
        <label><span>Move budget to</span><select name="referenceKey" required ${canReallocate ? "" : "disabled"}>${targetOptions || `<option value="">No CRP line items available</option>`}</select></label>
        <label><span>Particulars</span><input name="description" required placeholder="Example: Additional supplier delivery fee" /></label>
        <div class="fund-override-fields">
          <label><span>Release type</span><select name="mode" required><option value="cash">Cash</option><option value="cheque">Cheque</option></select></label>
          <label><span>Amount</span><input name="amount" data-money-input required placeholder="0.00" /></label>
        </div>
        <label><span>Person or supplier name</span><input name="party" required placeholder="Employee, professional, store, or company" /></label>
        <label><span>Reason for reallocation</span><textarea name="reason" required placeholder="Explain why the approved budget is being moved between these line items."></textarea></label>
        <div class="modal-actions">
          <button class="btn danger" type="submit" ${canReallocate ? "" : "disabled"}>Reallocate</button>
          <button class="btn" type="button" data-fund-override-close="true">Cancel</button>
        </div>
      </form>
    </section>
  </div>`;
}

function liquidationSubmitModal() {
  if (!state.liquidationSubmitOpen) return "";
  const p = project(state.selectedProjectId);
  if (!p) return "";
  const financeForm = liquidationRoleAccess().isFinanceOfficer || state.liquidationFinancePreview;
  const account = liquidationAccountProfile(state.liquidationFinancePreview);
  const projectClient = client(p.clientId);
  return `<div class="review-backdrop liquidation-submit-backdrop" role="presentation" data-liq-submit-close="true">
    <section class="review-modal liquidation-submit-modal ${state.liquidationFormCompact ? "is-compact" : ""}" role="dialog" aria-modal="true" aria-label="Submit liquidation">
      <div class="liquidation-window-actions">
        <button class="liquidation-window-toggle" type="button" data-liq-window-toggle="true" aria-pressed="${state.liquidationFormCompact}" title="${state.liquidationFormCompact ? "Maximize liquidation form" : "Minimize liquidation form"}">${state.liquidationFormCompact ? "Maximize" : "Minimize"}</button>
        <button class="modal-close" type="button" data-liq-submit-close="true" aria-label="Close liquidation form">×</button>
      </div>
      <div class="modal-kicker">${state.liquidationFinancePreview ? "Finance Officer Form · Preview Only" : financeForm ? "Finance Officer Liquidation" : "Employee Liquidation"}</div>
      <h2>Liquidation Report</h2>
      <p>Complete the project details, released funds, transfers, and expenses. Return or reimbursement is calculated automatically.</p>
      <form id="liquidationSubmitForm" class="liquidation-submit-form">
        <section class="liquidation-form-section">
          <div class="liquidation-section-heading"><div><span>Project Information</span><small>Prepared by and project details</small></div></div>
          <div class="liquidation-form-grid">
            <label class="is-wide"><span>Prepared By</span><input name="employee" value="${escapeHtml(account.name)}" readonly /></label>
            <label><span>Job Title</span><input name="jobTitle" value="${escapeHtml(account.jobTitle)}" readonly /></label>
            <label><span>Department</span><input name="department" value="${escapeHtml(account.department)}" readonly /></label>
            <label class="is-wide"><span>Project Name</span><input value="${escapeHtml(p.name)}" readonly /></label>
            <label><span>Project Code</span><input value="${escapeHtml(p.code)}" readonly /></label>
            <label><span>Client</span><input value="${escapeHtml(projectClient?.company || "")}" readonly /></label>
            <label><span>Event Date</span><input name="eventDate" type="date" value="${escapeHtml(p.liveDate || "")}" readonly /></label>
            <label><span>Venue</span><input value="${escapeHtml(p.venue || "")}" readonly /></label>
            <label><span>Date of Liquidation</span><input value="Set automatically on submission" readonly /></label>
            <label><span>Liquidation Due · ${p.provincial ? settings.liquidationDeadlineProvincialDays : settings.liquidationDeadlineMetroDays} days</span><input name="due" type="date" value="${liquidationProjectDueDate(p)}" readonly /></label>
          </div>
        </section>
        <div class="liquidation-live-summary ${financeForm ? "is-finance" : ""}" aria-live="polite">
          <div><span>Total Released</span><b id="liqTotalReleased">₱0.00</b></div><div><span>Total Transferred</span><b id="liqTotalTransferred">₱0.00</b></div><div><span>Total Liquidated</span><b id="liqTotalLiquidated">₱0.00</b></div><div id="liqVarianceCard"><span id="liqVarianceLabel">For Return</span><b id="liqVariance">₱0.00</b></div>
          ${financeForm ? `<div class="is-cheque"><span>Cheque Expenses</span><b id="liqChequeTotal">₱0.00</b></div>` : ""}
        </div>
        ${liquidationEntrySection("released", "Released Funds", "Pre-filled from Spotlight releases and colleague transfers for this project only.", liquidationPrefilledReleaseRows(p, account.name))}
        ${liquidationEntrySection("transfer", "Transfer Funds", "Transfers remain with this project. Upload an acknowledgment receipt for every recipient.")}
        <datalist id="liquidationEmployeeSuggestions">${liquidationProductionEmployees().filter(name => keyCell(name) !== keyCell(currentUser())).map(name => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>
        <details class="liquidation-payee-glossary"><summary>Payee type guide</summary><div>
          <p><b>Store supplier</b> Shop or company supplying goods or services, including small stores.</p>
          <p><b>Individual supplier</b> Person supplying goods without operating a shop.</p>
          <p><b>Professional fee</b> Payment for a person's time or expertise, such as a director.</p>
          <p><b>Other</b> Specify a classification when none of these fit.</p>
        </div></details>
        ${liquidationEntrySection("receipt", financeForm ? "Expense With Receipt (Cash)" : "Expense With Receipt", "Use valid VAT or non-VAT official receipts and attach readable copies.")}
        ${liquidationEntrySection("noReceipt", "Expense Without Receipt", "For manpower or small vendors without an official receipt. Name, address, and contact details are required.")}
        ${financeForm ? liquidationEntrySection("cheque", "Expense With Receipt (Cheque)", "Link each payment to a project supplier payable and attach the invoice and cheque proof.") : ""}
        <section class="liquidation-return-panel" id="liquidationReturnPanel" hidden>
          <div><span>Cash Return Required</span><b id="liqReturnAmount">₱0.00</b><small>Return this exact amount before submitting the liquidation.</small></div>
          ${liquidationUploadControl("cashReturnConfirmation", "Transaction Confirmation Screenshot", "image/*")}
          <p>The return remains subject to Finance verification. Submission is locked until the confirmation is attached.</p>
        </section>
        <section class="liquidation-reimbursement-panel" id="liquidationReimbursementPanel" hidden>
          <div><span>Reimbursement Requested</span><b id="liqReimbursementAmount">₱0.00</b></div>
          <p>This liquidation will undergo a Finance audit. Reimbursement will be released only after the audit is cleared and the request receives CEO approval.</p>
        </section>
        <label class="liquidation-form-note" id="liquidationSubmissionNote" hidden><span>Reimbursement reference note · Required</span><textarea name="message" data-required-message="Please explain the reimbursement before submitting." placeholder="Explain the expense and why it exceeded the released amount."></textarea></label>
        <details class="liquidation-policy-disclosure"><summary><span>Terms &amp; Conditions</span><small>Cash Handling &amp; Liquidations Policy</small></summary><div class="liquidation-policy-body">
          <h3>Cash Handling &amp; Liquidations Policy</h3>
          <p><b>1. Coverage.</b> Applies to employees handling company funds, including cash advances, reimbursements, and supplier-related payments.</p>
          <p><b>2. Accountability.</b> Funds may only be used for the approved project and purpose. A signed acknowledgment receipt is required upon receipt and for internal transfers. The receiving employee remains accountable until Finance verifies and accepts the liquidation.</p>
          <p><b>3. Prohibitions.</b> Personal use, use for another project without approval, and undocumented or unapproved transactions are prohibited.</p>
          <p><b>4. Deadlines and documents.</b> Manila projects must be liquidated within 7 days after the event; provincial projects within 14 days. Official receipts are preferred. When unavailable, provide the payee's name, address, and contact number. Late liquidation may suspend future releases.</p>
          <p><b>5. Discrepancies.</b> Excess funds must be returned immediately. Missing or unsupported expenses may require repayment unless approved. Shortfalls are reimbursable only after validation and required CEO clearance.</p>
          <p><b>6. Loss or misuse.</b> Report incidents immediately. Recovery may include repayment or other lawful offsets, and violations may result in disciplinary action.</p>
          <p><b>7. Enforcement.</b> Noncompliance may delay reimbursement, suspend future releases, affect incentives, or lead to disciplinary action.</p>
          <p><b>8. Compliance and audit.</b> Use official company forms and systems. Unrecorded transactions are invalid, and the company may audit or request supporting documents at any time.</p>
          <p><b>9. Legal basis.</b> Labor Code of the Philippines, applicable BIR rules, and the Company Handbook.</p>
        </div></details>
        <details class="liquidation-policy-disclosure liquidation-acknowledgement-disclosure"><summary><span>Acknowledgement</span><small>Review the accountability statement</small></summary><div class="liquidation-policy-body liquidation-acknowledgement-body">
          <p>I acknowledge that the funds were used solely for the approved project and purpose; unsupported expenses may require repayment; company policy governs this liquidation; and noncompliance may delay reimbursement, suspend future releases or incentives, or result in disciplinary action.</p>
        </div></details>
        <label class="liquidation-policy-ack"><input name="policyAccepted" type="checkbox" required /><span>I confirm that this liquidation is complete, accurate, and compliant, and I accept accountability until Finance verifies and clears it.</span></label>
        <div class="liquidation-calculation-note"><b>Automatic checks</b><span>Internal transfers reduce the employee's accountability. Unused cash becomes a return due; spending above the accountable amount becomes an abono requiring CEO clearance.</span></div>
        <div class="modal-actions">
          <button class="btn primary" type="submit" ${state.liquidationFinancePreview ? `disabled title="CEO preview cannot submit as the Finance Officer."` : ""}>Submit</button>
          <button class="btn" type="button" data-liq-submit-close="true">Cancel</button>
        </div>
      </form>
      <div class="liquidation-file-preview" id="liquidationFilePreview" hidden role="dialog" aria-modal="true" aria-label="Uploaded file preview"><div class="liquidation-file-preview-head"><b>Uploaded File</b><button type="button" data-liq-file-close aria-label="Close file preview">×</button></div><div class="liquidation-file-preview-media" data-liq-file-media></div></div>
    </section>
  </div>`;
}

function liquidationUploadControl(name, label, accept = "image/*,.pdf", requiredWhenActive = false) {
  const rowValidation = requiredWhenActive ? "data-liq-activity data-liq-required" : "";
  const message = name === "transferArFiles[]" ? "Please upload an acknowledgment receipt for this transfer."
    : name === "receiptFiles[]" ? "Please upload the receipt for this expense."
      : name === "noReceiptFiles[]" ? "Please upload an AR or other expense support."
        : name === "chequeReceiptFiles[]" ? "Upload the supplier invoice or official receipt."
          : name === "chequeProofFiles[]" ? "Upload the cheque or transfer payment proof."
        : "";
  const requiredMessage = message ? `data-required-message="${message}"` : "";
  return `<label class="liquidation-file-control"><span>${label}</span><div><input class="liquidation-file-input" name="${name}" type="file" accept="${accept}" ${rowValidation} ${requiredMessage} /><button class="btn" type="button" data-liq-file-trigger>Upload</button><button class="btn primary" type="button" data-liq-file-view hidden>View</button></div></label>`;
}

function liquidationAccountProfile(financePreview = false) {
  if (financePreview) {
    const financeOfficer = db.users.find(user => user.role === "FINANCE OFFICER");
    return { name:financeOfficer?.name || "Finance Officer", jobTitle:"FINANCE OFFICER", department:"Finance & Management" };
  }
  const department = state.role.includes("FINANCE") || state.role.includes("CEO") ? "Finance & Management"
    : state.role.includes("ACCOUNTS") || state.role.includes("CLIENT") ? "Accounts"
      : state.role.includes("CREATIVE") || state.role.includes("GRAPHIC") || state.role.includes("COPY") || state.role.includes("3D") ? "Creative"
        : state.role.includes("HR") || state.role.includes("WAREHOUSE") ? "Administration"
          : "Implementation / Production";
  return { name:currentUser(), jobTitle:state.role, department };
}

function liquidationProductionEmployees() {
  return db.users.filter(user => /implementation|production|operations|event|procurement|field|coordinator/i.test(user.role))
    .map(user => user.name).sort((a, b) => a.localeCompare(b));
}

function liquidationPrefilledReleaseRows(p, accountName = currentUser()) {
  const employee = keyCell(accountName);
  const spotlightRows = liquidationSpotlightCashReleases(p).get(employee)?.rows || [];
  const model = state.liquidationScenarioPreview ? liquidationScenarioData(p) : liquidationLiveData(p);
  const matched = model.employees.find(item => keyCell(item.name) === employee);
  const incomingRows = (matched?.releasedFunds || []).filter(row => keyCell(row.from || "Spotlight") !== "spotlight");
  if (spotlightRows.length) return [...spotlightRows, ...incomingRows];
  if (state.liquidationScenarioPreview && matched?.spotlightReleased) return [
    { date:matched.submittedAt || "2026-09-19", from:"Spotlight", method:"Bank Transfer", reference:"Draft transfer confirmation", remarks:"Simulated project cash release", amount:roundCent(matched.spotlightReleased) },
    ...incomingRows
  ];
  if (incomingRows.length) return incomingRows;
  return [{ from:"Spotlight", method:"Bank Transfer", remarks:"No released cash recorded for this account", amount:0 }];
}

function liquidationEntrySection(type, title, helper, rows = null) {
  const addControls = type === "released"
    ? `<span class="liquidation-locked-source">Project-scoped sources</span>`
    : `<div class="liquidation-add-row-group" aria-label="Add rows"><span>Add rows</span>${[1,3,5].map(count => `<button class="btn compact" type="button" data-liq-add-row="${type}" data-liq-add-count="${count}">+${count}</button>`).join("")}</div>`;
  const entries = rows?.length ? rows.map(row => liquidationEntryRow(type, row)).join("") : liquidationEntryRow(type);
  return `<section class="liquidation-form-section liquidation-entry-section" data-liq-section="${type}"><div class="liquidation-section-heading"><div><span>${title}</span><small>${helper}</small></div><div class="liquidation-section-tools"><strong data-liq-section-counter="${type}">0 entries · ₱0.00</strong>${addControls}</div></div><div class="liquidation-entry-list" data-liq-entry-list="${type}">${entries}</div></section>`;
}

function liquidationEntryRow(type, seed = {}) {
  const remove = `<button class="liquidation-row-remove" type="button" data-liq-remove-row aria-label="Remove row">×</button>`;
  if (type === "cheque") {
    const p = project(state.selectedProjectId);
    const model = state.liquidationScenarioPreview ? liquidationScenarioData(p) : liquidationLiveData(p);
    const options = (model.suppliers || []).map(supplier => `<option value="${escapeHtml(supplier.id)}">${escapeHtml(supplier.name)} · ${fmtDetailed(supplier.finalInvoice - supplier.paid)} open</option>`).join("");
    return `<div class="liquidation-entry-row is-expense is-cheque"><label><span>Date</span><input name="chequeDate[]" type="date" data-liq-activity data-liq-required /></label><label><span>Supplier</span><select name="chequeSupplierId[]" data-liq-activity data-liq-required><option value="">Select supplier</option>${options}</select></label><label><span>Payment</span><select name="chequePaymentStage[]" data-liq-required><option value="">DP or FP</option><option value="DP">Downpayment (DP)</option><option value="FP">Full payment (FP)</option></select></label><label><span>Particulars</span><input name="chequeParticulars[]" data-liq-activity data-liq-required /></label><label><span>TIN #</span><input name="chequeTin[]" data-liq-activity data-liq-required /></label><label><span>Address</span><input name="chequeAddress[]" data-liq-activity data-liq-required /></label><label><span>OR #</span><input name="chequeOr[]" data-liq-activity data-liq-required /></label><label><span>Receipt Type</span><select name="chequeReceiptType[]" data-liq-required><option>VAT</option><option>Non-VAT</option></select></label><label><span>Amount</span><input name="chequeAmount[]" data-money-input data-liq-activity data-liq-required data-liq-total="cheque" placeholder="0.00" /></label><label><span>Cheque / Payment Ref</span><input name="chequeReference[]" data-liq-activity data-liq-required /></label>${liquidationUploadControl("chequeReceiptFiles[]", "Invoice / Receipt", "image/*,.pdf", true)}${liquidationUploadControl("chequeProofFiles[]", "Cheque / Payment Proof", "image/*,.pdf", true)}${remove}</div>`;
  }
  if (type === "released") return `<div class="liquidation-entry-row is-released is-prefilled"><label><span>Date</span><input name="releasedDate[]" type="date" value="${escapeHtml(seed.date || "")}" readonly /></label><label><span>Released From</span><input name="releasedFrom[]" value="${escapeHtml(seed.from || "Spotlight")}" readonly /></label><label><span>Method</span><input name="releasedMethod[]" value="${escapeHtml(seed.method || "Bank Transfer")}" readonly /></label><label><span>Reference / AR</span><input name="releasedReference[]" value="${escapeHtml(seed.reference || "")}" readonly /></label><label><span>Remarks</span><input name="releasedRemarks[]" value="${escapeHtml(seed.remarks || "")}" readonly /></label><label><span>Amount</span><input name="releasedAmount[]" value="${escapeHtml(seed.amount || 0)}" data-money-input data-liq-total="released" readonly /></label></div>`;
  if (type === "transfer") return `<div class="liquidation-entry-row is-transfer"><label><span>Date</span><input name="transferDate[]" type="date" data-liq-activity data-liq-required /></label><label><span>Transferred To</span><input name="transferTo[]" list="liquidationEmployeeSuggestions" autocomplete="off" placeholder="Spotlight employee" data-liq-activity data-liq-required /><small class="liquidation-transfer-identity-note" hidden>Is this a new Spotlight employee or someone outside Spotlight?</small><select name="transferIdentity[]" hidden><option value="">Confirm recipient</option><option value="new">New Spotlight employee</option><option value="outside">Outside Spotlight</option></select></label><label><span>Method</span><select name="transferMethod[]" data-liq-required><option>Bank Transfer</option><option>Cash</option></select></label><label><span>Remarks / AR Reference</span><input name="transferRemarks[]" data-liq-activity data-liq-required /></label><label><span>Amount</span><input name="transferAmount[]" data-money-input data-liq-activity data-liq-required data-liq-total="transfer" placeholder="0.00" /></label>${liquidationUploadControl("transferArFiles[]", "Acknowledgment Receipt", "image/*,.pdf", true)}${remove}</div>`;
  if (type === "receipt") return `<div class="liquidation-entry-row is-expense is-with-receipt"><label><span>Date</span><input name="receiptDate[]" type="date" data-liq-activity data-liq-required /></label><label><span>Payee / Provider</span><input name="receiptVendor[]" data-liq-activity data-liq-required /></label><label><span>Payee Type</span><select name="receiptPayeeType[]" data-liq-required>${counterpartyTypeOptions("", true, true)}</select><input name="receiptOtherType[]" placeholder="Specify classification" hidden /></label><label><span>Particulars</span><input name="receiptParticulars[]" data-liq-activity data-liq-required placeholder="Specific expense" /></label><label><span>TIN #</span><input name="receiptTin[]" data-liq-activity data-liq-required /></label><label><span>Address</span><input name="receiptAddress[]" data-liq-activity data-liq-required /></label><label><span>OR #</span><input name="receiptOr[]" data-liq-activity data-liq-required /></label><label><span>Receipt Type</span><select name="receiptType[]" data-liq-required><option>VAT</option><option>Non-VAT</option></select></label><label><span>Amount</span><input name="receiptAmount[]" data-money-input data-liq-activity data-liq-required data-liq-total="receipt" placeholder="0.00" /></label>${liquidationUploadControl("receiptFiles[]", "Receipt Image", "image/*", true)}${remove}</div>`;
  return `<div class="liquidation-entry-row is-expense is-without-receipt"><label><span>Date</span><input name="noReceiptDate[]" type="date" data-liq-activity data-liq-required /></label><label><span>Payee</span><input name="noReceiptVendor[]" data-liq-activity data-liq-required /></label><label><span>Payee Type</span><select name="noReceiptPayeeType[]" data-liq-required>${counterpartyTypeOptions("", true, true)}</select><input name="noReceiptOtherType[]" placeholder="Specify classification" hidden /></label><label><span>Particulars</span><input name="noReceiptParticulars[]" data-liq-activity data-liq-required placeholder="Specific expense" /></label><label><span>Address</span><input name="noReceiptAddress[]" data-liq-activity data-liq-required /></label><label><span>Contact Number</span><input name="noReceiptContact[]" data-liq-activity data-liq-required /></label><label><span>Amount</span><input name="noReceiptAmount[]" data-money-input data-liq-activity data-liq-required data-liq-total="noReceipt" placeholder="0.00" /></label>${liquidationUploadControl("noReceiptFiles[]", "Receipt / AR Image", "image/*", true)}${remove}</div>`;
}

function syncLiquidationOptionalRows(formElement) {
  formElement.querySelectorAll(".liquidation-entry-row:not(.is-prefilled)").forEach(row => {
    const active = [...row.querySelectorAll("[data-liq-activity]")].some(field => {
      if (field.type === "file") return Boolean(field.files?.length);
      if (field.hasAttribute("data-money-input")) return parseMoney(field.value) > 0;
      return Boolean(normalizeCell(field.value));
    });
    row.classList.toggle("is-active", active);
    row.querySelectorAll("[data-liq-required]").forEach(field => {
      field.required = active;
      if (!active) {
        field.setCustomValidity("");
        clearFieldPrompt(field);
      }
    });
  });
}

function syncLiquidationTransferRecipients(formElement) {
  const known = new Set(db.users.map(user => keyCell(user.name)));
  formElement.querySelectorAll('[data-liq-entry-list="transfer"] .liquidation-entry-row').forEach(row => {
    const field = row.querySelector('[name="transferTo[]"]');
    const identity = row.querySelector('[name="transferIdentity[]"]');
    const note = row.querySelector('.liquidation-transfer-identity-note');
    const name = keyCell(field?.value);
    const unknown = row.classList.contains('is-active') && Boolean(name) && !known.has(name);
    if (identity) {
      identity.hidden = !unknown;
      identity.required = unknown;
      if (!unknown) identity.value = '';
    }
    if (note) note.hidden = !unknown;
    const blocked = name === keyCell(currentUser())
      ? 'You cannot transfer project funds to yourself.'
      : unknown && identity?.value === 'outside'
        ? 'Internal transfers can only go to Spotlight employees.'
        : '';
    field?.setCustomValidity(blocked);
    if (blocked) showFieldPrompt(field, blocked);
    else if (field?.checkValidity()) clearFieldPrompt(field);
  });
}

function syncLiquidationPayeeTypes(formElement) {
  for (const prefix of ['receipt', 'noReceipt']) {
    formElement.querySelectorAll(`[name="${prefix}PayeeType[]"]`).forEach(select => {
      const other = select.closest('label')?.querySelector(`[name="${prefix}OtherType[]"]`);
      if (!other) return;
      other.hidden = select.value !== 'other';
      other.required = select.required && select.value === 'other';
      if (other.hidden) {
        other.value = '';
        clearFieldPrompt(other);
      }
    });
  }
}

function validateLiquidationEvidence(formElement) {
  for (const row of formElement.querySelectorAll('.liquidation-entry-row.is-expense.is-active')) {
    const files = [...row.querySelectorAll('.liquidation-file-input')];
    for (const file of files) {
      if (file.files?.length) continue;
      showFieldPrompt(file, file.dataset.requiredMessage || (row.classList.contains('is-with-receipt')
        ? 'Upload the receipt for this expense.'
        : 'Upload an acknowledgment receipt or expense support for this item.'));
      file.closest('label')?.querySelector('[data-liq-file-trigger]')?.focus();
      return false;
    }
  }
  return true;
}

function liquidationReviewModal() {
  if (!state.liquidationReviewId) return "";
  const employee = liquidationEmployeeLookup(state.liquidationReviewId);
  if (!employee) return "";
  const access = liquidationRoleAccess(employee);
  if (!access.canViewDetails) return "";
  const p = project(state.selectedProjectId);
  const notes = employee.notes || [];
  const cashDue = employee.cashReturn > 0 && employee.cashReturnState === "due";
  const reimbursementPending = employee.reimbursement > 0 && employee.reimbursementStatus === "pending";
  const expenses = liquidationExpenseDetails(employee);
  const chequeExpenses = employee.chequeExpenses || [];
  const particulars = liquidationParticularTotals(employee);
  const attachments = liquidationAttachments(employee);
  const releasedFunds = employee.releasedFunds?.length ? employee.releasedFunds : employee.released > 0 ? [{ date:employee.submittedAt, remarks:"Project cash released", amount:employee.released }] : [];
  const transfers = employee.transfers || [];
  const transferTotal = transfers.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const attachmentIndex = file => file?.dataUrl ? attachments.findIndex(item => item.name === file.name && item.dataUrl === file.dataUrl) : -1;
  const withReceiptCount = expenses.filter(row => row.kind === "With receipt").length;
  const withoutReceiptCount = expenses.filter(row => row.kind === "Without receipt").length;
  const missingSupport = expenses.some(row => !row.support?.dataUrl) || chequeExpenses.some(row => !row.support?.dataUrl || !row.paymentProof?.dataUrl) || transfers.some(row => !row.acknowledgment?.dataUrl);
  const approvalHold = !employee.submittedAt ? "Liquidation has not been submitted."
    : missingSupport ? "Every expense and internal transfer needs its supporting file."
      : employee.reimbursement > 0 && employee.reimbursementStatus !== "approved" ? "Decide the reimbursement before final approval." : "";
  const previousId = state.liquidationReviewHistory.at(-1);
  const previousEmployee = previousId ? liquidationEmployeeLookup(previousId) : null;
  const decisionActions = access.isCeo
    ? `<button class="btn primary" type="button" data-liq-action="ceo-approve" data-liq-id="${escapeHtml(employee.id)}" ${approvalHold ? `disabled title="${escapeHtml(approvalHold)}"` : ""}>Approve</button><button class="btn danger" type="button" data-liq-action="ceo-reject" data-liq-id="${escapeHtml(employee.id)}">Reject</button>`
    : access.isCompliance
      ? `<button class="btn primary" type="button" data-liq-action="compliance-approve" data-liq-id="${escapeHtml(employee.id)}" ${!employee.submittedAt || missingSupport ? `disabled title="Submit all expense and transfer evidence first."` : ""}>Approve</button><button class="btn danger" type="button" data-liq-action="compliance-reject" data-liq-id="${escapeHtml(employee.id)}">Reject</button>`
      : "";
  return `<div class="review-backdrop" role="presentation" data-liq-review-close="true">
    <section class="review-modal liquidation-review-modal" role="dialog" aria-modal="true" aria-label="Review liquidation packet">
      <button class="modal-close" type="button" data-liq-review-close="true" aria-label="Close liquidation review">×</button>
      <div class="liquidation-modal-navigation">${previousEmployee ? `<button class="btn" type="button" data-liq-review-back="true" title="Return to ${escapeHtml(previousEmployee.name)}">Back</button>` : state.supplierSourceReturn ? `<button class="btn" type="button" data-supplier-return="true">Back</button>` : `<span>Employee Accountability</span>`}</div>
      <div class="liquidation-modal-title"><div><h2>${escapeHtml(employee.name)}</h2><p>${formatShortDate(employee.due)} due date · ${chequeExpenses.length && !employee.released ? `${fmtDetailed(employee.chequeSubmitted)} cheque expenses` : `${percentOf(employee.submitted, employee.released)}% cash spent`}${transferTotal ? ` · ${percentOf(employee.submitted + transferTotal + (Number(employee.cashReturn) || 0), employee.released)}% accounted` : ""}</p></div>${chip(employee.status.label, employee.status.tone)}</div>
      <div class="liquidation-packet-metrics">
        <div class="tone-active"><span>Released</span><b>${fmtDetailed(employee.released)}</b></div>
        <div class="tone-neutral"><span>Submitted</span><b>${fmtDetailed(employee.submitted)}</b></div>
        <div class="tone-good"><span>Validated</span><b>${fmtDetailed(employee.validated)}</b></div>
        <div class="${employee.cashReturn ? "tone-warn" : "tone-neutral"}"><span>Cash Return</span><b>${fmtDetailed(employee.cashReturn)}</b><small>${employee.cashReturnState === "received" ? "received" : employee.cashReturn ? "due" : "none"}</small></div>
        <div class="${employee.reimbursement ? "tone-risk" : "tone-neutral"}"><span>Reimbursement</span><b>${fmtDetailed(employee.reimbursement)}</b><small>${employee.reimbursementStatus || "none"}</small></div>
      </div>
      ${chequeExpenses.length ? `<div class="liquidation-cheque-summary"><span>Finance Officer Cheque Expenses</span><b>${fmtDetailed(employee.chequeSubmitted || chequeExpenses.reduce((sum, row) => sum + row.amount, 0))}</b><small>Separate from employee cash accountability</small></div>` : ""}
      <div class="liquidation-packet-context">
        <div><span>Project</span><b>${escapeHtml(p?.name || "Project")}</b><small>${escapeHtml(p?.code || "")}</small></div>
        <div><span>Submitted by</span><b>${escapeHtml(employee.name)}</b><small>${escapeHtml(employee.jobTitle || "Employee")}</small></div>
        <div><span>Submission date</span><b>${formatShortDate(employee.liquidationDate || employee.submittedAt)}</b><small>System recorded</small></div>
        <div><span>Review route</span><b>${escapeHtml(employee.complianceDecision === "approved" ? "Finance cleared" : employee.complianceDecision === "rejected" ? "Returned by Finance" : "Finance assessment")}</b><small>${escapeHtml(employee.ceoDecision === "approved" ? "CEO approved" : employee.ceoDecision === "rejected" ? "CEO returned" : "CEO final approval pending")}</small></div>
      </div>
      <div class="liquidation-packet-sections">
        <section class="tone-active"><h3>Released Funds${employee.transferredIn ? `<small>Spotlight ${fmtDetailed(employee.spotlightReleased)} · Colleagues ${fmtDetailed(employee.transferredIn)}</small>` : ""}</h3>${releasedFunds.map(row => {
          const colleague = keyCell(row.from || "Spotlight") !== "spotlight";
          const index = attachmentIndex(row.acknowledgment);
          return `<div class="liquidation-packet-line is-wide ${colleague ? "has-colleague" : ""}"><span><b>${escapeHtml(colleague ? `Cash Release from ${row.from}` : "Project Cash Release")}</b><small>${escapeHtml(colleague ? row.reference || row.method || "Internal transfer" : row.remarks || "From Spotlight")}</small></span><small>${formatShortDate(row.date)}</small><b>${fmtDetailed(row.amount)}</b>${colleague ? index >= 0 ? `<button class="btn compact" type="button" data-liq-attachment="${escapeHtml(employee.id)}" data-liq-attachment-index="${index}" title="View acknowledgment receipt">View</button>` : `<em class="liquidation-support-label is-required">AR missing</em>` : ""}</div>`;
        }).join("") || `<div class="empty">No employee cash release recorded.</div>`}</section>
        <section class="${transfers.length ? "tone-warn" : "tone-neutral"}"><h3>Internal Transfers${transfers.length ? `<small>${transfers.length} entries · ${fmtDetailed(transferTotal)}</small>` : ""}</h3>${transfers.length ? transfers.map(row => {
          const target = liquidationEmployeeByName(row.to);
          const canOpenTarget = target && access.canViewAll;
          const index = attachmentIndex(row.acknowledgment);
          return `<div class="liquidation-transfer-entry"><span><b>${escapeHtml(row.to || "Employee")}</b><small>${formatShortDate(row.date)} · ${escapeHtml(row.method || "Transfer")} · ${escapeHtml(row.remarks || "")}${row.recipientIdentity === "new" ? " · New employee awaiting verification" : ""}</small></span><strong>${fmtDetailed(row.amount)}</strong><div class="liquidation-transfer-actions">${index >= 0 ? `<button class="btn compact" type="button" data-liq-attachment="${escapeHtml(employee.id)}" data-liq-attachment-index="${index}" title="View acknowledgment receipt">View</button>` : `<em class="liquidation-support-label is-required">AR missing</em>`}${canOpenTarget ? `<button class="btn compact" type="button" data-liq-transfer-target="${escapeHtml(target.id)}">View</button>` : ""}</div></div>`;
        }).join("") : `<div class="empty">No internal transfers recorded.</div>`}</section>
      </div>
      <section class="liquidation-packet-expenses"><h3>Employee Cash Expense Details &amp; Support${withReceiptCount || withoutReceiptCount ? `<small>${withReceiptCount} with receipt · ${withoutReceiptCount} without receipt</small>` : ""}</h3>${liquidationPacketExpenseRows(expenses, attachments, employee)}</section>
      ${chequeExpenses.length ? `<section class="liquidation-packet-expenses"><h3>Finance Officer Cheque Expenses &amp; Support<small>${chequeExpenses.length} payment${chequeExpenses.length === 1 ? "" : "s"}</small></h3>${liquidationPacketChequeRows(chequeExpenses, attachments, employee)}</section>` : ""}
      <div class="liquidation-packet-body is-single">
        <section class="tone-active"><h3>Expense Mix by Particulars</h3>${particulars.map(item => `<div class="liquidation-packet-line"><span>${escapeHtml(item.label)}</span><b>${fmtDetailed(item.amount)}</b><em>${percentOf(item.amount, employee.submitted)}%</em></div>`).join("") || `<div class="empty">No expense particulars submitted.</div>`}</section>
      </div>
      <section class="liquidation-note-trail tone-warn"><h3>Accountability Trail</h3><div><span>Opening note</span><p>${escapeHtml(employee.note || "No opening note.")}</p></div>${notes.map(note => `<div><span>${escapeHtml(note.author || "User")} · ${formatLiquidationTimestamp(note.at)}</span><p>${escapeHtml(note.message)}</p></div>`).join("")}</section>
      <div class="liquidation-packet-actions">
        ${approvalHold && (access.isCeo || access.isCompliance) ? `<span class="liquidation-approval-hold">${escapeHtml(approvalHold)}</span>` : ""}
        ${cashDue && (access.isCeo || access.isCompliance || access.isFinanceOfficer) ? `<button class="btn primary" type="button" data-liq-action="record-return" data-liq-id="${escapeHtml(employee.id)}">Record</button>` : ""}
        ${access.isCeo && reimbursementPending ? `<button class="btn primary" type="button" data-liq-action="approve-reimbursement" data-liq-id="${escapeHtml(employee.id)}">Approve</button><button class="btn danger" type="button" data-liq-action="reject-reimbursement" data-liq-id="${escapeHtml(employee.id)}">Reject</button>` : ""}
        ${access.isCeo && employee.reimbursement > 0 && ["approved", "rejected"].includes(employee.reimbursementStatus) ? `<button class="btn" type="button" data-liq-action="reopen-reimbursement" data-liq-id="${escapeHtml(employee.id)}">Reopen</button>` : ""}
        ${decisionActions}
        <button class="btn" type="button" data-liq-note="${escapeHtml(employee.id)}">Note</button>
        <button class="btn" type="button" data-liq-review-close="true">Close</button>
      </div>
    </section>
  </div>`;
}

function liquidationPacketExpenseRows(expenses = [], attachments = [], employee = {}) {
  if (!expenses.length) return `<div class="empty">No expense details submitted.</div>`;
  return `<div class="liquidation-expense-table">
    <div class="liquidation-expense-head"><span>Date</span><span>Particulars</span><span>Payee</span><span>Evidence</span><span>Amount</span></div>
    ${expenses.map(expense => {
      const attachmentIndex = expense.support ? attachments.findIndex(file => file === expense.support || (file.name === expense.support.name && file.size === expense.support.size)) : -1;
      const support = attachmentIndex >= 0 && attachments[attachmentIndex]?.dataUrl
        ? `<button class="btn compact" type="button" data-liq-attachment="${escapeHtml(state.liquidationReviewId || "")}" data-liq-attachment-index="${attachmentIndex}">View</button>`
        : `<span class="liquidation-support-label is-required">${expense.kind === "Without receipt" ? "AR / support required" : "Receipt required"}</span>`;
      const type = expense.kind === "With receipt" || expense.kind === "Without receipt" ? `<small class="${expense.kind === "With receipt" ? "has-receipt" : "has-acknowledgment"}">${escapeHtml(expense.kind)}</small>` : "";
      const access = liquidationRoleAccess();
      const canClassify = access.isCeo || access.isCompliance || access.isFinanceOfficer;
      const payeeLabel = expense.payeeKind === "other" && expense.payeeClassification ? `Other · ${expense.payeeClassification}` : counterpartyTypeLabel(expense.payeeKind);
      return `<div class="liquidation-expense-row"><span>${formatShortDate(expense.date)}</span><b>${escapeHtml(expense.particulars || "Unspecified particulars")}${type}</b><span class="liquidation-payee-cell"><b>${escapeHtml(expense.vendor || expense.payee || "-")}</b><small>${escapeHtml(payeeLabel)}</small>${canClassify ? `<button class="btn compact" type="button" data-liq-payee-review="${escapeHtml(employee.id)}" data-liq-payee-expense="${escapeHtml(expense.id)}">Edit</button>` : ""}</span><span>${support}</span><b>${fmtDetailed(expense.amount)}</b></div>`;
    }).join("")}
  </div>`;
}

function liquidationPacketChequeRows(expenses = [], attachments = [], employee = {}) {
  return `<div class="liquidation-expense-table liquidation-cheque-table">
    <div class="liquidation-expense-head"><span>Date</span><span>Particulars</span><span>Supplier</span><span>Payment</span><span>Invoice / Receipt</span><span>Cheque Proof</span><span>Amount</span></div>
    ${expenses.map(expense => {
      const view = (file, label) => {
        const index = file?.dataUrl ? attachments.findIndex(item => item.name === file.name && item.dataUrl === file.dataUrl) : -1;
        return index >= 0 ? `<button class="btn compact" type="button" data-liq-attachment="${escapeHtml(employee.id)}" data-liq-attachment-index="${index}" title="View ${label}">View</button>` : `<em class="liquidation-support-label is-required">Missing</em>`;
      };
      return `<div class="liquidation-expense-row"><span>${formatShortDate(expense.date)}</span><b>${escapeHtml(expense.particulars)}</b><span>${escapeHtml(expense.vendor)}</span><b>${escapeHtml(expense.paymentStage)}</b><span>${view(expense.support, "Invoice")}</span><span>${view(expense.paymentProof, "Proof")}</span><b>${fmtDetailed(expense.amount)}</b></div>`;
    }).join("")}
  </div>`;
}

function liquidationSupplierUploadControl(name, label, existing = null, required = true) {
  return `<label class="liquidation-file-control"><span>${escapeHtml(label)}${!existing && required ? " · Required" : ""}</span><div><input class="liquidation-file-input" name="${escapeHtml(name)}" type="file" accept="image/*,.pdf" ${!existing && required ? "required" : ""} /><button class="btn" type="button" data-liq-supplier-file-trigger>Upload</button><small data-liq-supplier-file-name>${escapeHtml(existing?.name || "No new file selected")}</small></div></label>`;
}

function liquidationSupplierReviewModal() {
  if (!state.liquidationSupplierReviewId) return "";
  if (!liquidationRoleAccess().canViewAll) return "";
  const supplier = liquidationSupplierLookup(state.liquidationSupplierReviewId);
  if (!supplier) return "";
  const access = liquidationRoleAccess();
  const age = liquidationSupplierAge(supplier);
  const balance = age.balance;
  const payments = liquidationSupplierPaymentHistory(supplier);
  const lastPaymentLateDays = liquidationSupplierPaymentLateDays(supplier.dueDate, payments.at(-1)?.date);
  return `<div class="review-backdrop" role="presentation" data-liq-supplier-close="true">
    <section class="review-modal liquidation-supplier-review-modal" role="dialog" aria-modal="true" aria-label="Supplier liquidation packet">
      <button class="modal-close" type="button" data-liq-supplier-close="true" aria-label="Close supplier packet">×</button>
      <div class="liquidation-modal-navigation">${state.supplierSourceReturn ? `<button class="btn" type="button" data-supplier-return="true">Back</button>` : `<span>Supplier Actualization</span>`}</div>
      <div class="liquidation-modal-title"><div><h2>${escapeHtml(supplier.name)}</h2><p>${escapeHtml(supplier.category || "Supplier Costs")} · Vendor liquidation packet</p></div>${chip(supplier.status.label, supplier.status.tone)}</div>
      <div class="liquidation-packet-metrics">
        <div class="tone-active"><span>Approved</span><b>${fmtDetailed(supplier.approved)}</b></div>
        <div class="tone-neutral"><span>Final Invoice</span><b>${fmtDetailed(supplier.finalInvoice)}</b></div>
        <div class="tone-good"><span>Paid</span><b>${fmtDetailed(supplier.paid)}</b></div>
        <div class="${balance ? "tone-warn" : "tone-good"}"><span>Balance</span><b>${fmtDetailed(balance)}</b></div>
        <div class="${supplier.savings ? "tone-good" : "tone-neutral"}"><span>Savings</span><b>${fmtDetailed(supplier.savings)}</b></div>
      </div>
      <div class="supplier-payable-due ${age.days ? "is-overdue" : lastPaymentLateDays ? "is-paid-late" : ""}"><span>Accounts Payable</span><b>${balance ? age.missingDue ? "Due date missing" : `${formatShortDate(supplier.dueDate)} · ${age.days ? `${age.days} days overdue` : "not overdue"}` : lastPaymentLateDays ? `Settled ${lastPaymentLateDays} days late` : "Settled"}</b><small>${escapeHtml(supplier.budgetReference || "From project CRP release")}</small></div>
      <section class="liquidation-packet-expenses liquidation-supplier-evidence"><h3>Vendor Documents</h3>
        <div class="liquidation-expense-table liquidation-supplier-document-table">
          <div class="liquidation-expense-head"><span>Vendor</span><span>Document</span><span>Reference</span><span>Status</span><span>File</span></div>
          <div class="liquidation-expense-row"><b>${escapeHtml(supplier.name)}</b><span>Supplier Invoice</span><span>${escapeHtml(supplier.invoice?.name || "-")}</span><span>${supplier.invoice ? "On file" : "Missing"}</span><span>${supplier.invoice?.dataUrl ? `<button class="btn primary compact" type="button" data-liq-supplier-document="${escapeHtml(supplier.id)}" data-liq-supplier-document-type="invoice">View</button>` : `<em class="liquidation-support-label is-required">Required</em>`}</span></div>
          <div class="liquidation-expense-row"><b>${escapeHtml(supplier.name)}</b><span>${escapeHtml(supplier.paymentProof?.documentType || "Payment Proof")}</span><span>${escapeHtml(supplier.reference || supplier.paymentProof?.name || "-")}</span><span>${supplier.paymentProof ? "On file" : "Missing"}</span><span>${supplier.paymentProof?.dataUrl ? `<button class="btn primary compact" type="button" data-liq-supplier-document="${escapeHtml(supplier.id)}" data-liq-supplier-document-type="paymentProof">View</button>` : `<em class="liquidation-support-label is-required">Required</em>`}</span></div>
        </div>
      </section>
      <section class="supplier-payment-history"><h3>Payment Trail</h3>${payments.length ? `<div class="supplier-payment-grid supplier-payment-head"><span>Date</span><span>Stage</span><span>Amount</span><span>Method</span><span>Reference</span><span>Proof</span></div>${payments.map((payment, index) => {
        const lateDays = liquidationSupplierPaymentLateDays(supplier.dueDate, payment.date);
        return `<div class="supplier-payment-grid"><span>${formatShortDate(payment.date)}${lateDays ? `<small class="supplier-overdue-text">${lateDays} days late</small>` : ""}</span><b>${escapeHtml(payment.stage || "DP")}</b><b>${fmtDetailed(payment.amount)}</b><span>${escapeHtml(payment.method || "Unknown")}</span><span>${escapeHtml(payment.reference || "-")}</span><span>${payment.proof?.dataUrl ? `<button class="btn compact" type="button" data-liq-supplier-document="${escapeHtml(supplier.id)}" data-liq-supplier-document-type="payment:${index}">View</button>` : `<em class="liquidation-support-label is-required">Proof missing</em>`}</span></div>`;
      }).join("")}` : `<div class="empty">No payment recorded.</div>`}</section>
      ${access.isFinanceOfficer ? `<form id="liquidationSupplierForm" class="liquidation-supplier-form" data-liq-supplier-form="${escapeHtml(supplier.id)}">
        <div class="liquidation-form-grid">
          <label class="is-wide"><span>Vendor</span><input value="${escapeHtml(supplier.name)}" readonly /></label>
          <label><span>Expense Category</span><input name="category" value="${escapeHtml(supplier.category || "")}" required placeholder="Technicals, staging, documentation..." /></label>
          <label><span>Final Invoice</span><input name="finalInvoice" data-money-input value="${escapeHtml(supplier.finalInvoice)}" required /></label>
          <label><span>Invoice Date</span><input name="invoiceDate" type="date" value="${escapeHtml(supplier.invoiceDate || "")}" required /></label>
          <label><span>Payment Due Date</span><input name="dueDate" type="date" value="${escapeHtml(supplier.dueDate || "")}" required /></label>
          <label><span>Paid to Date</span><input name="paid" data-money-input value="${escapeHtml(supplier.paid)}" required /></label>
          <label><span>Payment Stage</span><select name="paymentStage"><option value="">Select DP or FP</option><option value="DP">Downpayment (DP)</option><option value="FP">Full payment (FP)</option></select></label>
          <label><span>Payment Date</span><input name="paymentDate" type="date" /></label>
          <label><span>Payment Method</span><select name="paymentMethod"><option value="">Select method</option>${["Cash","Bank transfer","Cheque"].map(method => `<option>${method}</option>`).join("")}</select></label>
          <label class="is-wide"><span>Reference / Cheque Details</span><input name="reference" placeholder="Cash voucher, transfer reference, or cheque details" /></label>
          ${liquidationSupplierUploadControl("supplierInvoice", "Supplier Invoice", supplier.invoice)}
          ${liquidationSupplierUploadControl("supplierPaymentProof", "Receipt / AR / Transfer / Cheque Proof", supplier.paymentProof, false)}
        </div>
        <div class="modal-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-liq-supplier-close="true">Cancel</button></div>
      </form>` : `<div class="liquidation-readonly-callout"><b>Read-only audit view</b><span>Finance Officer uploads and updates supplier substantiation. Reviewers can open every attached document above.</span></div>`}
      ${state.supplierSourceReturn ? "" : `<div class="modal-actions"><button class="btn" type="button" data-liq-supplier-close="true">Back</button></div>`}
    </section>
  </div>`;
}

function liquidationSupplierBatchUpload(supplier, name, label, file, documentType) {
  return `<label class="liquidation-file-control"><span>${label}</span><div><input class="liquidation-file-input" name="${name}" type="file" accept="image/*,.pdf" /><button class="btn" type="button" data-liq-batch-file-trigger>Upload</button>${file?.dataUrl ? `<button class="btn" type="button" data-liq-supplier-document="${escapeHtml(supplier.id)}" data-liq-supplier-document-type="${documentType}">View</button>` : ""}</div></label>`;
}

function liquidationSupplierBatchModal() {
  if (!state.liquidationSupplierBatchOpen || !liquidationRoleAccess().isFinanceOfficer) return "";
  const p = project(state.selectedProjectId);
  if (!p) return "";
  const model = state.liquidationScenarioPreview ? liquidationScenarioData(p) : liquidationLiveData(p);
  return `<div class="review-backdrop" role="presentation" data-liq-batch-close="true">
    <section class="review-modal liquidation-batch-modal" role="dialog" aria-modal="true" aria-label="Cheque supplier liquidations">
      <button class="modal-close" type="button" data-liq-batch-close="true" aria-label="Close cheque liquidations">×</button>
      <div class="modal-kicker">Finance Officer · ${escapeHtml(p.code)}</div>
      <h2>Supplier Payables</h2>
      <p>Record cash, cheque, and bank payments. Each new payment needs a DP or FP stage and its own proof.</p>
      <form id="liquidationSupplierBatchForm" class="liquidation-batch-form">
        ${model.suppliers.map(supplier => `<section class="liquidation-batch-row" data-liq-batch-supplier="${escapeHtml(supplier.id)}">
          <div class="liquidation-batch-row-heading"><b>${escapeHtml(supplier.name)}</b><small>${escapeHtml(supplier.category || "Supplier costs")} · ${fmtDetailed(supplier.approved)} approved</small></div>
          <div class="liquidation-batch-fields">
            <label><span>Category</span><input name="category" value="${escapeHtml(supplier.category || "")}" /></label>
            <label><span>Final Invoice</span><input name="finalInvoice" data-money-input value="${escapeHtml(supplier.finalInvoice)}" /></label>
            <label><span>Invoice Date</span><input name="invoiceDate" type="date" value="${escapeHtml(supplier.invoiceDate || "")}" /></label>
            <label><span>Due Date</span><input name="dueDate" type="date" value="${escapeHtml(supplier.dueDate || "")}" /></label>
            <label><span>Paid to Date</span><input name="paid" data-money-input value="${escapeHtml(supplier.paid)}" /></label>
            <label><span>Payment Stage</span><select name="paymentStage"><option value="">Select DP or FP</option><option value="DP">Downpayment (DP)</option><option value="FP">Full payment (FP)</option></select></label>
            <label><span>Payment Date</span><input name="paymentDate" type="date" /></label>
            <label><span>Method</span><select name="paymentMethod"><option value="">Select method</option>${["Cash","Bank transfer","Cheque"].map(method => `<option>${method}</option>`).join("")}</select></label>
            <label><span>Reference / Cheque Details</span><input name="reference" /></label>
            ${liquidationSupplierBatchUpload(supplier, "supplierInvoice", "Supplier Invoice", supplier.invoice, "invoice")}
            ${liquidationSupplierBatchUpload(supplier, "supplierPaymentProof", "Payment Proof", supplier.paymentProof, "paymentProof")}
          </div>
        </section>`).join("")}
        <div class="modal-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-liq-batch-close="true">Close</button></div>
      </form>
    </section>
  </div>`;
}

function supplierPayableCreateModal() {
  if (!state.supplierPayableCreateOpen || !liquidationRoleAccess().isFinanceOfficer) return "";
  const p = project(state.selectedProjectId);
  if (!p) return "";
  return `<div class="review-backdrop" role="presentation" data-supplier-payable-close="true">
    <section class="review-modal supplier-payable-modal" role="dialog" aria-modal="true" aria-label="Add supplier payable">
      <button class="modal-close" type="button" data-supplier-payable-close="true" aria-label="Close supplier payable">×</button>
      <div class="modal-kicker">Finance Officer · ${escapeHtml(p.code)}</div>
      <h2>Add Supplier Payable</h2>
      <p>Record a supplier paid directly by Finance, including cash suppliers. Employee-paid cash expenses stay in their own liquidation packets.</p>
      <form id="supplierPayableCreateForm" class="liquidation-supplier-form">
        <div class="liquidation-form-grid">
          <label><span>Supplier / vendor</span><input name="name" required /></label>
          <label><span>Expense category</span><input name="category" required placeholder="Technicals, staging, supplies..." /></label>
          <label><span>CRP / budget reference</span><input name="budgetReference" required placeholder="CRP row or approved budget item" /></label>
          <label><span>Approved budget</span><input name="approved" data-money-input required placeholder="0.00" /></label>
          <label><span>Invoice / payable amount</span><input name="finalInvoice" data-money-input required placeholder="0.00" /></label>
          <label><span>Invoice date</span><input name="invoiceDate" type="date" required /></label>
          <label><span>Payment due date</span><input name="dueDate" type="date" required /></label>
          ${liquidationSupplierUploadControl("supplierInvoice", "Supplier Invoice")}
        </div>
        <div class="modal-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-supplier-payable-close="true">Cancel</button></div>
      </form>
    </section>
  </div>`;
}

async function handleSupplierPayableCreate(formElement) {
  if (!liquidationRoleAccess().isFinanceOfficer || !formElement.checkValidity()) return;
  const form = new FormData(formElement);
  const approved = parseMoney(form.get("approved"));
  const finalInvoice = parseMoney(form.get("finalInvoice"));
  if (approved <= 0 || finalInvoice <= 0) {
    showFieldPrompt(formElement.elements[approved <= 0 ? "approved" : "finalInvoice"], "Enter an amount above zero.");
    return;
  }
  const file = form.get("supplierInvoice");
  const invoice = file?.size ? { name:file.name, size:file.size, type:file.type, documentType:"Supplier invoice", dataUrl:await fileToDataUrl(file) } : null;
  liquidationManualSuppliers.unshift({
    id:`supplier-manual-${Date.now()}`,
    projectId:state.selectedProjectId,
    name:normalizeCell(form.get("name")),
    category:normalizeCell(form.get("category")),
    budgetReference:normalizeCell(form.get("budgetReference")),
    approved,
    finalInvoice,
    paid:0,
    savings:roundCent(Math.max(0, approved - finalInvoice)),
    invoiceDate:String(form.get("invoiceDate") || ""),
    dueDate:String(form.get("dueDate") || ""),
    invoice,
    paymentProof:null,
    payments:[],
    status:{ label:finalInvoice > approved ? "Over approved · review" : "Payable open", tone:finalInvoice > approved ? "risk" : "warn" }
  });
  persistLiquidationScenario();
  state.supplierPayableCreateOpen = false;
  state.liquidationScenarioPreview = false;
  render();
}

function liquidationNoteModal() {
  if (!state.liquidationNoteId) return "";
  const employee = liquidationEmployeeLookup(state.liquidationNoteId);
  if (!employee) return "";
  const pendingAction = state.liquidationPendingAction;
  const isDecision = ["compliance-reject", "ceo-reject"].includes(pendingAction);
  return `<div class="review-backdrop liquidation-note-backdrop" role="presentation" data-liq-note-close="true">
    <section class="review-modal liquidation-note-modal" role="dialog" aria-modal="true" aria-label="Add liquidation note">
      <button class="modal-close" type="button" data-liq-note-close="true" aria-label="Close liquidation note">×</button>
      <div class="modal-kicker">${isDecision ? "Reason Required" : "Accountability Trail"}</div>
      <h2>${isDecision ? "Return" : "Add Note for"} ${escapeHtml(employee.name)}</h2>
      <p>${isDecision ? "Explain why the liquidation is being returned. The employee will see this reason and it will remain in the accountability trail." : "Record Finance findings, an employee response, reallocation context, or a follow-up. The note stays with this liquidation packet."}</p>
      <form id="liquidationNoteForm" class="crp-decision-form" data-liq-note-form="${escapeHtml(employee.id)}">
        <label><span>${isDecision ? "Reason for return" : "Note"}</span><textarea name="message" required placeholder="${isDecision ? "State the correction, missing support, or clarification required." : "Add the finding, response, or action taken."}"></textarea></label>
        <div class="modal-actions"><button class="btn ${isDecision ? "danger" : "primary"}" type="submit">Submit</button><button class="btn" type="button" data-liq-note-close="true">Cancel</button></div>
      </form>
    </section>
  </div>`;
}

function liquidationAttachmentModal() {
  const target = state.liquidationAttachment;
  if (!target?.employeeId && !target?.supplierId) return "";
  const employee = target.employeeId ? liquidationEmployeeLookup(target.employeeId) : null;
  if (employee && !liquidationRoleAccess(employee).canViewDetails) return "";
  const supplier = target.supplierId ? liquidationSupplierLookup(target.supplierId) : null;
  if (supplier && !liquidationRoleAccess().canViewAll) return "";
  const file = employee
    ? liquidationAttachments(employee)[Number(target.index)]
    : target.documentType?.startsWith("payment:")
      ? liquidationSupplierPaymentHistory(supplier)[Number(target.documentType.split(":")[1])]?.proof
      : supplier?.[target.documentType];
  if (!file?.dataUrl) return "";
  const isImage = String(file.type || "").startsWith("image/");
  return `<div class="review-backdrop liquidation-attachment-backdrop" role="presentation" data-liq-attachment-close="true">
    <section class="review-modal liquidation-attachment-modal" role="dialog" aria-modal="true" aria-label="Supporting file preview">
      <button class="modal-close" type="button" data-liq-attachment-close="true" aria-label="Close supporting file">×</button>
      <div class="modal-kicker">Supporting File</div>
      <h2>${escapeHtml(supplier?.name || file.particulars || file.name || "Receipt")}</h2>
      <p>${escapeHtml(supplier ? `${supplier.category || "Supplier Costs"} · ${file.documentType || file.name || "Document"}` : file.name || "Uploaded file")}</p>
      <div class="liquidation-attachment-media">${isImage ? `<img src="${escapeHtml(file.dataUrl)}" alt="Uploaded receipt or supporting document" />` : `<iframe src="${escapeHtml(file.dataUrl)}" title="Uploaded receipt or supporting document"></iframe>`}</div>
      <div class="modal-actions"><button class="btn" type="button" data-liq-attachment-close="true">Close</button></div>
    </section>
  </div>`;
}

function liquidationPayeeModal() {
  const target = state.liquidationPayeeReview;
  if (!target) return "";
  const access = liquidationRoleAccess();
  if (!(access.isCeo || access.isCompliance || access.isFinanceOfficer)) return "";
  const employee = liquidationEmployeeLookup(target.employeeId);
  const expense = employee && liquidationExpenseDetails(employee).find(item => item.id === target.expenseId);
  if (!expense) return "";
  return `<div class="review-backdrop" role="presentation" data-liq-payee-close="true">
    <section class="review-modal liquidation-payee-modal" role="dialog" aria-modal="true" aria-label="Review expense payee classification">
      <button class="modal-close" type="button" data-liq-payee-close="true" aria-label="Close payee classification">×</button>
      <div class="modal-kicker">Finance Classification</div>
      <h2>Review Final Payee</h2>
      <div class="crp-modal-line"><span>${escapeHtml(employee.name)} · ${escapeHtml(expense.kind || "Expense")}</span><b>${escapeHtml(expense.particulars || "Expense")}</b><small>${fmtDetailed(expense.amount)}</small></div>
      <form id="liquidationPayeeForm" class="counterparty-form" data-liq-payee-employee="${escapeHtml(employee.id)}" data-liq-payee-expense="${escapeHtml(expense.id)}">
        <label><span>Final payee / provider</span><input name="vendor" value="${escapeHtml(expense.vendor || "")}" required /></label>
        <label><span>Payee type</span><select name="payeeKind" required>${counterpartyTypeOptions(expense.payeeKind || "unclassified", false, true)}</select></label>
        <label data-liq-other-review ${expense.payeeKind === "other" ? "" : "hidden"}><span>Other classification</span><input name="payeeClassification" value="${escapeHtml(expense.payeeClassification || "")}" ${expense.payeeKind === "other" ? "required" : ""} /></label>
        <div class="modal-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-liq-payee-close="true">Cancel</button></div>
      </form>
    </section>
  </div>`;
}

function formatLiquidationTimestamp(value = "") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return new Intl.DateTimeFormat("en-PH", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }).format(date);
}

function manilaSubmissionDate() {
  return manilaDateFrom(new Date());
}

function manilaDateFrom(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Manila", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(date);
  const dateParts = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function liquidationExpenseCategory(particulars = "") {
  return normalizeCell(particulars) || "Unspecified particulars";
}

async function handleLiquidationSubmit(formElement) {
  if (state.liquidationFinancePreview) return;
  syncLiquidationOptionalRows(formElement);
  syncLiquidationTransferRecipients(formElement);
  syncLiquidationPayeeTypes(formElement);
  if (!validateLiquidationEvidence(formElement)) return;
  if (!formElement.checkValidity()) {
    formElement.querySelector(":invalid")?.focus();
    return;
  }
  const form = new FormData(formElement);
  const sumField = name => roundCent(form.getAll(name).reduce((sum, value) => sum + parseMoney(value), 0));
  const released = sumField("releasedAmount[]");
  const transferred = sumField("transferAmount[]");
  const fileRecord = async file => file ? ({ name:file.name, size:file.size, type:file.type, dataUrl:await fileToDataUrl(file) }) : null;
  const releasedFunds = [...formElement.querySelectorAll('[data-liq-entry-list="released"] .liquidation-entry-row')].map(row => ({
    date:row.querySelector('[name="releasedDate[]"]')?.value || "",
    from:row.querySelector('[name="releasedFrom[]"]')?.value || "Spotlight",
    method:row.querySelector('[name="releasedMethod[]"]')?.value || "",
    reference:row.querySelector('[name="releasedReference[]"]')?.value || "",
    remarks:row.querySelector('[name="releasedRemarks[]"]')?.value || "",
    amount:parseMoney(row.querySelector('[name="releasedAmount[]"]')?.value)
  })).filter(row => row.amount > 0);
  const transfers = (await Promise.all([...formElement.querySelectorAll('[data-liq-entry-list="transfer"] .liquidation-entry-row')].map(async row => ({
    date:row.querySelector('[name="transferDate[]"]')?.value || "",
    to:row.querySelector('[name="transferTo[]"]')?.value || "",
    recipientIdentity:row.querySelector('[name="transferIdentity[]"]')?.value || "known",
    method:row.querySelector('[name="transferMethod[]"]')?.value || "",
    remarks:row.querySelector('[name="transferRemarks[]"]')?.value || "",
    amount:parseMoney(row.querySelector('[name="transferAmount[]"]')?.value),
    acknowledgment:await fileRecord(row.querySelector('[name="transferArFiles[]"]')?.files?.[0] || null),
    projectId:state.selectedProjectId
  })))).filter(row => row.amount > 0);
  if (transfers.some(row => !row.acknowledgment)) {
    const missing = [...formElement.querySelectorAll('[data-liq-entry-list="transfer"] .liquidation-entry-row')].find(row => parseMoney(row.querySelector('[name="transferAmount[]"]')?.value) > 0 && !row.querySelector('[name="transferArFiles[]"]')?.files?.length);
    const input = missing?.querySelector('[name="transferArFiles[]"]');
    if (input) showFieldPrompt(input, "Please upload an acknowledgment receipt for this transfer.");
    return;
  }
  const receiptExpenses = await Promise.all([...formElement.querySelectorAll('[data-liq-entry-list="receipt"] .liquidation-entry-row')].map(async (row, index) => {
    const amount = parseMoney(row.querySelector('[name="receiptAmount[]"]')?.value);
    if (!(amount > 0)) return null;
    const file = row.querySelector('[name="receiptFiles[]"]')?.files?.[0] || null;
    return {
      id:`expense-receipt-${Date.now()}-${index}`,
      kind:"With receipt",
      date:row.querySelector('[name="receiptDate[]"]')?.value || "",
      vendor:row.querySelector('[name="receiptVendor[]"]')?.value || "",
      payeeKind:row.querySelector('[name="receiptPayeeType[]"]')?.value || "unclassified",
      payeeClassification:normalizeCell(row.querySelector('[name="receiptOtherType[]"]')?.value),
      particulars:liquidationExpenseCategory(row.querySelector('[name="receiptParticulars[]"]')?.value),
      tin:row.querySelector('[name="receiptTin[]"]')?.value || "",
      address:row.querySelector('[name="receiptAddress[]"]')?.value || "",
      reference:row.querySelector('[name="receiptOr[]"]')?.value || "",
      receiptType:row.querySelector('[name="receiptType[]"]')?.value || "",
      amount,
      support:await fileRecord(file)
    };
  }));
  const noReceiptExpenses = await Promise.all([...formElement.querySelectorAll('[data-liq-entry-list="noReceipt"] .liquidation-entry-row')].map(async (row, index) => {
    const amount = parseMoney(row.querySelector('[name="noReceiptAmount[]"]')?.value);
    if (!(amount > 0)) return null;
    const file = row.querySelector('[name="noReceiptFiles[]"]')?.files?.[0] || null;
    return {
      id:`expense-no-receipt-${Date.now()}-${index}`,
      kind:"Without receipt",
      date:row.querySelector('[name="noReceiptDate[]"]')?.value || "",
      vendor:row.querySelector('[name="noReceiptVendor[]"]')?.value || "",
      payeeKind:row.querySelector('[name="noReceiptPayeeType[]"]')?.value || "unclassified",
      payeeClassification:normalizeCell(row.querySelector('[name="noReceiptOtherType[]"]')?.value),
      particulars:liquidationExpenseCategory(row.querySelector('[name="noReceiptParticulars[]"]')?.value),
      address:row.querySelector('[name="noReceiptAddress[]"]')?.value || "",
      contact:row.querySelector('[name="noReceiptContact[]"]')?.value || "",
      amount,
      support:await fileRecord(file)
    };
  }));
  const chequeRows = [...formElement.querySelectorAll('[data-liq-entry-list="cheque"] .liquidation-entry-row.is-active')];
  if (chequeRows.length && !liquidationRoleAccess().isFinanceOfficer) return;
  const projectedPaid = new Map();
  const chequeExpenses = [];
  for (const [index, row] of chequeRows.entries()) {
    const field = name => row.querySelector(`[name="${name}[]"]`);
    const supplier = liquidationSupplierLookup(field("chequeSupplierId")?.value);
    const amount = parseMoney(field("chequeAmount")?.value);
    const date = field("chequeDate")?.value || "";
    if (!supplier) {
      showFieldPrompt(field("chequeSupplierId"), "Select a project supplier payable.");
      return;
    }
    if (!supplier.invoiceDate || !supplier.dueDate) {
      showFieldPrompt(field("chequeSupplierId"), "Set this supplier's invoice and due dates in Suppliers first.");
      return;
    }
    if (!(amount > 0)) {
      showFieldPrompt(field("chequeAmount"), "Enter a cheque payment above zero.");
      return;
    }
    if (date > manilaSubmissionDate()) {
      showFieldPrompt(field("chequeDate"), "Record payment only after it has been made.");
      return;
    }
    const prior = projectedPaid.has(supplier.id) ? projectedPaid.get(supplier.id) : Number(supplier.paid) || 0;
    const nextPaid = roundCent(prior + amount);
    if (nextPaid > supplier.finalInvoice) {
      showFieldPrompt(field("chequeAmount"), `Payment exceeds the ${fmtDetailed(Math.max(0, supplier.finalInvoice - prior))} open payable.`);
      return;
    }
    const stage = field("chequePaymentStage")?.value || "";
    if (stage !== (nextPaid >= supplier.finalInvoice ? "FP" : "DP")) {
      showFieldPrompt(field("chequePaymentStage"), nextPaid >= supplier.finalInvoice ? "Choose FP when the invoice is fully settled." : "Choose DP while a balance remains.");
      return;
    }
    projectedPaid.set(supplier.id, nextPaid);
    const invoiceFile = field("chequeReceiptFiles")?.files?.[0] || null;
    const proofFile = field("chequeProofFiles")?.files?.[0] || null;
    chequeExpenses.push({
      id:`expense-cheque-${Date.now()}-${index}`,
      supplierId:supplier.id,
      vendor:supplier.name,
      payeeKind:"supplier-business",
      kind:"Cheque with receipt",
      date,
      paymentStage:stage,
      particulars:liquidationExpenseCategory(field("chequeParticulars")?.value),
      tin:field("chequeTin")?.value || "",
      address:field("chequeAddress")?.value || "",
      orNumber:field("chequeOr")?.value || "",
      receiptType:field("chequeReceiptType")?.value || "",
      reference:field("chequeReference")?.value || "",
      amount,
      support:await fileRecord(invoiceFile),
      paymentProof:await fileRecord(proofFile),
      invoiceFile,
      proofFile
    });
  }
  const expenses = [...receiptExpenses, ...noReceiptExpenses].filter(Boolean);
  const categoryTotals = {};
  expenses.forEach(expense => {
    categoryTotals[expense.particulars] = roundCent((categoryTotals[expense.particulars] || 0) + expense.amount);
  });
  const categories = Object.entries(categoryTotals).map(([label, amount]) => ({ label, amount }));
  const submitted = roundCent(sumField("receiptAmount[]") + sumField("noReceiptAmount[]"));
  const accountable = roundCent(Math.max(0, released - transferred));
  const cashReturn = roundCent(Math.max(0, accountable - submitted));
  const reimbursement = roundCent(Math.max(0, submitted - accountable));
  const returnInput = formElement.querySelector('[name="cashReturnConfirmation"]');
  const returnFile = returnInput?.files?.[0] || null;
  if (cashReturn > 0 && !returnFile) {
    returnInput?.setCustomValidity("Upload the transaction confirmation for the exact cash return amount.");
    returnInput?.reportValidity();
    return;
  }
  const returnedNow = returnFile ? cashReturn : 0;
  const due = String(form.get("due") || "");
  const daysLate = liquidationDaysLate(due);
  const cashReturnState = cashReturn ? (returnedNow >= cashReturn ? "received" : "due") : "";
  const reimbursementStatus = reimbursement ? "pending" : "";
  const status = reimbursement
    ? { label:"CEO clearance required", tone:"risk" }
    : cashReturnState === "due"
      ? { label:"Cash return due", tone:"warn" }
      : daysLate
        ? { label:"Late submission under review", tone:"risk" }
        : { label:"Under Finance review", tone:"warn" };
  const receiptFiles = expenses.map(expense => expense.support).filter(Boolean);
  const returnConfirmation = returnFile ? { ...(await fileRecord(returnFile)), amount:cashReturn } : null;
  const id = `liq-sim-${Date.now()}`;
  for (const expense of chequeExpenses) {
    const supplier = liquidationSupplierLookup(expense.supplierId);
    if (!supplier) continue;
    await liquidationStoreSupplierUpdate(supplier, {
      category:supplier.category,
      finalInvoice:supplier.finalInvoice,
      invoiceDate:supplier.invoiceDate,
      dueDate:supplier.dueDate,
      paid:roundCent(supplier.paid + expense.amount),
      paymentStage:expense.paymentStage,
      paymentDate:expense.date,
      paymentMethod:"Cheque",
      reference:expense.reference
    }, expense.invoiceFile, expense.proofFile);
    delete expense.invoiceFile;
    delete expense.proofFile;
  }
  liquidationScenarioRecords.unshift({
    id,
    projectId:state.selectedProjectId,
    name:String(form.get("employee") || "Unassigned employee").trim(),
    released,
    spotlightReleased:roundCent(releasedFunds.filter(row => keyCell(row.from) === "spotlight").reduce((sum, row) => sum + row.amount, 0)),
    transferred,
    submitted,
    validated:roundCent(Math.min(released, submitted)),
    cashReturn,
    cashReturnState,
    reimbursement,
    reimbursementStatus,
    due,
    jobTitle:String(form.get("jobTitle") || "").trim(),
    department:String(form.get("department") || "").trim(),
    eventDate:String(form.get("eventDate") || ""),
    liquidationDate:manilaSubmissionDate(),
    policyAccepted:form.get("policyAccepted") === "on",
    submittedAt:manilaSubmissionDate(),
    daysLate,
    status,
    categories,
    expenses,
    chequeExpenses,
    chequeSubmitted:roundCent(chequeExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
    releasedFunds,
    transfers,
    receiptFiles,
    returnConfirmation,
    note:String(form.get("message") || "Simulated liquidation packet submitted."),
    notes:[{
      id:`liq-note-${Date.now()}`,
      author:currentUser(),
      at:new Date().toISOString(),
      message:`Packet submitted with ${receiptFiles.length} expense file${receiptFiles.length === 1 ? "" : "s"} and ${transfers.length} internal transfer AR${transfers.length === 1 ? "" : "s"}.`
    }]
  });
  state.liquidationSubmitOpen = false;
  state.liquidationFocusId = id;
  persistLiquidationScenario();
  render();
}

async function liquidationStoreSupplierUpdate(supplier, values, invoiceUpload, proofUpload) {
  const fileRecord = async (file, label) => file && file.size ? {
    name:file.name,
    size:file.size,
    type:file.type,
    documentType:label,
    dataUrl:await fileToDataUrl(file)
  } : null;
  const invoiceFile = await fileRecord(invoiceUpload, "Supplier invoice");
  const proofFile = await fileRecord(proofUpload, values.paymentMethod || "Payment proof");
  const finalInvoice = parseMoney(values.finalInvoice);
  const paid = parseMoney(values.paid);
  const invoice = invoiceFile || supplier.invoice;
  const payments = [...liquidationSupplierPaymentHistory(supplier)];
  const increment = roundCent(paid - (Number(supplier.paid) || 0));
  if (increment > 0) payments.push({
    id:`supplier-payment-${Date.now()}-${payments.length}`,
    amount:increment,
    stage:values.paymentStage,
    date:values.paymentDate,
    method:values.paymentMethod,
    reference:normalizeCell(values.reference),
    proof:proofFile
  });
  else if (proofFile && payments.length) payments[payments.length - 1] = { ...payments.at(-1), proof:proofFile };
  const paymentProof = payments.at(-1)?.proof || null;
  const complete = Boolean(invoice && payments.every(payment => payment.proof?.dataUrl));
  const overpaid = paid > finalInvoice;
  const overApproved = finalInvoice > supplier.approved;
  const dueDate = String(values.dueDate || supplier.dueDate || "");
  const age = liquidationSupplierAge({ finalInvoice, paid, dueDate });
  liquidationSupplierActions[supplier.id] = {
    category:normalizeCell(values.category) || supplier.category,
    finalInvoice,
    paid,
    savings:roundCent(Math.max(0, supplier.approved - finalInvoice)),
    invoiceDate:String(values.invoiceDate || supplier.invoiceDate || ""),
    dueDate,
    paymentDate:String(payments.at(-1)?.date || supplier.paymentDate || ""),
    paymentMethod:String(payments.at(-1)?.method || supplier.paymentMethod || ""),
    reference:String(payments.at(-1)?.reference || supplier.reference || ""),
    invoice,
    paymentProof,
    payments,
    documents:complete,
    status:overpaid || overApproved
      ? { label:overpaid ? "Overpaid · review" : "Over approved · review", tone:"risk" }
      : age.days
        ? { label:"Overdue AP", tone:"risk" }
      : complete && paid >= finalInvoice && paid > 0
      ? { label:"Actualized", tone:"good" }
      : paid > 0 && complete
        ? { label:"Downpayment recorded", tone:"warn" }
        : !paid && invoice
          ? { label:"Payable open", tone:"warn" }
        : { label:"Documents pending", tone:"risk" }
  };
}

function liquidationSupplierValidation(supplier, values, invoiceFile, proofFile) {
  const finalInvoice = parseMoney(values.finalInvoice);
  const paid = parseMoney(values.paid);
  const increment = roundCent(paid - (Number(supplier.paid) || 0));
  if (!normalizeCell(values.category)) return { name:"category", message:"Enter the expense category." };
  if (finalInvoice <= 0) return { name:"finalInvoice", message:"Enter an invoice amount above zero." };
  if (paid < 0) return { name:"paid", message:"Paid amount cannot be negative." };
  if (increment < 0) return { name:"paid", message:"Paid to date cannot be reduced. Add a correction note instead." };
  if (!values.invoiceDate) return { name:"invoiceDate", message:"Enter the supplier invoice date." };
  if (!values.dueDate) return { name:"dueDate", message:"Enter the payment due date to track AP aging." };
  if (values.dueDate < values.invoiceDate) return { name:"dueDate", message:"Due date cannot be before the invoice date." };
  if (!invoiceFile && !supplier.invoice) return { name:"supplierInvoice", message:"Upload the supplier invoice." };
  if (increment > 0) {
    if (!values.paymentStage) return { name:"paymentStage", message:"Choose DP or FP for this payment." };
    if (values.paymentStage !== (paid >= finalInvoice ? "FP" : "DP")) return { name:"paymentStage", message:paid >= finalInvoice ? "Choose FP when the invoice is fully settled." : "Choose DP while a balance remains." };
    if (!values.paymentDate) return { name:"paymentDate", message:"Enter this payment's date." };
    if (values.paymentDate > manilaSubmissionDate()) return { name:"paymentDate", message:"Record payment only after it has been made." };
    if (!values.paymentMethod) return { name:"paymentMethod", message:"Choose cash, cheque, or bank transfer." };
    if (!normalizeCell(values.reference)) return { name:"reference", message:"Enter a payment reference or voucher number." };
    if (!proofFile) return { name:"supplierPaymentProof", message:"Upload proof for this payment." };
  }
  return null;
}

async function handleLiquidationSupplierSubmit(formElement) {
  if (!formElement.checkValidity()) {
    formElement.querySelector(":invalid")?.focus();
    return;
  }
  const supplier = liquidationSupplierLookup(formElement.dataset.liqSupplierForm);
  if (!supplier || !liquidationRoleAccess().isFinanceOfficer) return;
  const form = new FormData(formElement);
  const values = Object.fromEntries(form);
  const invoiceFile = form.get("supplierInvoice")?.size ? form.get("supplierInvoice") : null;
  const proofFile = form.get("supplierPaymentProof")?.size ? form.get("supplierPaymentProof") : null;
  const invalid = liquidationSupplierValidation(supplier, values, invoiceFile, proofFile);
  if (invalid) {
    showFieldPrompt(formElement.elements[invalid.name], invalid.message);
    formElement.elements[invalid.name]?.focus();
    return;
  }
  await liquidationStoreSupplierUpdate(supplier, values, invoiceFile, proofFile);
  persistLiquidationScenario();
  render();
}

async function handleLiquidationSupplierBatchSubmit(formElement) {
  if (!liquidationRoleAccess().isFinanceOfficer) return;
  const edited = [...formElement.querySelectorAll('.liquidation-batch-row.is-dirty')];
  if (!edited.length) return;
  const updates = [];
  for (const row of edited) {
    const supplier = liquidationSupplierLookup(row.dataset.liqBatchSupplier);
    if (!supplier) continue;
    const value = name => row.querySelector(`[name="${name}"]`)?.value || '';
    const file = name => row.querySelector(`[name="${name}"]`)?.files?.[0] || null;
    const invoiceFile = file('supplierInvoice');
    const proofFile = file('supplierPaymentProof');
    const values = Object.fromEntries(['category','finalInvoice','invoiceDate','dueDate','paid','paymentStage','paymentDate','paymentMethod','reference'].map(name => [name, value(name)]));
    const invalid = liquidationSupplierValidation(supplier, values, invoiceFile, proofFile);
    if (invalid) {
      const field = row.querySelector(`[name="${invalid.name}"]`);
      showFieldPrompt(field, invalid.message);
      (field.type === 'file' ? field.closest('label')?.querySelector('[data-liq-batch-file-trigger]') : field)?.focus();
      return;
    }
    updates.push({ supplier, values, invoiceFile, proofFile });
  }
  for (const update of updates) await liquidationStoreSupplierUpdate(update.supplier, update.values, update.invoiceFile, update.proofFile);
  persistLiquidationScenario();
  state.liquidationSupplierBatchOpen = false;
  render();
}

function handleLiquidationReviewAction(id, action) {
  const employee = liquidationEmployeeLookup(id);
  if (!employee) return;
  const access = liquidationRoleAccess(employee);
  if (["compliance-approve", "compliance-reject"].includes(action) && !access.isCompliance) return;
  if (["ceo-approve", "ceo-reject", "approve-reimbursement", "reject-reimbursement", "reopen-reimbursement"].includes(action) && !access.isCeo) return;
  if (["ceo-approve", "compliance-approve"].includes(action)) {
    if (!employee.submittedAt || liquidationExpenseDetails(employee).some(row => !row.support?.dataUrl) || (employee.chequeExpenses || []).some(row => !row.support?.dataUrl || !row.paymentProof?.dataUrl) || (employee.transfers || []).some(row => !row.acknowledgment?.dataUrl)) return;
    if (action === "ceo-approve" && employee.reimbursement > 0 && employee.reimbursementStatus !== "approved") return;
  }
  if (["compliance-reject", "ceo-reject"].includes(action)) {
    state.liquidationPendingAction = action;
    state.liquidationNoteId = id;
    state.liquidationReviewId = null;
    render();
    return;
  }
  if (action === "record-return") {
    if (!(access.isCeo || access.isCompliance || access.isFinanceOfficer)) return;
    liquidationUpdateEmployee(id, { cashReturnState:"received", status:{ label:"Under Finance review", tone:"warn" } }, `${fmtDetailed(employee.cashReturn)} cash return recorded by Finance.`);
  } else if (action === "approve-reimbursement") {
    liquidationUpdateEmployee(id, { reimbursementStatus:"approved", validated:employee.submitted, status:{ label:"Under Finance review", tone:"warn" } }, `${fmtDetailed(employee.reimbursement)} abono approved by the CEO.`);
  } else if (action === "reject-reimbursement") {
    liquidationUpdateEmployee(id, { reimbursementStatus:"rejected", status:{ label:"Correction required", tone:"risk" } }, `${fmtDetailed(employee.reimbursement)} abono rejected. Employee response or correction is required.`);
  } else if (action === "reopen-reimbursement") {
    liquidationUpdateEmployee(id, { reimbursementStatus:"pending", validated:Math.min(employee.released, employee.submitted), status:{ label:"CEO clearance required", tone:"risk" } }, "Abono decision reopened for CEO review.");
  } else if (action === "compliance-approve") {
    liquidationUpdateEmployee(id, { complianceDecision:"approved", status:{ label:"For CEO approval", tone:"warn" } }, "Finance & Compliance approved the initial assessment and forwarded the packet to the CEO.");
  } else if (action === "ceo-approve") {
    liquidationUpdateEmployee(id, { ceoDecision:"approved", status:{ label:"Cleared", tone:"good" }, daysLate:0 }, "Liquidation received final CEO approval.");
  } else if (action === "clear") {
    liquidationUpdateEmployee(id, { status:{ label:"Cleared", tone:"good" }, daysLate:0 }, "Liquidation packet cleared by Finance.");
  } else if (action === "reopen") {
    liquidationUpdateEmployee(id, { status:{ label:"Under Finance review", tone:"warn" } }, "Clearance reopened for another Finance review.");
  }
  state.liquidationReviewId = id;
  render();
}

function liquidationRejectWithReason(id, action, message) {
  if (action === "compliance-reject") {
    liquidationUpdateEmployee(id, { complianceDecision:"rejected", status:{ label:"Returned by Compliance", tone:"risk" } }, message);
  } else if (action === "ceo-reject") {
    liquidationUpdateEmployee(id, { ceoDecision:"rejected", status:{ label:"Returned by CEO", tone:"risk" } }, message);
  }
}

function projectDraftMediaField(name, label, accept, multiple = false) {
  return `<div class="project-media-field" data-project-media-field="${name}">
    <div class="project-media-heading"><span>${label}</span><small data-project-media-name>None</small></div>
    <div class="project-media-actions">
      <label class="btn"><input name="${name}" type="file" ${multiple ? "multiple" : ""} accept="${accept}" data-project-media-input="${name}" />Upload</label>
      <button class="btn" type="button" data-project-paste-target="${name}" title="Focus, then paste an image from the clipboard">Paste</button>
    </div>
    <div class="project-media-preview" data-project-media-preview="${name}"></div>
  </div>`;
}

function updateProjectDraftMedia(name, fileList) {
  const files = [...(fileList || [])];
  const field = document.querySelector(`[data-project-media-field="${name}"]`);
  if (!field) return;
  const status = field.querySelector("[data-project-media-name]");
  const preview = field.querySelector("[data-project-media-preview]");
  const fileName = files.map(file => file.name).join(", ");
  if (status) status.textContent = fileName || "None";
  if (preview) preview.innerHTML = "";
  projectDraftMedia[name] = { name:fileName, dataUrl:"" };
  const image = files.find(file => file.type.startsWith("image/"));
  if (!image) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const dataUrl = String(reader.result || "");
    projectDraftMedia[name] = { name:fileName, dataUrl };
    if (preview) preview.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="${escapeHtml(fileName)}" />`;
  });
  reader.readAsDataURL(image);
}

function applyProjectDraftPastedImage(target, source) {
  if (!source || !source.type?.startsWith("image/")) return false;
  const extension = source.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const pasted = new File([source], `pasted-${target}-${Date.now()}.${extension}`, { type:source.type });
  const input = document.querySelector(`[data-project-media-input="${target}"]`);
  if (!input) return false;
  const transfer = new DataTransfer();
  transfer.items.add(pasted);
  input.files = transfer.files;
  updateProjectDraftMedia(target, input.files);
  return true;
}

async function pasteProjectDraftImage(target) {
  if (!navigator.clipboard?.read) return false;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find(value => value.startsWith("image/"));
      if (!type) continue;
      return applyProjectDraftPastedImage(target, await item.getType(type));
    }
  } catch (error) {
    return false;
  }
  return false;
}

function projectAssignmentOptions(field, preferred = "") {
  const names = [...new Set(db.projects.map(item => normalizeCell(item[field])).filter(name => name && !/studio|unassigned/i.test(name)))];
  db.users.forEach(user => {
    const role = user.role || "";
    const eligible = field === "owner"
      ? /ACCOUNTS|CLIENT PARTNER|CLIENT GROWTH/i.test(role)
      : field === "implementationOwner"
        ? /IMPLEMENTATION|PRODUCTION|EVENT MANAGER/i.test(role)
        : field === "projectCoordinator"
          ? /PROJECT COORDINATOR|EVENT OFFICER/i.test(role)
          : field === "creativeOwner"
            ? /CREATIVE DIRECTOR|ART DIRECTOR|ART LEAD/i.test(role)
            : field === "copywriter"
              ? /COPY/i.test(role)
              : /GRAPHIC|MULTIMEDIA/i.test(role);
    if (eligible && !names.includes(user.name)) names.push(user.name);
  });
  const selected = names.includes(preferred) ? preferred : names[0] || "";
  return `<option value="">Unassigned</option>${names.map(name => `<option value="${escapeHtml(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}`;
}

function projectClientCode(value) {
  const words = normalizeCell(value).replace(/[^a-z0-9 ]/gi, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map(word => word[0]).join("") : words[0]?.slice(0, 6) || "CLIENT").toUpperCase();
}

function matchingProjectClient(companyBrandValue) {
  const value = normalizeCell(companyBrandValue).toLowerCase();
  return db.clients.find(item => normalizeCell(item.company).toLowerCase() === value || normalizeCell(item.brand).toLowerCase() === value) || null;
}

function matchingClientContact(name, clientId = "") {
  const value = normalizeCell(name).toLowerCase();
  return db.contacts.find(item => (!clientId || item.clientId === clientId) && normalizeCell(item.name).toLowerCase() === value) || null;
}

function projectDraftModal() {
  if (!state.projectDraftOpen) return "";
  const next = String(db.projects.length + 1).padStart(4, "0");
  const year = currentClientYear();
  const defaultClient = db.clients[0];
  const defaultContact = db.contacts.find(item => item.clientId === defaultClient?.id);
  return `<div class="review-backdrop" role="presentation" data-project-draft-close="true">
    <section class="review-modal project-draft-modal" role="dialog" aria-modal="true" aria-label="Create project">
      <button class="modal-close" data-project-draft-close="true" aria-label="Close create project">×</button>
      <div class="modal-kicker">Project Creation</div>
      <div class="project-draft-titlebar"><input name="name" form="projectDraftForm" value="New Project" aria-label="Project name" /><div><span>Project ID</span><b data-project-draft-code>${year}-${escapeHtml(defaultClient?.code || "PROJECT")}-${next}</b></div></div>
      <p>Account Managers fill in the project, event, and manpower assignments before the project moves into CE work.</p>
      <form id="projectDraftForm" class="project-draft-form">
        <input type="hidden" name="clientId" value="${escapeHtml(defaultClient?.id || "")}" data-project-client-id />
        <label><span>Company/Brand Name</span><input name="companyBrand" list="projectCompanySuggestions" value="${escapeHtml(defaultClient?.company || "")}" placeholder="Start typing a company or brand" autocomplete="off" required data-project-company-brand /><datalist id="projectCompanySuggestions">${db.clients.flatMap(c => [`<option value="${escapeHtml(c.company)}">${escapeHtml(c.brand)}</option>`, c.brand && c.brand !== c.company ? `<option value="${escapeHtml(c.brand)}">${escapeHtml(c.company)}</option>` : ""]).join("")}</datalist><small data-project-client-status>Known company · details will be reused</small></label>
        <label><span>Client Name</span><input name="clientContact" list="projectContactSuggestions" value="${escapeHtml(defaultContact?.name || "")}" placeholder="Start typing a client contact" autocomplete="off" data-project-client-contact /><datalist id="projectContactSuggestions">${db.contacts.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(client(item.clientId)?.company || "Client")} · ${escapeHtml(item.type)}</option>`).join("")}</datalist></label>
        <label><span>Designation</span><input name="designation" value="${escapeHtml(defaultContact?.type || "")}" placeholder="e.g. Marketing Manager" data-project-client-designation /></label>
        <label><span>Venue</span><input name="venue" value="Venue TBD" /></label>
        <label><span>Event Date</span><input name="liveDate" type="date" value="2026-09-30" /></label>
        <label><span>Event Type</span><input name="service" value="Brand Activation" /></label>
        <label><span>Project Budget</span><input name="value" data-money-input value="0" /></label>
        <label><span>Account Manager</span><select name="owner">${projectAssignmentOptions("owner", db.clients[0]?.owner || "Paolo Reyes")}</select></label>
        <label><span>Project Manager</span><select name="implementationOwner">${projectAssignmentOptions("implementationOwner", "Lara Cruz")}</select></label>
        <label class="is-assignment-compact"><span>Project Coordinator</span><select name="projectCoordinator">${projectAssignmentOptions("projectCoordinator", "Carlo Mendoza")}</select></label>
        <label class="is-assignment-compact"><span>Art Director</span><select name="creativeOwner">${projectAssignmentOptions("creativeOwner", "Andrea Valdez")}</select></label>
        <label class="is-assignment-compact"><span>Copywriter</span><select name="copywriter">${projectAssignmentOptions("copywriter", "Sofia Mercado")}</select></label>
        <label class="is-assignment-compact"><span>Graphic Artist</span><select name="graphicArtist">${projectAssignmentOptions("graphicArtist", "Jules Navarro")}</select></label>
        <label class="is-wide"><span>Overview</span><textarea name="overview">Brief background, context, and problem to solve.</textarea></label>
        <label class="is-wide"><span>Project Objectives</span><textarea name="objectives">Define what success looks like and the measurable outcomes for the project.</textarea></label>
        <label class="is-wide"><span>Project in One Line</span><textarea name="projectLine">Short project brief pending.</textarea></label>
        <label><span>Checkpoint #1</span><input name="checkpoint1" type="date" value="2026-09-12" /></label>
        <label><span>Checkpoint #2</span><input name="checkpoint2" type="date" value="2026-09-19" /></label>
        <label><span>Checkpoint #3</span><input name="checkpoint3" type="date" value="2026-09-26" /></label>
        <label><span>Presentation Date</span><input name="presentationDate" type="date" value="2026-09-30" /></label>
        <label><span>Tagline / Slogan</span><input name="tagline" value="Campaign tagline pending" /></label>
        <label><span>Overall Budget</span><input name="overallBudget" value="TBD" /></label>
        <div class="project-draft-section is-wide">
          <h3>Attached Materials</h3>
          <p>Brand assets and execution references retained with the project brief.</p>
          <div class="draft-attachment-grid">
            ${projectDraftMediaField("brandLogos", "Brand Logo", "image/*,.pdf,.ai,.eps", true)}
            ${projectDraftMediaField("fontGuide", "Font Guide", ".pdf,.ttf,.otf,.zip,image/*")}
            ${projectDraftMediaField("colorPalette", "Color Palette", "image/*,.pdf,.ase")}
            ${projectDraftMediaField("references", "References / Pegs", "image/*,.pdf", true)}
          </div>
        </div>
        <div class="project-draft-section is-wide">
          <h3>Implementation</h3>
          <p>Check the services and operating requirements that apply to this project.</p>
          <div class="draft-check-grid">
            ${["Event Management", "Trade Marketing", "Digital Marketing", "Retail", "PR Seeding", "KOL Seeding", "Photoshoot", "Video Production", "Website Development", "Programming"].map(item => `<label><input type="checkbox" name="services" value="${item}" ${["Event Management"].includes(item) ? "checked" : ""} /><span>${item}</span></label>`).join("")}
            ${["Manpower", "Talent Management", "Logistics", "Giveaways", "Booth Fabrication", "Installation", "Permit Taking (LGU, Hotel, etc.)", "ASC / IMMAP / DTI Compliance"].map(item => `<label><input type="checkbox" name="generalRequirements" value="${item}" ${["Manpower", "Logistics", "Booth Fabrication", "Installation"].includes(item) ? "checked" : ""} /><span>${item}</span></label>`).join("")}
          </div>
        </div>
        <label class="is-wide"><span>Non-negotiable Requirements from Client</span><textarea name="nonNegotiables">Client approval cadence, event-date readiness, budget guardrails, and documented change requests.</textarea></label>
        <div class="modal-actions">
          <button class="btn primary" type="submit">Submit</button>
          <button class="btn" type="button" data-project-draft-close="true">Cancel</button>
        </div>
      </form>
    </section>
  </div>`;
}

function reviewSnapshotData(token) {
  const [type, ...rest] = token.split(":");
  const id = rest.join(":");
  if (type === "ce") return ceSnapshot(id);
  if (type === "cefile") return ceFileSnapshot(id);
  if (type === "crp") return crpSnapshot(id);
  if (type === "crpfile") return crpFileSnapshot(id);
  if (type === "employee") return employeeCashProfileSnapshot(id);
  if (type === "liquidation") return liquidationSnapshot(id);
  return null;
}

function ceSnapshot(id) {
  const approval = db.approvals.find(a => a.id === id);
  if (!approval) return null;
  const p = project(approval.projectId);
  const versions = db.ceVersions.filter(ce => ce.projectId === p.id);
  const current = versions.find(ce => ce.approved) || versions[versions.length - 1] || {};
  const lines = db.ceLines.filter(line => line.ceId === current.id && !isAsfLine(line));
  return {
    kicker: "Cost Estimate Approval",
    kind: "ce",
    title: `${p.code} · ${approval.type}`,
    summary: approval.comments || "Review the CE version, margin, ASF, and line items before approval.",
    projectId: p.id,
    tab: "CE",
    metrics: [
      { label:"CE version", value:current.version || "No CE uploaded" },
      { label:"Status", value:chip(approval.status) },
      { label:"Gross amount", value:fmt(current.revenue || p.approvedCe || p.value) },
      { label:"ASF", value:fmt(current.asf || 0) },
      { label:"Sub-total", value:fmt(current.subTotal || 0) },
      { label:"Direct cost", value:fmt(current.directCost || p.estimatedCost) }
    ],
    details: ceSectionAccordion(lines, current)
  };
}

function ceFileSnapshot(id) {
  const ce = db.ceVersions.find(item => item.id === id);
  if (!ce) return null;
  const p = project(ce.projectId);
  const computed = ceFinancials(ce);
  const lines = db.ceLines.filter(line => line.ceId === ce.id && !isAsfLine(line));
  const threshold = roundCent(computed.projectCost * settings.crpExpenseThreshold);
  const runCount = ce.runs?.length || 0;
  const issueCount = ce.runs?.length ? ceWorkbookIssueCount(ce.runs) : (ce.issueCount || 0);
  const scanStatus = issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : (ce.scanStatus || "Manual");
  const safeFile = escapeHtml(ce.file);
  const downloadUrl = ceDownloadUrl(ce);
  return {
    kicker: ce.addendum ? "Uploaded Addendum CE" : "Uploaded Cost Estimate",
    kind: "ce",
    title: `${p.code} · ${ce.version}`,
    summary: `${safeFile} is attached to this version. The system scans template rows, reads workbook tabs as runs, and recomputes totals before approval.`,
    projectId: p.id,
    tab: "CE",
    metrics: [
      { label:"Uploaded file", value:downloadUrl ? `<a class="linkbtn" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(ceDownloadName(ce))}">${safeFile}</a>` : safeFile },
      { label:"Status", value:chip(ce.status) },
      { label:"Scan result", value:ceScanChip(scanStatus) },
      { label:"Workbook tabs / runs", value:runCount || "Single CE view" },
      { label:"Project Cost", value:fmtDetailed(computed.projectCost) },
      { label:"ASF 12%", value:fmtDetailed(computed.asf) },
      { label:"Sub-total", value:fmtDetailed(computed.subTotal) },
      { label:"VAT 12%", value:fmtDetailed(computed.vat) },
      { label:"Gross Amount", value:fmtDetailed(computed.grandTotal) },
      { label:"60% CRP Threshold", value:fmtDetailed(threshold) },
      { label:"File Gross Check", value:ce.fileGross ? `${fmtDetailed(ce.fileGross)} · variance ${fmtDetailed(ce.scanVariance || 0)}` : "No file gross row found" }
    ],
    details: `<div class="ce-file-preview">
      ${ce.scanError ? `<div class="notice"><b>Scan note:</b> ${escapeHtml(ce.scanError)}</div>` : ""}
      <div class="ce-computation-strip">
        <div><span>1</span><b>${fmtDetailed(computed.projectCost)}</b><small>Project Cost</small></div>
        <div><span>+</span><b>${fmtDetailed(computed.asf)}</b><small>ASF 12%</small></div>
        <div><span>=</span><b>${fmtDetailed(computed.subTotal)}</b><small>Sub-total</small></div>
        <div><span>+</span><b>${fmtDetailed(computed.vat)}</b><small>VAT 12%</small></div>
        <div><span>=</span><b>${fmtDetailed(computed.grandTotal)}</b><small>Gross Amount</small></div>
      </div>
      ${ce.runs?.length ? ceWorkbookAccordion(ce) : ceSectionAccordion(lines, ce)}
    </div>`
  };
}

function ceWorkbookAccordion(ce) {
  const totalLines = ce.runs.reduce((sum, run) => sum + run.sections.reduce((sectionSum, section) => sectionSum + section.lines.length, 0), 0);
  const issueCount = ce.runs?.length ? ceWorkbookIssueCount(ce.runs) : (ce.issueCount || 0);
  return `<div class="ce-workbook">
    <div class="ce-scan-summary">
      <div><span>Copied tabs</span><b>${ce.runs.length}</b></div>
      <div><span>Copied worksheet rows</span><b>${totalLines}</b></div>
      <div><span>Workbook validation</span><b>${issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"} need review` : "All copied rows pass"}</b></div>
    </div>
    ${issueCount ? `<div class="ce-validation-alert"><b>CE computation needs review</b><span>Yellow rows, purple section totals, and footer totals show uploaded values that do not match the recomputed CE math. Check the Notes column, then upload a corrected version before approval.</span></div>` : ""}
    ${ce.runs.map((run, index) => ceRunAccordion(run, index)).join("")}
  </div>`;
}

function crpWorkbookView(upload) {
  if (!upload?.runs?.length) return budgetTable(upload?.projectId);
  const requestLines = crpRequestsForUpload(upload).length;
  const issueCount = crpRunsIssueCount(upload.runs);
  const approvalTotals = crpWorkbookApprovalTotals(upload);
  return `<div class="crp-workbook">
    <div class="ce-scan-summary crp-scan-summary">
      <div><span>Copied runs</span><b>${upload.runs.length}</b></div>
      <div><span>Budget request lines</span><b>${requestLines}</b></div>
      <div><span>Workbook validation</span><b>${issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"} need review` : "All request math checked"}</b></div>
      <div><span>Cash Req / Approved</span><b class="crp-request-approval-total">${crpRequestedApprovedTotal(approvalTotals.cashRequested, approvalTotals.cashApproved)}</b></div>
      <div><span>Cheque Req / Approved</span><b class="crp-request-approval-total">${crpRequestedApprovedTotal(approvalTotals.chequeRequested, approvalTotals.chequeApproved)}</b></div>
    </div>
    ${issueCount ? `<div class="ce-validation-alert"><b>CRP needs review</b><span>Yellow rows have request math or support requirements to fix. Line items above their own 60% working budget are marked, but no note is added unless computation or support is also missing.</span></div>` : ""}
    ${upload.runs.map((run, index) => crpRunAccordion(run, index)).join("")}
  </div>`;
}

function crpRequestedApprovedTotal(requested, approved) {
  const percentage = requested > 0 ? Math.round((approved / requested) * 100) : 0;
  const tone = percentage >= 100 ? "is-full" : percentage > 0 ? "is-partial" : "is-zero";
  return `<i>${fmtDetailed(requested)}</i><u>/</u><em>${fmtDetailed(approved)}</em><strong class="${tone}">${percentage}%</strong>`;
}

function crpWorkbookApprovalTotals(upload = {}) {
  const lines = (upload.runs || []).flatMap(run => crpRunAllLines(run));
  return lines.reduce((totals, line) => {
    if (!crpLineRequested(line)) return totals;
    const cash = crpEffectiveCashRequest(line);
    const cheque = crpEffectiveChequeRequest(line);
    totals.cashRequested = roundCent(totals.cashRequested + cash);
    totals.chequeRequested = roundCent(totals.chequeRequested + cheque);
    if (crpDecisionRecord(crpDecisionKey(line)).status === "approved") {
      totals.cashApproved = roundCent(totals.cashApproved + cash);
      totals.chequeApproved = roundCent(totals.chequeApproved + cheque);
    }
    return totals;
  }, { cashRequested: 0, cashApproved: 0, chequeRequested: 0, chequeApproved: 0 });
}

function crpRunAllLines(run = {}) {
  return (run.sections || []).flatMap(section => section.lines || []);
}

function crpRunFinancials(run = {}) {
  const sections = run.sections || [];
  const projectCost = roundCent(sections.reduce((sum, section) => sum + sectionUploadedFinancials(section).projectCost, 0));
  const asf = roundCent(sections.reduce((sum, section) => sum + sectionUploadedFinancials(section).asf, 0));
  const total = roundCent(projectCost + asf);
  const budget40 = roundCent(sections.reduce((sum, section) => sum + (section.lines || []).reduce((lineSum, line) => lineSum + (Number(line.budget40) || 0), 0), 0));
  const budget60 = roundCent(sections.reduce((sum, section) => sum + (section.lines || []).reduce((lineSum, line) => lineSum + (Number(line.workingBudget60) || 0), 0), 0));
  const cash = roundCent(sections.reduce((sum, section) => sum + (section.lines || []).reduce((lineSum, line) => lineSum + crpEffectiveCashRequest(line), 0), 0));
  const cheque = roundCent(sections.reduce((sum, section) => sum + (section.lines || []).reduce((lineSum, line) => lineSum + crpEffectiveChequeRequest(line), 0), 0));
  const requested = roundCent(sections.reduce((sum, section) => sum + (section.lines || []).reduce((lineSum, line) => lineSum + crpLineRequestAmount(line), 0), 0));
  const remaining = roundCent(projectCost - requested);
  const bufferRatio = projectCost ? remaining / projectCost : 0;
  return { projectCost, asf, total, budget40, budget60, cash, cheque, requested, remaining, bufferRatio, thresholdCrossed: budget60 ? requested > budget60 : false };
}

function crpRunIssueCount(run = {}) {
  return (run.sections || []).reduce((sum, section) => sum + (section.lines || []).reduce((lineSum, line) => lineSum + crpLineComputationIssues(line).length + crpSupportIssues(line).length, 0), 0);
}

function crpSectionCrpFinancials(section = {}) {
  const lines = section.lines || [];
  return {
    budget40: roundCent(lines.reduce((sum, line) => sum + (Number(line.budget40) || 0), 0)),
    budget60: roundCent(lines.reduce((sum, line) => sum + (Number(line.workingBudget60) || 0), 0)),
    cash: roundCent(lines.reduce((sum, line) => sum + crpEffectiveCashRequest(line), 0)),
    cheque: roundCent(lines.reduce((sum, line) => sum + crpEffectiveChequeRequest(line), 0)),
    requested: roundCent(lines.reduce((sum, line) => sum + crpLineRequestAmount(line), 0))
  };
}

function crpDotLegend(kind, label) {
  const current = escapeHtml(label);
  if (kind === "support") {
    return `<b>Support legend</b>
      <span><i class="crp-legend-swatch good"></i>Required person or supplier support is set</span>
      <span><i class="crp-legend-swatch risk"></i>Person or supplier support is missing</span>
      <em>Current: ${current}</em>`;
  }
  if (kind === "status") {
    return `<b>Status legend</b>
      <span><i class="crp-legend-swatch good"></i>Within the line's 60% working budget</span>
      <span><i class="crp-legend-swatch warn"></i>Above the line's 60% working budget</span>
      <span><i class="crp-legend-swatch no-request"></i>No release request on this row</span>
      <em>Current: ${current}</em>`;
  }
  return `<em>${current}</em>`;
}

function crpDot(label, tone = "active", kind = "") {
  return `<span class="crp-dot-wrap" tabindex="0" aria-label="${escapeHtml(label)}">
    <span class="crp-dot ${tone}" aria-hidden="true"></span>
    <span class="crp-dot-popover" role="tooltip">${crpDotLegend(kind, label)}</span>
  </span>`;
}

function crpLineSupportDot(line) {
  if (!crpLineRequested(line)) return "";
  const issues = crpSupportIssues(line);
  return crpDot(issues.length ? issues.join(" · ") : "Support complete", issues.length ? "risk" : "good", "support");
}

function crpLineStatusDot(line) {
  if (!crpLineRequested(line)) return "";
  return crpDot(crpLineThresholdExceeded(line) ? "Above line 60% working budget" : "Within line 60% working budget", crpLineThresholdExceeded(line) ? "warn" : "good", "status");
}

function crpDecisionKey(line = {}) {
  return [
    line.sourceUploadId || line.sourceFile || "",
    line.sourceSheet || line.runName || "",
    line.sourceRow || line.id || line.description || ""
  ].map(normalizeCell).join("::");
}

function crpCounterpartyRecord(line = {}) {
  const saved = crpCounterparties[crpDecisionKey(line)] || null;
  const legacyCheque = !Object.hasOwn(line, "chequeRequest") && /cheque|check|bank|supplier/i.test(normalizeCell(line.releaseType));
  return {
    custodian: saved ? normalizeCell(saved.custodian) : legacyCheque ? "" : normalizeCell(line.recipient),
    provider: saved ? normalizeCell(saved.provider) : legacyCheque ? normalizeCell(line.recipient) : normalizeCell(line.quotation),
    type: saved?.type || "unclassified",
    reviewed: Boolean(saved),
    history: Array.isArray(saved?.history) ? saved.history : [],
    mixed: /\//.test(`${saved ? `${saved.custodian} ${saved.provider}` : `${line.recipient || ""} ${line.quotation || ""}`}`)
  };
}

function saveCrpCounterparty(key, record) {
  const previous = crpCounterparties[key] || {};
  crpCounterparties[key] = {
    custodian: normalizeCell(record.custodian),
    provider: normalizeCell(record.provider),
    type: counterpartyTypes[record.type] ? record.type : "unclassified",
    by: currentUser(),
    at: new Date().toISOString(),
    history: [...(previous.history || []), {
      custodian: normalizeCell(record.custodian),
      provider: normalizeCell(record.provider),
      type: counterpartyTypes[record.type] ? record.type : "unclassified",
      by: currentUser(),
      at: new Date().toISOString()
    }]
  };
  localStorage.setItem(crpCounterpartyStorageKey, JSON.stringify(crpCounterparties));
}

function crpDecisionRecord(key = "") {
  const raw = crpLineDecisions[key];
  if (!raw) return { status: "", history: [] };
  if (typeof raw === "string") return { status: raw, history: [] };
  const amountOverride = Number(raw.amountOverride);
  return {
    status: normalizeCell(raw.status),
    history: Array.isArray(raw.history) ? raw.history : [],
    amountOverride: Number.isFinite(amountOverride) ? amountOverride : undefined
  };
}

function crpSaveDecisionRecord(key, record) {
  const clean = {
    status: normalizeCell(record.status),
    history: Array.isArray(record.history) ? record.history : [],
    amountOverride: Number.isFinite(Number(record.amountOverride)) ? roundCent(record.amountOverride) : undefined
  };
  if (!clean.status && !clean.history.length && !Number.isFinite(clean.amountOverride)) delete crpLineDecisions[key];
  else crpLineDecisions[key] = clean;
  localStorage.setItem(crpDecisionStorageKey, JSON.stringify(crpLineDecisions));
}

function crpDecisionLineLookup(key = "") {
  for (const upload of db.crpUploads) {
    for (const run of upload.runs || []) {
      for (const section of run.sections || []) {
        const line = (section.lines || []).find(item => crpDecisionKey(item) === key);
        if (line) return line;
      }
    }
  }
  return db.budgetRequests.find(request => crpDecisionKey(request) === key) || null;
}

function crpDecisionTimestamp() {
  return new Date().toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function crpDecisionEntry(type, text, amount) {
  return {
    type,
    text: normalizeCell(text),
    amount: Number.isFinite(Number(amount)) ? roundCent(amount) : undefined,
    by: currentUser(),
    at: crpDecisionTimestamp()
  };
}

function crpOpenKey(kind, ...parts) {
  return [kind, ...parts].map(normalizeCell).join("::");
}

function crpDetailsOpen(key, defaultOpen = false) {
  return openCrpDetails.has(key) || (!crpOpenStateTouched && defaultOpen);
}

function saveCrpOpenDetails() {
  crpOpenStateTouched = true;
  try {
    localStorage.setItem(crpOpenStateStorageKey, JSON.stringify([...openCrpDetails]));
  } catch (error) {
    // The CRP review still works if browser storage is unavailable.
  }
}

function captureCrpOpenDetails() {
  const details = document.querySelectorAll("details[data-crp-open-key]");
  if (!details.length) return;
  openCrpDetails.clear();
  details.forEach(detail => {
    const key = detail.dataset.crpOpenKey;
    if (key && detail.open) openCrpDetails.add(key);
  });
  saveCrpOpenDetails();
}

function markCrpDetailOpen(key) {
  if (!key) return;
  openCrpDetails.add(key);
  saveCrpOpenDetails();
}

function bindCrpDisclosureState() {
  document.querySelectorAll("details[data-crp-open-key]").forEach(detail => {
    detail.addEventListener("toggle", () => {
      const key = detail.dataset.crpOpenKey;
      if (!key) return;
      if (detail.open) openCrpDetails.add(key);
      else openCrpDetails.delete(key);
      saveCrpOpenDetails();
    });
  });
}

function crpApproveLine(key) {
  const record = crpDecisionRecord(key);
  const history = [...record.history];
  if (record.status !== "approved" && history.length) history.push(crpDecisionEntry("approval", "Approved for release"));
  crpSaveDecisionRecord(key, { ...record, status: "approved", history });
  if (history.length) markCrpDetailOpen(crpOpenKey("line", key));
}

function crpUnapproveLine(key, reason) {
  const record = crpDecisionRecord(key);
  crpSaveDecisionRecord(key, {
    ...record,
    status: "unapproved",
    history: [...record.history, crpDecisionEntry("unapproval", reason)]
  });
  markCrpDetailOpen(crpOpenKey("line", key));
}

function crpRejectLine(key, reason) {
  const record = crpDecisionRecord(key);
  crpSaveDecisionRecord(key, {
    ...record,
    status: "rejected",
    history: [...record.history, crpDecisionEntry("rejection", reason)]
  });
  markCrpDetailOpen(crpOpenKey("line", key));
}

function crpReplyToLine(key, message) {
  const record = crpDecisionRecord(key);
  crpSaveDecisionRecord(key, {
    ...record,
    status: "responded",
    history: [...record.history, crpDecisionEntry("reply", message)]
  });
  markCrpDetailOpen(crpOpenKey("line", key));
}

function crpEditLineAmount(key, amount, message) {
  const record = crpDecisionRecord(key);
  crpSaveDecisionRecord(key, {
    ...record,
    status: "responded",
    amountOverride: roundCent(amount),
    history: [...record.history, crpDecisionEntry("amount", message || `Request amount adjusted to ${fmtDetailed(amount)}`, amount)]
  });
  markCrpDetailOpen(crpOpenKey("line", key));
}

function crpDecodeDecisionKey(value = "") {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function crpOpenDecisionModal(key, mode = "reject") {
  captureCrpOpenDetails();
  state.crpDecisionModal = { key, mode };
  renderPreservingViewport();
}

function crpCloseDecisionModal() {
  captureCrpOpenDetails();
  state.crpDecisionModal = null;
  renderPreservingViewport();
}

function handleCrpDecisionFormSubmit(form) {
  captureCrpOpenDetails();
  const key = crpDecodeDecisionKey(form.dataset.crpDecisionForm || "");
  const mode = form.dataset.crpDecisionMode || "reject";
  const formData = new FormData(form);
  const message = normalizeCell(formData.get("message"));
  if (!key || !message) return;
  if (mode === "reject") crpRejectLine(key, message);
  else if (mode === "unapprove") crpUnapproveLine(key, message);
  else if (mode === "reply") crpReplyToLine(key, message);
  else if (mode === "amount") {
    const amount = parseMoney(formData.get("amount"));
    if (!Number.isFinite(amount)) return;
    crpEditLineAmount(key, amount, message);
  }
  markCrpDetailOpen(crpOpenKey("line", key));
  state.crpDecisionModal = null;
  renderPreservingViewport();
}

function fundReleaseOpenNoteModal(key) {
  state.fundReleaseNoteModal = { key };
  render();
}

function fundReleaseCloseNoteModal() {
  state.fundReleaseNoteModal = null;
  render();
}

function handleFundReleaseNoteFormSubmit(form) {
  const key = crpDecodeDecisionKey(form.dataset.fundNoteForm || "");
  const formData = new FormData(form);
  const message = normalizeCell(formData.get("message"));
  if (!key || !message) return;
  fundReleaseSaveNote(key, message);
  state.fundReleaseNoteModal = null;
  render();
}

function fundReleaseOpenOverrideModal() {
  if (!fundReleaseCanManage()) return;
  state.fundReleaseOverrideOpen = true;
  render();
}

function fundReleaseCloseOverrideModal() {
  state.fundReleaseOverrideOpen = false;
  render();
}

function handleFundReleaseOverrideFormSubmit(form) {
  const p = project(state.selectedProjectId);
  if (!p || !fundReleaseCanManage()) return;
  const formData = new FormData(form);
  const sourceKey = crpDecodeDecisionKey(formData.get("sourceKey") || "");
  const referenceKey = crpDecodeDecisionKey(formData.get("referenceKey") || "");
  const rows = fundReleaseCrpRows(p.id);
  const source = rows.find(row => row.key === sourceKey);
  const reference = rows.find(row => row.key === referenceKey);
  const description = normalizeCell(formData.get("description"));
  const mode = formData.get("mode") === "cheque" ? "cheque" : "cash";
  const amount = roundCent(parseMoney(formData.get("amount")));
  const party = normalizeCell(formData.get("party"));
  const reason = normalizeCell(formData.get("reason"));
  if (!source || !reference || sourceKey === referenceKey || !description || amount <= 0 || !party || !reason) return;
  const sourceLine = source.line || {};
  const line = reference.line || {};
  const sourceLabel = `${sourceLine.sourceVersion || source.upload?.version || "CRP"}${sourceLine.sourceRow ? ` Row ${sourceLine.sourceRow}` : ""} · ${sourceLine.description || sourceLine.category || "Budget line"}`;
  const referenceLabel = `${line.sourceVersion || reference.upload?.version || "CRP"}${line.sourceRow ? ` Row ${line.sourceRow}` : ""} · ${line.description || line.category || "Budget line"}`;
  const item = {
    id: `budget-reallocation-${Date.now()}`,
    projectId: p.id,
    sourceKey,
    sourceLabel,
    referenceKey,
    referenceLabel,
    description,
    mode,
    amount,
    party,
    reason,
    createdAt: new Date().toISOString(),
    createdBy: currentUser()
  };
  fundReleaseManualItems.push(item);
  persistFundReleaseManualItems();
  fundReleaseSaveNote(`manual::${item.id}`, `Reallocated ${fmtDetailed(amount)} from ${sourceLabel} to ${referenceLabel}. ${reason}`);
  state.fundReleaseOverrideOpen = false;
  render();
}

function crpDecisionCell(line) {
  if (!crpLineRequested(line)) return "";
  const key = crpDecisionKey(line);
  const encodedKey = escapeHtml(encodeURIComponent(key));
  const decision = crpDecisionRecord(key).status;
  const rejectSelected = decision === "rejected" || decision === "responded";
  const approveLabel = decision === "approved" ? "Remove approval" : "Approve line item";
  return `<div class="crp-decision-buttons" role="group" aria-label="Line item decision">
    <button type="button" class="crp-decision-btn approve ${decision === "approved" ? "is-selected" : ""}" data-crp-decision="${encodedKey}" data-crp-decision-value="approved" aria-label="${approveLabel}">✓</button>
    <button type="button" class="crp-decision-btn reject ${rejectSelected ? "is-selected" : ""}" data-crp-decision="${encodedKey}" data-crp-decision-value="rejected" aria-label="Reject line item">×</button>
  </div>`;
}

function crpCashReleaseCell(line) {
  const amount = crpEffectiveCashRequest(line);
  return amount ? `<b>${fmtDetailed(amount)}</b>` : "";
}

function crpChequeReleaseCell(line) {
  const amount = crpEffectiveChequeRequest(line);
  return amount ? `<b>${fmtDetailed(amount)}</b>` : "";
}

function crpSplitCell(line) {
  const workingBudget = moneyOrBlank(line.workingBudget60);
  const ceSubTotal = moneyOrBlank(line.selling);
  if (!workingBudget && !ceSubTotal) return "";
  return `<b>${workingBudget}</b>${workingBudget ? `<small>60% working budget</small>` : ""}<span>${ceSubTotal}${ceSubTotal ? `<small>CE sub-total</small>` : ""}</span>`;
}

function employeeProfileToken(name = "") {
  return encodeURIComponent(normalizeCell(name));
}

function employeeByName(name = "") {
  const key = keyCell(name);
  return db.users.find(user => keyCell(user.name) === key) || null;
}

function crpPersonNameCell(line) {
  if (!crpLineRequested(line) || (Number(line.cashRequest) || 0) <= 0) return "";
  const party = crpCounterpartyRecord(line);
  const missing = crpSupportValueMissing(party.custodian);
  const person = party.custodian;
  const employee = employeeByName(person);
  const displayName = employee
    ? `<button type="button" class="crp-employee-link" data-review="employee:${employeeProfileToken(person)}">${escapeHtml(person)}</button>`
    : escapeHtml(person);
  const label = employee ? "Spotlight employee" : "Cash custodian";
  return `<span class="crp-party-tag ${missing ? "is-placeholder" : ""}"><small>${label}</small><b>${missing ? "Add employee's name" : displayName}</b></span>`;
}

function crpSupplierNameCell(line) {
  if (!crpLineRequested(line)) return "";
  const party = crpCounterpartyRecord(line);
  const hasChequeRequest = (Number(line.chequeRequest) || 0) > 0;
  const missing = hasChequeRequest && crpSupportValueMissing(party.provider);
  const key = escapeHtml(encodeURIComponent(crpDecisionKey(line)));
  const tag = party.provider || missing ? `<span class="crp-party-tag ${missing ? "is-placeholder" : ""}"><small>${escapeHtml(counterpartyTypeLabel(party.type))}</small><b>${missing ? "Add provider / quote" : escapeHtml(party.provider)}</b></span>` : "";
  return `${tag}<button type="button" class="crp-counterparty-edit" data-crp-counterparty="${key}" title="Classify this line's parties">${party.reviewed ? "Edit" : "Classify"}</button>`;
}

function crpRunAccordion(run, index) {
  const totals = crpRunFinancials(run);
  const lineCount = crpRunAllLines(run).length;
  const requestCount = crpRunRequestLines(run).length;
  const issueCount = crpRunIssueCount(run);
  const thresholdMarks = crpRunRequestLines(run).filter(crpRequestBeyondThreshold).length;
  const savingsRatio = totals.projectCost ? (totals.projectCost - totals.requested) / totals.projectCost : 0;
  const band = crpSavingsBand(savingsRatio);
  const runKey = crpOpenKey("run", run.sourceUploadId || run.uploadId || "", run.sourceSheet || run.name || index);
  const runOpen = crpDetailsOpen(runKey, index === 0) ? "open" : "";
  return `<details class="crp-run" data-crp-open-key="${escapeHtml(runKey)}" ${runOpen}>
    <summary>
      <div><b>${escapeHtml(run.name)}</b><small>${run.sections.length} sections · ${lineCount} copied rows · ${requestCount} request lines${issueCount ? ` · ${issueCount} needs review` : ""}${thresholdMarks ? ` · ${thresholdMarks} over line 60%` : ""}</small></div>
      <span><small>CE Cost</small>${fmtDetailed(totals.projectCost)}</span>
      <span><small>60% Limit</small>${fmtDetailed(totals.budget60)}</span>
      <span><small>Cash</small>${fmtDetailed(totals.cash)}</span>
      <span><small>Cheque</small>${fmtDetailed(totals.cheque)}</span>
      <span><small>Requested</small>${fmtDetailed(totals.requested)}</span>
      <span>${chip(`${Math.round(savingsRatio * 100)}% · ${band.label}`, band.tone)}</span>
    </summary>
    <div class="crp-run-body">
      ${crpTableHeader()}
      ${run.sections.map((section, sectionIndex) => crpParsedSection(section, sectionIndex)).join("")}
    </div>
  </details>`;
}

function crpTableHeader() {
  return `<div class="crp-template-head">
    <span>Particulars</span><span>CE / Split</span><span>Cash</span><span>Cheque</span><span>Person's Name</span><span>Supplier's Name</span><span>Support</span><span>Status</span><span>Decision</span>
  </div>`;
}

function crpParsedSection(section, index) {
  const ceTotals = sectionUploadedFinancials(section);
  const crpTotals = crpSectionCrpFinancials(section);
  const requestCount = (section.lines || []).filter(crpLineRequested).length;
  const issueCount = (section.lines || []).reduce((sum, line) => sum + crpLineComputationIssues(line).length + crpSupportIssues(line).length, 0);
  const supportIssueCount = (section.lines || []).reduce((sum, line) => sum + crpSupportIssues(line).length, 0);
  const thresholdCount = (section.lines || []).filter(crpLineThresholdExceeded).length;
  const firstLine = (section.lines || [])[0] || {};
  const sectionKey = crpOpenKey("section", firstLine.sourceUploadId || firstLine.sourceFile || "", firstLine.sourceSheet || "", section.sourceRow || "", section.title || index);
  const sectionOpen = crpDetailsOpen(sectionKey, index === 0) ? "open" : "";
  return `<details class="crp-section${issueCount ? " has-issue" : ""}${thresholdCount ? " has-threshold-mark" : ""}" data-crp-open-key="${escapeHtml(sectionKey)}" ${sectionOpen}>
    <summary>
      <div class="crp-section-title" data-label="Particulars"><i>${index + 1}</i><span>${escapeHtml(section.title)}<small>${requestCount} request ${requestCount === 1 ? "line" : "lines"}${issueCount ? ` · ${issueCount} needs review` : ""}</small></span></div>
      <b class="crp-section-split" data-label="CE / Split">${fmtDetailed(crpTotals.budget60)}<small>60% budget</small><em>${fmtDetailed(ceTotals.projectCost)} CE sub-total</em></b>
      <b data-label="Cash">${moneyOrBlank(crpTotals.cash)}</b>
      <b data-label="Cheque">${moneyOrBlank(crpTotals.cheque)}</b>
      <span class="is-empty" data-label=""></span>
      <span class="is-empty" data-label=""></span>
      <strong class="${requestCount ? "" : "is-empty"}" data-label="${requestCount ? "Support" : ""}">${requestCount ? crpDot(supportIssueCount ? `${supportIssueCount} missing support item${supportIssueCount === 1 ? "" : "s"}` : "Support complete", supportIssueCount ? "risk" : "good", "support") : ""}</strong>
      <strong class="${requestCount ? "" : "is-empty"}" data-label="${requestCount ? "Status" : ""}">${requestCount ? crpDot(thresholdCount ? `${thresholdCount} above line 60% working budget` : "Within line 60% working budget", thresholdCount ? "warn" : "good", "status") : ""}</strong>
      <span class="crp-decision-cell is-empty" data-label=""></span>
    </summary>
    <div class="crp-line-items">
      ${(section.lines || []).length ? section.lines.map(crpLineRow).join("") : `<div class="empty">No workbook rows captured</div>`}
    </div>
  </details>`;
}

function crpDecisionLabel(entry = {}) {
  if (entry.type === "rejection") return "Rejection note";
  if (entry.type === "reply") return "Requester reply";
  if (entry.type === "amount") return "Amount correction";
  if (entry.type === "approval") return "Approval";
  if (entry.type === "unapproval") return "Approval removed";
  return "Update";
}

function crpDecisionStatusChip(entry = {}) {
  if (entry.type === "rejection") return chip("Requester notified", "warn");
  if (entry.type === "reply") return chip("Answered", "active");
  if (entry.type === "amount") return chip("Amount edited", "active");
  if (entry.type === "approval") return chip("Approved", "good");
  if (entry.type === "unapproval") return chip("Approval removed", "warn");
  return chip("Logged", "active");
}

function crpLineFollowupPanel(line, key, record) {
  const encodedKey = escapeHtml(encodeURIComponent(key));
  const remark = normalizeCell(line.remarks);
  const hasOpenReview = record.status === "rejected" || record.status === "responded";
  const rows = [
    remark ? `<div class="crp-trail-row is-remark">
      <span><b>Line remark</b><small>Copied from workbook</small></span>
      <p>${escapeHtml(remark)}</p>
    </div>` : "",
    ...record.history.map(entry => `<div class="crp-trail-row is-${escapeHtml(entry.type || "update")}">
      <span><b>${crpDecisionLabel(entry)}</b><small>${escapeHtml(entry.by || "System")} · ${escapeHtml(entry.at || "Now")}</small></span>
      <p>${escapeHtml(entry.text || "")}${Number.isFinite(Number(entry.amount)) ? `<strong>${fmtDetailed(entry.amount)}</strong>` : ""}</p>
      <em>${crpDecisionStatusChip(entry)}</em>
    </div>`)
  ].filter(Boolean);
  const actions = hasOpenReview ? `<div class="crp-trail-actions">
    ${record.status === "rejected" ? chip("Waiting on requester", "warn") : chip("Pending approver review", "active")}
    <button type="button" class="btn" data-crp-trail-action="reply" data-crp-trail-key="${encodedKey}">Reply</button>
    <button type="button" class="btn" data-crp-trail-action="amount" data-crp-trail-key="${encodedKey}" title="Edit amount">Edit</button>
  </div>` : "";
  return `<div class="crp-line-followup">
    ${rows.join("")}
    ${actions}
  </div>`;
}

function crpLineShouldDisclose(line, record) {
  return Boolean(normalizeCell(line.remarks) || record.history.length);
}

function crpLineRow(line) {
  const issueText = crpLineIssueText(line);
  const key = crpDecisionKey(line);
  const decision = crpDecisionRecord(key);
  const classes = ["crp-line-item"];
  if (line.groupHeader) classes.push("is-group-row");
  if (issueText) classes.push("has-issue");
  if (crpLineThresholdExceeded(line)) classes.push("has-threshold-mark");
  if (crpLineRequested(line)) classes.push("is-requested");
  if (decision.status === "approved") classes.push("is-approved");
  else if (decision.status === "rejected" || decision.status === "responded") classes.push("is-rejected");
  if (/c\/o mnl ce|reuse|re-use|one time/i.test(`${line.remarks} ${line.description}`)) classes.push("is-one-time");
  if (line.groupHeader) {
    return `<div class="${classes.join(" ")}">
      <div class="crp-particular" data-label="Particulars"><span class="crp-row-ref">Row ${escapeHtml(line.sourceRow || "")}</span><strong>${escapeHtml(line.description)}</strong></div>
    </div>`;
  }
  const splitCell = crpSplitCell(line);
  const cashCell = crpCashReleaseCell(line);
  const chequeCell = crpChequeReleaseCell(line);
  const personCell = crpPersonNameCell(line);
  const supplierCell = crpSupplierNameCell(line);
  const supportCell = crpLineSupportDot(line);
  const statusCell = crpLineStatusDot(line);
  const decisionCell = crpDecisionCell(line);
  const hasDisclosure = crpLineShouldDisclose(line, decision);
  const rowCells = `
    <div class="crp-particular" data-label="Particulars"><span class="crp-row-ref">Row ${escapeHtml(line.sourceRow || "")}</span><strong>${escapeHtml(line.description)}</strong>${hasDisclosure ? `<small class="crp-row-detail-cue">${decision.history.length ? "Follow-up trail" : "View remark"}</small>` : ""}</div>
    <div class="crp-money-stack crp-split-cell ${splitCell ? "" : "is-empty"}" data-label="${splitCell ? "CE / Split" : ""}">${splitCell}</div>
    <div class="crp-request-amount ${cashCell ? "" : "is-empty"}" data-label="${cashCell ? "Cash" : ""}">${cashCell}</div>
    <div class="crp-request-amount ${chequeCell ? "" : "is-empty"}" data-label="${chequeCell ? "Cheque" : ""}">${chequeCell}</div>
    <div class="crp-party-cell ${personCell ? "" : "is-empty"}" data-label="${personCell ? "Person's Name" : ""}">${personCell}</div>
    <div class="crp-party-cell ${supplierCell ? "" : "is-empty"}" data-label="${supplierCell ? "Supplier's Name" : ""}">${supplierCell}</div>
    <div class="crp-dot-cell ${supportCell ? "" : "is-empty"}" data-label="${supportCell ? "Support" : ""}">${supportCell}</div>
    <div class="crp-dot-cell ${statusCell ? "" : "is-empty"}" data-label="${statusCell ? "Status" : ""}">${statusCell}</div>
    <div class="crp-decision-cell ${decisionCell ? "" : "is-empty"}" data-label="${decisionCell ? "Decision" : ""}">${decisionCell}</div>`;
  if (!hasDisclosure) return `<div class="${classes.join(" ")}">${rowCells}</div>`;
  const disclosureClasses = classes.filter(className => className !== "crp-line-item").join(" ");
  const lineOpenKey = crpOpenKey("line", key);
  const open = crpDetailsOpen(lineOpenKey, Boolean(decision.history.length)) ? "open" : "";
  return `<details class="crp-line-disclosure ${disclosureClasses}" data-crp-open-key="${escapeHtml(lineOpenKey)}" ${open}>
    <summary class="${classes.join(" ")}">${rowCells}</summary>
    ${crpLineFollowupPanel(line, key, decision)}
  </details>`;
}

function crpFileSnapshot(id) {
  const upload = db.crpUploads.find(item => item.id === id);
  if (!upload) return null;
  const p = project(upload.projectId);
  const requests = crpRequestsForUpload(upload);
  const review = crpOverallReview(p.id, upload);
  const issueCount = upload.runs?.length ? crpRunsIssueCount(upload.runs) : requests.reduce((sum, request) => sum + crpRequestIssueCount(request), 0);
  const thresholdMarks = requests.filter(crpRequestBeyondThreshold).length;
  const downloadUrl = crpDownloadUrl(upload);
  const safeFile = escapeHtml(upload.file);
  return {
    kicker: "Uploaded CRP Workbook",
    kind: "crp",
    title: `${p.code} · ${upload.version}`,
    summary: `${safeFile} is attached to this CRP batch. Finance can review each request line independently while the total threshold remains visible.`,
    projectId: p.id,
    tab: "Budget Requests",
    metrics: [
      { label:"Uploaded file", value:downloadUrl ? `<a class="linkbtn" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(crpDownloadName(upload))}">${safeFile}</a>` : safeFile },
      { label:"Status", value:chip(upload.status || "for checking") },
      { label:"Request lines", value:requests.length },
      { label:"Request validation", value:issueCount ? ceScanChip(`${issueCount} issue${issueCount === 1 ? "" : "s"}`) : chip("All checked", "good") },
      { label:"Threshold marks", value:thresholdMarks ? chip(`${thresholdMarks} marked`, "warn") : chip("None", "good") },
      { label:"Batch total", value:fmtDetailed(requests.reduce((sum, request) => sum + request.amount, 0)) },
      { label:"CE project cost", value:fmtDetailed(review.projectCost) },
      { label:"ASF amount", value:fmtDetailed(review.asf) },
      { label:"40% income threshold", value:fmtDetailed(review.incomeThreshold) },
      { label:"60% expense threshold", value:fmtDetailed(review.expenseThreshold) },
      { label:"Remaining buffer", value:fmtDetailed(review.remainingBuffer) },
      { label:"Savings tag", value:chip(`${Math.round(review.savingsRatio * 100)}% · ${review.band.label}`, review.band.tone) }
    ],
    details: `<div class="snapshot-sheet crp-sheet">
      <div class="sheet-title"><span>CRP Workbook</span><b>${escapeHtml(upload.version)}</b></div>
      ${upload.actualizedSummary ? crpActualizedSummaryPanel(upload.actualizedSummary) : ""}
      ${upload.runs?.length ? crpWorkbookView(upload) : budgetTable(p.id)}
    </div>`
  };
}

function ceRunAccordion(run, index) {
  const totals = runFinancials(run);
  const lineCount = run.sections.reduce((sum, section) => sum + section.lines.length, 0);
  const issueCount = ceRunIssueCount(run);
  return `<details class="ce-run" ${index === 0 ? "open" : ""}>
    <summary>
      <div><b>${escapeHtml(run.name)}</b><small>${run.sections.length} sections · ${lineCount} copied rows${issueCount ? ` · ${issueCount} needs review` : ""}</small></div>
      <span>${fmtDetailed(totals.projectCost)}</span>
      <span>${fmtDetailed(totals.asf)}</span>
      <span>${fmtDetailed(totals.grandTotal)}</span>
    </summary>
    <div class="ce-run-body">${ceTableHeader()}${run.sections.map((section, sectionIndex) => ceParsedSection(section, sectionIndex)).join("")}${ceFooterAudit(run)}</div>
  </details>`;
}

function ceTableHeader() {
  return `<div class="ce-table-head">
    <span>No.</span><span>Particulars</span><span>Qty</span><span>Unit</span><span>Freq</span><span>Mandays</span><span>Months</span><span>Unit Cost</span><span>Sub-total</span><span>ASF 12%</span><span>Total</span><span>Notes</span>
  </div>`;
}

function ceParsedSection(section, index) {
  const uploaded = sectionUploadedFinancials(section);
  const issueText = ceSectionIssueText(section);
  return `<details class="ce-section${issueText ? " has-issue" : ""}" ${index === 0 ? "open" : ""}>
    <summary>
      <i>${index + 1}</i>
      <span>${escapeHtml(section.title)} · ${section.lines.length} copied ${section.lines.length === 1 ? "row" : "rows"}${issueText ? `<em class="ce-section-flag">Needs review</em>` : ""}</span>
      <b>${ceSectionMoneyDisplay(section, "unitCost", uploaded.unitCost)}</b>
      <b>${ceSectionMoneyDisplay(section, "subTotal", uploaded.projectCost)}</b>
      <b>${ceSectionMoneyDisplay(section, "asf", uploaded.asf)}</b>
      <b>${ceSectionMoneyDisplay(section, "total", uploaded.total)}</b>
      <strong class="ce-checker-note ${issueText ? "has-message" : ""}">${escapeHtml(issueText)}</strong>
    </summary>
    <div class="ce-line-items">
      ${section.lines.length ? section.lines.map(ceLineRow).join("") : `<div class="empty">No workbook rows captured</div>`}
    </div>
  </details>`;
}

function ceSectionComputationIssues(section) {
  if (!section?.totals) return [];
  const expected = sectionFinancials(section);
  const uploaded = sectionUploadedFinancials(section);
  const raw = section.totals.rawValues || {};
  const issues = [];
  ceAmountIssue(issues, "Section unit cost", expected.unitCost, uploaded.unitCost, raw.unitCost, { required: true });
  ceAmountIssue(issues, "Section sub-total", expected.projectCost, uploaded.projectCost, raw.subTotal, { required: true });
  ceAmountIssue(issues, "Section ASF", expected.asf, uploaded.asf, raw.asf, { required: true });
  ceAmountIssue(issues, "Section total", expected.total, uploaded.total, raw.total, { required: true });
  return issues;
}

function ceSectionIssueText(section) {
  const issues = ceSectionComputationIssues(section);
  return issues.length ? [`Section total needs review`, ...issues].join(" · ") : "";
}

function ceSectionRawCell(section, key) {
  if (!section.totals?.rawValues) return null;
  const value = normalizeCell(section.totals.rawValues[key]);
  return value === "" ? "" : value;
}

function ceSectionMoneyDisplay(section, key, fallback) {
  const raw = ceSectionRawCell(section, key);
  if (raw === "") return "";
  if (raw !== null) return fmtDetailed(parseMoney(raw));
  return fmtDetailed(fallback);
}

function ceFooterRows(run) {
  const expected = runFinancials(run);
  const footer = run.footerTotals || {};
  return [
    { key:"subTotal", label:"Footer Sub-total", uploaded: footer.subTotal?.amount, expected: expected.subTotal, sourceRow: footer.subTotal?.sourceRow },
    { key:"vat", label:"Footer VAT 12%", uploaded: footer.vat?.amount, expected: expected.vat, sourceRow: footer.vat?.sourceRow },
    { key:"grandTotal", label:"Footer Grand Total", uploaded: footer.grandTotal?.amount, expected: expected.grandTotal, sourceRow: footer.grandTotal?.sourceRow }
  ].filter(row => typeof row.uploaded === "number");
}

function ceFooterRowIssues(row) {
  const issues = [];
  ceAmountIssue(issues, row.label, row.expected, row.uploaded, String(row.uploaded), { required: true });
  return issues;
}

function ceFooterAudit(run) {
  const rows = ceFooterRows(run);
  if (!rows.length) return "";
  return `<div class="ce-footer-audit">
    <h4>Footer Total Check <span>Uploaded vs recomputed</span></h4>
    <div class="ce-footer-row ce-footer-head"><span>Footer row</span><span>Uploaded</span><span>Expected</span><span>Variance</span><span>Status</span><span>Notes</span></div>
    ${rows.map(row => {
      const issues = ceFooterRowIssues(row);
      const variance = roundCent(row.uploaded - row.expected);
      const message = issues.join(" · ");
      return `<div class="ce-footer-row${issues.length ? " has-issue" : ""}">
        <span>${escapeHtml(row.label)}${row.sourceRow ? ` <small>Row ${row.sourceRow}</small>` : ""}</span>
        <b>${fmtDetailed(row.uploaded)}</b>
        <b>${fmtDetailed(row.expected)}</b>
        <b>${fmtDetailed(variance)}</b>
        <span>${issues.length ? chip("Needs review", "warn") : chip("Pass", "good")}</span>
        <span class="ce-checker-note ${issues.length ? "has-message" : ""}">${escapeHtml(message)}</span>
      </div>`;
    }).join("")}
  </div>`;
}

function isAsfLine(line) {
  return /agency service fee|^asf$/i.test(`${line.category} ${line.description}`);
}

function ceSectionFor(line) {
  const text = `${line.category} ${line.description}`.toLowerCase();
  if (/creative|concept|graphic|copy|copywriting/.test(text)) return "Creative Fee";
  if (/production|talent|host|performer|manpower|field|team leader|brand ambassador|project manager|coordinator|show director|stage manager|playback/.test(text)) return "Production & Talents";
  if (/setup|staging|technical|fabrication|stage|led|sound|lights|photobooth|back panel|arc/.test(text)) return "Setup, Staging, and Technicals";
  return "Miscellaneous";
}

function ceSectionAccordion(lines, ce = {}) {
  const sections = ["Creative Fee", "Production & Talents", "Setup, Staging, and Technicals", "Miscellaneous"];
  const grouped = sections.map(section => {
    const items = lines.filter(line => ceSectionFor(line) === section);
    const totals = items.reduce((sum, line) => {
      const money = ceLineMoney(line);
      sum.unitCost += money.unitCostTotal;
      sum.subTotal += money.subTotal;
      sum.asf += money.asf;
      sum.total += money.total;
      return sum;
    }, { unitCost:0, subTotal:0, asf:0, total:0 });
    return { section, items, totals };
  });
  const grand = grouped.reduce((sum, group) => {
    sum.subTotal += group.totals.subTotal;
    sum.asf += group.totals.asf;
    sum.total += group.totals.total;
    return sum;
  }, { subTotal:0, asf:0, total:0 });
  const computed = ceFinancials(ce);
  const vat = ce.vat ?? roundCent(grand.total * settings.vatDefault);
  const grossAmount = ce.revenue ? computed.grandTotal : roundCent(grand.total + vat);
  return `<div class="ce-sheet">
    <div class="ce-sheet-meta"><span>Spotlight CE worksheet format</span><b>ASF is shown as a column, not a line item</b></div>
    ${ceTableHeader()}
    ${grouped.map((group, index) => `<details class="ce-section" ${index === 0 ? "open" : ""}>
      <summary>
        <i>${index + 1}</i>
        <span>${group.section} · ${group.items.length} ${group.items.length === 1 ? "item" : "items"}</span>
        <b>${fmt(group.totals.unitCost)}</b>
        <b>${fmt(group.totals.subTotal)}</b>
        <b>${fmt(group.totals.asf)}</b>
        <b>${fmt(group.totals.total)}</b>
        <strong class="ce-checker-note"></strong>
      </summary>
      <div class="ce-line-items">
        ${group.items.length ? group.items.map(ceLineRow).join("") : `<div class="empty">No line items in this section</div>`}
      </div>
    </details>`).join("")}
    <div class="ce-grand-total"><span>Project Cost</span><b>${fmtDetailed(grand.subTotal || computed.projectCost)}</b><span>Sub-total</span><b>${fmtDetailed(grand.total || computed.subTotal)}</b><span>VAT 12%</span><b>${fmtDetailed(vat)}</b><span>Gross Amount</span><b>${fmtDetailed(grossAmount)}</b></div>
  </div>`;
}

function ceLineMoney(line) {
  const expected = ceLineExpectedAmounts(line);
  if (ceLineIsMenuReference(line)) {
    return { ...expected, unitCostTotal: expected.unitCost, subTotal: 0, asf: 0, total: 0 };
  }
  if (line.parsedFromTemplate) {
    return expected;
  }
  const subTotal = roundCent(line.selling || expected.unitCostTotal);
  const asf = roundCent(subTotal * settings.asfDefault);
  return { ...expected, subTotal, asf, total: roundCent(subTotal + asf) };
}

function ceLineExpectedAmounts(line) {
  const qty = ceMathFactor(line.qty);
  const freq = ceMathFactor(line.freq);
  const mandays = ceMathFactor(line.mandays);
  const months = ceMathFactor(line.months);
  const unitCost = roundCent(line.unitCost || 0);
  const unitCostTotal = roundCent(unitCost * qty * freq * mandays * months);
  const subTotal = unitCostTotal;
  const asf = roundCent(subTotal * settings.asfDefault);
  return { qty, freq, mandays, months, unit: line.unit || "lot", unitCost, unitCostTotal, subTotal, asf, total: roundCent(subTotal + asf) };
}

function ceWorkbookIssueCount(runs = []) {
  return runs.reduce((count, run) => count + ceRunIssueCount(run), 0);
}

function ceRunIssueCount(run) {
  const lineIssues = run.sections.reduce((sectionCount, section) => sectionCount + section.lines.filter(line => ceLineComputationIssues(line).length).length, 0);
  const sectionIssues = run.sections.filter(section => ceSectionComputationIssues(section).length).length;
  const footerIssues = ceFooterRows(run).filter(row => ceFooterRowIssues(row).length).length;
  return lineIssues + sectionIssues + footerIssues;
}

function ceLineIssueText(line) {
  const issues = ceLineComputationIssues(line);
  if (issues.length) return [`Needs review`, ...issues].join(" · ");
  if (ceLineIsMenuReference(line)) return "Menu Price Only";
  return "";
}

function ceLineComputationIssues(line) {
  if (line.groupHeader || !line.parsedFromTemplate || !(line.unitCost || line.selling || line.asfAmount || line.totalAmount)) return [];
  if (ceLineIsMenuReference(line)) return [];
  const issues = [];
  const expected = ceLineExpectedAmounts(line);
  ceAmountIssue(issues, "Sub-total", expected.subTotal, line.selling, line.rawValues?.subTotal);
  ceAmountIssue(issues, "ASF", expected.asf, line.asfAmount, line.rawValues?.asf);
  ceAmountIssue(issues, "Total", expected.total, line.totalAmount, line.rawValues?.total);
  return issues;
}

function ceMathFactor(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function ceAmountIssue(issues, label, expected, actual, rawValue, options = {}) {
  if (normalizeCell(rawValue) === "") {
    if (options.required && Math.abs(expected) > 1) issues.push(`${label} is blank; should be ${fmtDetailed(expected)}`);
    return;
  }
  if (Math.abs(roundCent(actual) - expected) <= 1) return;
  issues.push(`${label} should be ${fmtDetailed(expected)}; uploaded ${fmtDetailed(actual)}`);
}

function ceLineIsMenuReference(line) {
  if (line.groupHeader || !line.parsedFromTemplate) return false;
  const unitCost = parseMoney(line.rawValues?.unitCost || line.unitCost);
  if (!unitCost) return false;
  return normalizeCell(line.rawValues?.subTotal) === "" &&
    normalizeCell(line.rawValues?.asf) === "" &&
    normalizeCell(line.rawValues?.total) === "";
}

function ceLineRow(line) {
  const issues = ceLineComputationIssues(line);
  const classes = ["ce-line-item"];
  if (line.groupHeader) classes.push("is-group-row");
  if (issues.length) classes.push("has-issue");
  if (ceLineIsMenuReference(line)) classes.push("is-menu-reference");
  return `<div class="${classes.join(" ")}">${ceLineCells(line)}</div>`;
}

function ceRawCell(line, key) {
  if (!line.rawValues) return null;
  const value = normalizeCell(line.rawValues[key]);
  return value === "" ? "" : value;
}

function ceTextDisplay(line, key, fallback = "") {
  const raw = ceRawCell(line, key);
  return raw === null ? fallback : raw;
}

function ceMoneyDisplay(line, key, fallback) {
  const raw = ceRawCell(line, key);
  if (raw === "") return "";
  if (raw !== null) return moneyOrBlank(parseMoney(raw));
  return moneyOrBlank(fallback);
}

function ceLineCells(line) {
  if (line.groupHeader) {
    const filler = Array.from({ length: 10 }, () => `<span aria-hidden="true"></span>`).join("");
    return `<span data-label="Row">${line.sourceRow || ""}</span>
      <div class="ce-particular" data-label="Workbook row"><strong>${escapeHtml(line.description)}</strong></div>
      ${filler}`;
  }
  const money = ceLineMoney(line);
  const remark = line.remarks || line.remark || "";
  const issues = ceLineComputationIssues(line);
  const note = ceLineIssueText(line);
  const hasAmount = Boolean(line.unitCost || line.selling);
  const descriptor = remark || line.supplier || line.group || "";
  const qtyDisplay = ceTextDisplay(line, "qty", hasAmount ? money.qty : "");
  const unitDisplay = ceTextDisplay(line, "unit", hasAmount ? money.unit : "");
  const freqDisplay = ceTextDisplay(line, "freq", hasAmount ? money.freq : "");
  const mandaysDisplay = ceTextDisplay(line, "mandays", hasAmount ? money.mandays : "");
  const monthsDisplay = ceTextDisplay(line, "months", hasAmount ? money.months : "");
  return `<span data-label="No.">${line.sourceRow || line.no || ""}</span>
    <div class="ce-particular" data-label="Particulars"><strong>${escapeHtml(line.description)}</strong>${descriptor ? `<small>${escapeHtml(descriptor)}</small>` : ""}</div>
    <span data-label="Qty">${escapeHtml(qtyDisplay)}</span>
    <span data-label="Unit">${escapeHtml(unitDisplay)}</span>
    <span data-label="Freq">${escapeHtml(freqDisplay)}</span>
    <span data-label="Mandays">${escapeHtml(mandaysDisplay)}</span>
    <span data-label="Months">${escapeHtml(monthsDisplay)}</span>
    <b data-label="Unit Cost">${ceMoneyDisplay(line, "unitCost", hasAmount ? money.unitCost : 0)}</b>
    <b data-label="Sub-total">${ceMoneyDisplay(line, "subTotal", money.subTotal)}</b>
    <b data-label="ASF 12%">${ceMoneyDisplay(line, "asf", money.asf)}</b>
    <b data-label="Total">${ceMoneyDisplay(line, "total", money.total)}</b>
    <span class="ce-checker-note ${issues.length ? "has-message" : ""}${ceLineIsMenuReference(line) ? " is-menu-note" : ""}" data-label="Checker Notes">${escapeHtml(note)}</span>`;
}

function moneyOrDash(value) {
  return Math.abs(Number(value) || 0) > 0 ? fmtDetailed(value) : "-";
}

function moneyOrBlank(value) {
  return Math.abs(Number(value) || 0) > 0 ? fmtDetailed(value) : "";
}

function crpSnapshot(id) {
  const request = db.budgetRequests.find(b => b.id === id);
  if (!request) return null;
  const p = project(request.projectId);
  const ce = signedCe(p.id) || currentCe(p.id);
  const upload = crpUploadForRequest(request);
  const requests = upload ? crpRequestsForUpload(upload) : crpRequests(p.id);
  const review = crpOverallReview(p.id, upload);
  const totalCrp = review.total;
  const basis = review.basis;
  const usage = basis ? Math.round((totalCrp / basis) * 100) : 0;
  const matchingRelease = db.releases.find(r => r.requestId === request.id);
  const lineThreshold = crpRequestBeyondThreshold(request);
  const computation = crpComputationCheck(request);
  const support = crpSupportCheck(request);
  const notes = crpLineIssueText(request);
  const lineRows = requests.map(item => {
    const lineShare = basis ? Math.round((item.amount / basis) * 100) : 0;
    const isTrigger = item.id === request.id;
    return `<div class="${isTrigger ? "flagged" : ""}">
      <span>${item.category}</span>
      <b>${fmt(item.amount)}</b>
      <small>${item.runName || item.sourceSheet || item.requestor} · ${item.holder} · ${lineShare}% of CE cost basis${crpRequestBeyondThreshold(item) ? " · over line 60%" : ""}</small>
    </div>`;
  }).join("");
  return {
    kicker: "CRP Line Review",
    kind: "crp",
    title: `${p.code} · ${request.category}`,
    summary: notes || (lineThreshold ? "This line item is above its 60% working budget. This is marked for visibility, with no correction note unless computation or support is missing." : "This request line is ready for finance review."),
    projectId: p.id,
    tab: "Budget Requests",
    metrics: [
      { label:"Run", value:request.runName || request.sourceSheet || "Manual" },
      { label:"CE sub-total", value:fmtDetailed(request.ceSubTotal || request.expectedAmount || 0) },
      { label:"Line 60%", value:fmtDetailed(request.workingBudget60 || 0) },
      { label:"Cash request", value:fmtDetailed(request.cashRequest || 0) },
      { label:"Cheque request", value:fmtDetailed(request.chequeRequest || 0) },
      { label:"Actual request", value:fmtDetailed(request.amount || 0) },
      { label:"Computation", value:chip(computation.label, computation.tone) },
      { label:"Support", value:chip(support.label, support.tone) },
      { label:"Line threshold", value:lineThreshold ? chip("Over line 60%", "warn") : chip("Within line 60%", "good") },
      { label:"Total CRP request", value:`${fmtDetailed(totalCrp)} · ${usage}%` },
      { label:"Remaining buffer", value:fmtDetailed(review.remainingBuffer) },
      { label:"Savings tag", value:chip(`${Math.round(review.savingsRatio * 100)}% · ${review.band.label}`, review.band.tone) },
      { label:"Status", value:chip(request.status) }
    ],
    details: `<div class="snapshot-sheet crp-sheet">
      <div class="sheet-title"><span>CRP Request Snapshot</span><b>${request.id.toUpperCase()}</b></div>
      <div class="sheet-grid">
        <div><small>Project</small><strong>${p.code}</strong><span>${p.name}</span></div>
        <div><small>CE basis</small><strong>${ce ? ce.version : "No CE uploaded"}</strong><span>${ce ? ce.file : "CRP uses project budget until a CE is available"}</span></div>
        <div><small>Current request</small><strong>${request.category} · ${fmtDetailed(request.amount)}</strong><span>${escapeHtml(request.description || request.holder || "")}</span></div>
        <div><small>Release status</small><strong>${matchingRelease ? matchingRelease.status : "Not yet released"}</strong><span>${matchingRelease ? `${matchingRelease.mode} · ${matchingRelease.payee}` : "Pending finance processing"}</span></div>
      </div>
      ${notes ? `<div class="ce-validation-alert"><b>Needs review</b><span>${escapeHtml(notes)}</span></div>` : ""}
      <div class="snapshot-list">
        <h4>Requests in this batch</h4>
        ${lineRows}
      </div>
      <div class="threshold-meter">
        <span>CRP requests against CE project cost</span>
        <div><i style="width:${Math.min(100, usage)}%"></i><em style="left:60%"></em></div>
        <b>${fmt(totalCrp)} of ${fmt(basis)} · ${Math.round(review.savingsRatio * 100)}% saved</b>
      </div>
    </div>`
  };
}

function employeeNameFromToken(token = "") {
  try {
    return normalizeCell(decodeURIComponent(token));
  } catch (error) {
    return normalizeCell(token);
  }
}

function cashAmountForRequest(request = {}) {
  if ((Number(request.cashRequest) || 0) > 0) return roundCent(Number(request.cashRequest) || 0);
  return /cash/i.test(request.releaseType || "") ? roundCent(Number(request.amount) || 0) : 0;
}

function cashAccountabilityOpen(status = "") {
  return !/cleared|cancelled|declined|void/i.test(status);
}

function employeeCashProfileSnapshot(token) {
  const name = employeeNameFromToken(token);
  if (!name) return null;
  const employee = employeeByName(name) || { name, role: "Spotlight employee" };
  const key = keyCell(employee.name);
  const cashRequests = db.budgetRequests.filter(request =>
    keyCell(request.recipient) === key &&
    cashAmountForRequest(request) > 0 &&
    cashAccountabilityOpen(request.status)
  );
  const cashRequestIds = new Set(cashRequests.map(request => request.id));
  const cashReleases = db.releases.filter(release =>
    keyCell(release.employee) === key &&
    (/cash/i.test(release.mode || "") || cashRequestIds.has(release.requestId)) &&
    cashAccountabilityOpen(release.status)
  );
  const openLiquidations = db.liquidations.filter(liquidation =>
    keyCell(liquidation.employee) === key &&
    cashAccountabilityOpen(liquidation.status)
  );
  const requestTotal = roundCent(cashRequests.reduce((sum, request) => sum + cashAmountForRequest(request), 0));
  const releaseTotal = roundCent(cashReleases.reduce((sum, release) => sum + (Number(release.amount) || 0), 0));
  const liquidationBalance = roundCent(openLiquidations.reduce((sum, item) => sum + Math.max(0, (Number(item.released) || 0) - (Number(item.liquidated) || 0) - (Number(item.returned) || 0)), 0));
  const reimbursementTotal = roundCent(openLiquidations.reduce((sum, item) => sum + (Number(item.reimbursable) || 0), 0));
  const cashReturnTotal = roundCent(openLiquidations.reduce((sum, item) => sum + (Number(item.returned) || 0), 0));
  const accountabilityRows = [
    ...cashRequests.map(request => {
      const p = project(request.projectId);
      return {
        label: "Cash request",
        amount: cashAmountForRequest(request),
        status: request.status,
        detail: `${p ? `${p.code} · ` : ""}${request.category || request.description || "Budget request"} · ${request.sourceVersion || request.sourceFile || "CRP"}`
      };
    }),
    ...cashReleases.map(release => {
      const p = project(release.projectId);
      return {
        label: "Cash release",
        amount: release.amount,
        status: release.status,
        detail: `${p ? `${p.code} · ` : ""}${release.category || release.payee || "Release"} · ${formatShortDate(release.date)}`
      };
    }),
    ...openLiquidations.map(item => {
      const p = project(item.projectId);
      const balance = Math.max(0, (Number(item.released) || 0) - (Number(item.liquidated) || 0) - (Number(item.returned) || 0));
      return {
        label: "Liquidation",
        amount: balance || item.reimbursable || item.released,
        status: item.status,
        detail: `${p ? `${p.code} · ` : ""}${item.findings || `Due ${formatShortDate(item.due)}`}`
      };
    })
  ];
  return {
    kicker: "Employee Accountability Profile",
    kind: "employee",
    title: employee.name,
    summary: "This preview shows active cash accountability linked to the employee. Items disappear from this view once approvers or finance clear the request or liquidation.",
    projectId: null,
    tab: "",
    metrics: [
      { label:"Role", value:employee.role },
      { label:"Open cash requests", value:fmtDetailed(requestTotal) },
      { label:"Released to clear", value:fmtDetailed(releaseTotal) },
      { label:"Liquidation balance", value:fmtDetailed(liquidationBalance) },
      { label:"Cash returns", value:fmtDetailed(cashReturnTotal) },
      { label:"Reimbursements", value:fmtDetailed(reimbursementTotal) }
    ],
    details: `<div class="snapshot-sheet employee-sheet">
      <div class="sheet-title"><span>Cash Accountability</span><b>${accountabilityRows.length} active ${accountabilityRows.length === 1 ? "item" : "items"}</b></div>
      <div class="snapshot-list employee-accountability-list">
        <h4>Open items</h4>
        ${accountabilityRows.length ? accountabilityRows.map(item => `<div class="${/overdue|review|reimbursement|return/i.test(item.status || "") ? "flagged" : ""}">
          <span>${escapeHtml(item.label)}</span>
          <b>${fmtDetailed(item.amount)}</b>
          <small>${escapeHtml(item.status || "Open")} · ${escapeHtml(item.detail)}</small>
        </div>`).join("") : `<div><span>No open cash accountability</span><b>${fmtDetailed(0)}</b><small>Cleared requests and liquidations are hidden from this profile.</small></div>`}
      </div>
    </div>`
  };
}

function liquidationSnapshot(id) {
  const liq = db.liquidations.find(l => l.id === id);
  if (!liq) return null;
  const p = project(liq.projectId);
  const release = db.releases.find(r => r.id === liq.releaseId) || {};
  const balance = Math.max(0, liq.released - liq.liquidated - liq.returned);
  return {
    kicker: "Liquidation Override",
    kind: "liquidation",
    title: `${p.code} · ${liq.employee}`,
    summary: liq.findings || "Liquidation requires management review before override.",
    projectId: p.id,
    tab: "Liquidations",
    metrics: [
      { label:"Released", value:fmt(liq.released) },
      { label:"Liquidated", value:fmt(liq.liquidated) },
      { label:"For return", value:fmt(liq.returned) },
      { label:"Reimbursable", value:fmt(liq.reimbursable) },
      { label:"Due date", value:liq.due },
      { label:"Status", value:chip(liq.status) }
    ],
    details: `<div class="snapshot-sheet liquidation-sheet">
      <div class="sheet-title"><span>Liquidation Audit Snapshot</span><b>${liq.id.toUpperCase()}</b></div>
      <div class="liquidation-ledger">
        <div><span>Released</span><b>${fmt(liq.released)}</b></div>
        <div><span>Liquidated</span><b>${fmt(liq.liquidated)}</b></div>
        <div><span>Cash return</span><b>${fmt(liq.returned)}</b></div>
        <div><span>Reimbursement</span><b>${fmt(liq.reimbursable)}</b></div>
        <div><span>Open balance</span><b>${fmt(balance)}</b></div>
      </div>
      <div class="snapshot-list">
        <h4>Audit Context</h4>
        <div><span>Release source</span><b>${release.category || "Cash advance"}</b><small>${release.payee || "Payee not recorded"} · ${release.mode || "Mode not recorded"}</small></div>
        <div><span>Aging</span><b>${agingDays(liq.due)} days</b><small>Due ${liq.due}${liq.submitted ? ` · submitted ${liq.submitted}` : " · not yet submitted"}</small></div>
        <div><span>Receipt issue</span><b>${liq.findings ? "Has finding" : "No finding"}</b><small>${liq.findings || "No audit findings recorded."}</small></div>
      </div>
    </div>`
  };
}
function reconciliationTable() {
  const cats = [...new Set(db.ceLines.map(l => l.category))];
  const rows = cats.map(category => {
    const approved = db.ceLines.filter(l => l.category === category).reduce((s,l)=>s+l.unitCost,0);
    const requested = db.budgetRequests.filter(b => b.category.includes(category) || category.includes(b.category)).reduce((s,b)=>s+b.amount,0);
    const released = db.releases.filter(r => r.category.includes(category) || category.includes(r.category)).reduce((s,r)=>s+r.amount,0);
    const actual = db.liquidations.filter(l => db.releases.find(r => r.id === l.releaseId && (r.category.includes(category) || category.includes(r.category)))).reduce((s,l)=>s+l.liquidated-l.returned,0);
    return { category, approved:fmt(approved), requested:fmt(requested), released:fmt(released), actualCost:fmt(actual), variance:fmt(approved - actual) };
  });
  return simpleTable(rows, ["category","approved","requested","released","actualCost","variance"]);
}
function reconcile(projectId) {
  const p = project(projectId);
  if (!p) return { approved:0, requested:0, released:0, actual:0 };
  return {
    approved: p.approvedCe || p.estimatedCost,
    requested: db.budgetRequests.filter(b=>b.projectId===projectId).reduce((s,b)=>s+b.amount,0),
    released: db.releases.filter(r=>r.projectId===projectId).reduce((s,r)=>s+r.amount,0),
    actual: projectCost(p)
  };
}

function accountFinanceProjects() {
  if (canonicalRole() === "ACCOUNTS HEAD") return db.projects.filter(item => item.stage !== "LOST");
  const owner = currentUser();
  return db.projects.filter(item => item.owner === owner && item.stage !== "LOST");
}

function executiveFinanceTile(label, value, hint, tone = "neutral") {
  return `<article class="executive-finance-tile is-${tone}">${financeTermLabel(label)}<b>${escapeHtml(value)}</b><small>${escapeHtml(hint)}</small></article>`;
}

const financeTermDefinitions = {
  "Total Collection":"All client payments already received and recorded, regardless of payment method.",
  "Cash Recouped":"Unused project or manpower funds already returned to Spotlight after liquidation.",
  "Project Savings":"The unused portion of approved project budgets after actual project expenses are recorded.",
  "Total Net Revenue":"Recognized revenue less recorded project expenses.",
  "Forecasted Revenue":"Expected revenue from active projects that has not yet been recognized as earned revenue.",
  "Accounts Receivable":"Client invoices already issued but not yet collected.",
  "Accounts Payable":"Recorded supplier obligations that Spotlight still needs to pay.",
  "Net Working Capital":"Total Collection plus AR, less released project funds and AP. This is the current project-funding position shown by this dashboard.",
  "Recognized Revenue":"Revenue from projects that has already been recorded as earned.",
  "Project Expenses":"All recorded project costs, including employee-paid cash expenses and Finance-paid cheque expenses.",
  "Revenue":"The project's recorded or expected revenue, based on its current stage.",
  "Cash + Cheque Expenses":"The project's combined employee-paid cash costs and Finance-paid cheque costs.",
  "Savings":"The approved project budget less recorded actual project costs.",
  "Net / Margin":"Net revenue and its percentage of project revenue.",
  "Open Accountability":"Released employee cash attached to an uncleared liquidation packet.",
  "Cash Return Due":"Unused released cash that must be returned before clearance.",
  "Reimbursements":"Employee-paid project expenses above released cash that require Finance review and CEO approval.",
  "Overdue Packets":"Liquidation packets still open after their filing deadline.",
  "Exposure":"The combined open accountability under the project.",
  "Accountability":"Released cash that remains under the employee's responsibility until clearance.",
  "Due":"The agreed deadline for payment, return, or liquidation.",
  "Aging":"Calendar days counted after the due date; no aging is counted before an item is overdue."
};

function financeTermLabel(label) {
  const definition = financeTermDefinitions[label];
  if (!definition) return `<span>${escapeHtml(label)}</span>`;
  return `<span class="finance-term-label">${escapeHtml(label)}<button class="finance-term-help" type="button" aria-label="Define ${escapeHtml(label)}" title="${escapeHtml(definition)}">?</button><span class="finance-term-tip" role="tooltip">${escapeHtml(definition)}</span></span>`;
}

function executiveFinanceProjectRows() {
  return metrics().active.slice().sort((a, b) => eventDate(b).localeCompare(eventDate(a))).map(item => {
    const revenue = Number(item.actualRevenue || item.expectedRevenue || item.approvedCe || item.value || 0);
    const expense = Number(item.actualCost || item.estimatedCost || 0);
    const savings = Number(item.savings || Math.max(0, revenue - expense - Number(item.asf || 0)));
    const net = revenue - expense;
    const netMargin = revenue ? Math.round(net / revenue * 100) : 0;
    const bucket = projectBucket(item);
    const tone = bucket === "For Pitch/Bidding" ? "pitch" : bucket === "On-Going" ? "ongoing" : "collection";
    return `<div class="executive-project-row is-${tone}" role="button" tabindex="0" data-project="${item.id}" data-executive-project-row>
      <span class="executive-project-name"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(client(item.clientId)?.company || "Client")} · ${escapeHtml(bucket)} · ${formatShortDate(eventDate(item))}</small></span>
      <span><small>${financeTermLabel("Revenue")}</small><b>${fmt(revenue)}</b></span>
      <span><small>${financeTermLabel("Cash + Cheque Expenses")}</small><b>${fmt(expense)}</b></span>
      <span><small>${financeTermLabel("Savings")}</small><b>${fmt(savings)}</b></span>
      <span class="${netMargin < settings.targetGrossMargin * 100 ? "is-risk" : "is-good"}"><small>${financeTermLabel("Net / Margin")}</small><b>${fmt(net)} · ${netMargin}%</b></span>
    </div>`;
  }).join("");
}

function executiveFinanceExposureGroups() {
  const grouped = new Map();
  db.liquidations.filter(item => !/cleared/i.test(item.status)).forEach(item => {
    const items = grouped.get(item.projectId) || [];
    items.push(item);
    grouped.set(item.projectId, items);
  });
  return [...grouped.entries()]
    .sort(([projectA], [projectB]) => eventDate(project(projectB)).localeCompare(eventDate(project(projectA))))
    .map(([projectId, items], index) => {
      const projectRecord = project(projectId);
      const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.released || 0) - Number(item.returned || 0)), 0);
      const maxDays = Math.max(0, ...items.map(item => agingDays(item.due)));
      const people = new Set(items.map(item => item.employee)).size;
      const rows = items.slice().sort((a, b) => agingDays(b.due) - agingDays(a.due)).map(item => {
        const outstanding = Math.max(0, Number(item.released || 0) - Number(item.returned || 0));
        const daysOverdue = agingDays(item.due);
        return `<div class="executive-exposure-row" role="button" tabindex="0" data-liquidation-record="${escapeHtml(item.id)}" data-liquidation-project="${escapeHtml(item.projectId)}">
          <span><b>${escapeHtml(item.employee)}</b><small>${escapeHtml(item.status)}</small></span>
          <span><small>${financeTermLabel("Accountability")}</small><b>${fmt(outstanding)}</b></span>
          <span><small>${financeTermLabel("Due")}</small><b>${formatShortDate(item.due)}</b></span>
          <span class="executive-aging ${daysOverdue ? "is-overdue" : ""}"><small>${financeTermLabel("Aging")}</small><b>${daysOverdue ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : "Current"}</b></span>
        </div>`;
      }).join("");
      return `<details class="executive-exposure-project" ${index === 0 ? "open" : ""}>
        <summary><span><b>${escapeHtml(projectRecord?.name || "Project")}</b><small>${escapeHtml(projectRecord?.code || "")} · ${people} ${people === 1 ? "person" : "people"}</small></span><span><small>${financeTermLabel("Exposure")}</small><b>${fmt(total)}</b></span><span class="${maxDays ? "is-overdue" : ""}"><small>${financeTermLabel("Aging")}</small><b>${maxDays ? `${maxDays} days overdue` : "Current"}</b></span></summary>
        <div><div class="executive-exposure-project-action"><button class="btn compact" type="button" data-liquidation-project="${escapeHtml(projectId)}">View</button></div>${rows}</div>
      </details>`;
    }).join("");
}

function executiveFinancePage(access) {
  const summary = metrics();
  const cashCollected = db.collections.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashDeployed = db.releases.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashRecouped = db.liquidations.filter(item => /cleared/i.test(item.status)).reduce((sum, item) => sum + Number(item.returned || 0), 0);
  const accountsPayable = apDetailRows().reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recognizedRevenue = db.projects.reduce((sum, item) => sum + Number(item.actualRevenue || 0), 0);
  const projectExpenses = db.projects.reduce((sum, item) => sum + Number(item.actualCost || 0), 0);
  const netRevenue = recognizedRevenue - projectExpenses;
  const projectSavings = db.projects.reduce((sum, item) => sum + Number(item.savings || 0), 0);
  const forecastedRevenue = summary.active.filter(item => !Number(item.actualRevenue || 0)).reduce((sum, item) => sum + Number(item.expectedRevenue || 0), 0);
  const openLiquidations = db.liquidations.filter(item => !/cleared/i.test(item.status));
  const liquidationExposure = openLiquidations.reduce((sum, item) => sum + Math.max(0, Number(item.released || 0) - Number(item.returned || 0)), 0);
  const reimbursements = openLiquidations.reduce((sum, item) => sum + Number(item.reimbursable || 0), 0);
  const returnsDue = openLiquidations.filter(item => /cash return/i.test(item.status)).reduce((sum, item) => sum + Number(item.returned || 0), 0);
  const arRows = arDetailRows();
  const apRows = apDetailRows();
  return `<section class="executive-finance">
    <div class="toolbar executive-finance-heading"><div><span class="page-eyebrow">Executive Finance</span><h2>Business Financial Health</h2><p>Collections, working capital, profitability, project performance, and liquidation exposure in one view.</p></div>${chip(access.readOnly ? "View only" : "Finance workspace", access.readOnly ? "active" : "good")}</div>

    <section class="executive-finance-section is-cashflow">
      <div class="executive-finance-band"><div><span>Business Life</span><h3>Collection, Returns &amp; Working Capital</h3></div><small>Collection + savings + forecasted revenue, less obligations</small></div>
      <div class="executive-finance-grid">
        ${executiveFinanceTile("Total Collection", fmt(cashCollected), "Client payments received", "good")}
        ${executiveFinanceTile("Cash Recouped", fmt(cashRecouped), "Unused manpower and project cash returned", "active")}
        ${executiveFinanceTile("Project Savings", fmt(projectSavings), "Savings against approved project budgets", "active")}
        ${executiveFinanceTile("Total Net Revenue", fmt(netRevenue), "Recognized revenue less recorded expenses", netRevenue >= 0 ? "good" : "risk")}
        ${executiveFinanceTile("Forecasted Revenue", fmt(forecastedRevenue), "Expected revenue not yet recognized", "warn")}
        ${executiveFinanceTile("Accounts Receivable", fmt(summary.ar), "Billed but not collected", summary.ar ? "collection" : "good")}
        ${executiveFinanceTile("Accounts Payable", fmt(accountsPayable), "Supplier obligations due", accountsPayable ? "warn" : "good")}
        ${executiveFinanceTile("Net Working Capital", fmt(cashCollected + summary.ar - cashDeployed - accountsPayable), "Collections + AR less releases and AP", "neutral")}
      </div>
    </section>

    <section class="executive-finance-section is-projects">
      <div class="executive-finance-band"><div><span>Project Economics</span><h3>Revenue, Expenses &amp; Margin</h3></div><div class="executive-project-tools"><small>${metrics().active.length} active projects · most recent first</small><label><span aria-hidden="true">⌕</span><input type="search" data-executive-project-search placeholder="Search projects" aria-label="Search project economics" /></label></div></div>
      <div class="executive-profit-strip">
        ${executiveFinanceTile("Recognized Revenue", fmt(recognizedRevenue), "Actualized project revenue", "good")}
        ${executiveFinanceTile("Project Expenses", fmt(projectExpenses), "Recorded cash and cheque expenses", "risk")}
      </div>
      <div class="executive-project-list" data-executive-project-list>${executiveFinanceProjectRows()}<div class="executive-project-empty" data-executive-project-empty hidden>No matching project.</div></div>
    </section>

    <div class="executive-finance-columns">
      <section class="executive-finance-section is-collection">
        <div class="executive-finance-band"><div><span>For Collection</span><h3>${financeTermLabel("Accounts Receivable")}</h3></div><b>${fmt(summary.ar)}</b></div>
        <div class="executive-ledger-list">${arRows.map(row => `<article><span><b>${escapeHtml(row.name)}</b><small>${escapeHtml(row.context)}</small><em class="${row.daysOverdue ? "is-overdue" : ""}">${escapeHtml(row.aging)}</em></span><strong>${fmt(row.amount)}</strong></article>`).join("") || `<div class="empty">No outstanding receivables.</div>`}</div>
      </section>
      <section class="executive-finance-section is-payables">
        <div class="executive-finance-band"><div><span>Supplier Obligations</span><h3>${financeTermLabel("Accounts Payable")}</h3></div><b>${fmt(accountsPayable)}</b></div>
        <div class="executive-ledger-list">${apRows.map(row => `<article><span><b>${escapeHtml(row.name)}</b><small>${escapeHtml(row.context)} · due ${shortDate(row.due)}</small><em class="${row.daysOverdue ? "is-overdue" : ""}">${escapeHtml(row.aging)}</em></span><strong>${fmt(row.amount)}</strong></article>`).join("") || `<div class="empty">No outstanding payables.</div>`}</div>
      </section>
    </div>

    <section class="executive-finance-section is-liquidations">
      <div class="executive-finance-band"><div><span>Cash Accountability</span><h3>Liquidation Exposure</h3></div><small>${openLiquidations.length} open packet${openLiquidations.length === 1 ? "" : "s"}</small></div>
      <div class="executive-liquidation-summary">
        ${executiveFinanceTile("Open Accountability", fmt(liquidationExposure), "Released cash not yet cleared", liquidationExposure ? "warn" : "good")}
        ${executiveFinanceTile("Cash Return Due", fmt(returnsDue), "Must be received before clearance", returnsDue ? "risk" : "good")}
        ${executiveFinanceTile("Reimbursements", fmt(reimbursements), "Requires audit and CEO decision", reimbursements ? "collection" : "good")}
        ${executiveFinanceTile("Overdue Packets", String(openLiquidations.filter(item => agingDays(item.due) > 0).length), "Past liquidation deadline", "risk")}
      </div>
      <div class="executive-exposure-list">${executiveFinanceExposureGroups() || `<div class="empty">No open liquidation exposure.</div>`}</div>
    </section>
  </section>`;
}

function financePage() {
  const access = financeAccessProfile();
  if (access.scope === "none") return `<section class="finance-restricted"><span>Restricted</span><h2>Finance</h2><p>This role does not have access to company financial records.</p></section>`;

  if (access.scope === "accounts") {
    const projects = accountFinanceProjects();
    const projectIds = new Set(projects.map(item => item.id));
    const invoices = db.invoices.filter(item => projectIds.has(item.projectId));
    const billed = invoices.reduce((sum, item) => sum + item.amount, 0);
    const collected = invoices.reduce((sum, item) => sum + item.collected, 0);
    const overdue = invoices.filter(item => item.amount > item.collected && arAging(item) !== "Current").length;
    return `<div class="toolbar"><div><span class="page-eyebrow">Accounts Scope</span><h2>Billing &amp; Collection</h2><p>Client invoices, collection exposure, and due dates for projects within your role scope.</p></div>${chip("No margins or internal costs", "active")}</div><div class="finance-scope-strip"><b>${escapeHtml(access.label)}</b><span>Client billing and collection only</span></div><div class="grid cols-4">${metric("Billed", fmt(billed), `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`, "Finance")}${metric("Collected", fmt(collected), "Recorded client payments", "Finance")}${metric("Outstanding", fmt(Math.max(0, billed - collected)), "For collection", "Finance")}${metric("Overdue", overdue, "Invoices beyond due date", "Finance")}</div><section class="section card"><h3>Accounts Receivable</h3>${invoiceTable(null, invoices)}</section>`;
  }

  if (access.scope === "compliance") {
    const budgetRows = db.budgetRequests.filter(item => /requested|under review|for checking/i.test(item.status)).slice(0, 12).map(item => ({ project:project(item.projectId).code, requestor:item.requestor, category:item.category, amount:fmt(item.amount), status:chip(item.status) }));
    const liquidationRows = db.liquidations.filter(item => !/cleared/i.test(item.status)).map(item => ({ project:project(item.projectId).code, employee:item.employee, due:formatShortDate(item.due), status:chip(item.status), finding:item.findings || "None" }));
    const supplierRows = db.suppliers.map(item => ({ supplier:item.name, category:item.category, quality:`${item.quality}/5`, reliability:`${item.reliability}/5`, documentation:item.status }));
    return `<div class="toolbar"><div><span class="page-eyebrow">Compliance Scope</span><h2>Finance Compliance</h2><p>Audit queues, supplier substantiation, and exceptions without company margins or company-wide totals.</p></div>${chip("Sensitive totals hidden", "warn")}</div><div class="finance-scope-strip"><b>${escapeHtml(access.label)}</b><span>Audit and control view</span></div><div class="grid cols-3">${metric("Budget Reviews", budgetRows.length, "Requests requiring assessment", "Approvals")}${metric("Liquidation Reviews", liquidationRows.length, "Open audit packets", "Liquidations")}${metric("Supplier Records", supplierRows.length, "Rates and documentation", "Suppliers")}</div><div class="section finance-compliance-grid"><div class="card"><h3>Budget Review Queue</h3>${simpleTable(budgetRows, ["project","requestor","category","amount","status"])}</div><div class="card"><h3>Liquidation Findings</h3>${simpleTable(liquidationRows, ["project","employee","due","status","finding"])}</div><div class="card is-wide"><h3>Supplier Compliance</h3>${simpleTable(supplierRows, ["supplier","category","quality","reliability","documentation"])}</div></div>`;
  }

  if (access.scope === "compensation") {
    return `<div class="toolbar"><div><span class="page-eyebrow">Admin &amp; HR Scope</span><h2>Compensation Administration</h2><p>Confidential compensation records only. Project economics, supplier rates, billing, and collection remain hidden.</p></div>${chip("Restricted", "warn")}</div><div class="finance-scope-strip"><b>${escapeHtml(access.label)}</b><span>Department compensation packages only</span></div><section class="section card"><div class="empty">No compensation records are loaded in this prototype.</div></section>`;
  }

  if (/^(CEO|COO)$/.test(canonicalRole())) return executiveFinancePage(access);

  const summary = metrics();
  const approved = db.projects.reduce((sum, item) => sum + Number(item.approvedCe || 0), 0);
  const billed = db.invoices.reduce((sum, item) => sum + item.amount, 0);
  const collected = db.invoices.reduce((sum, item) => sum + item.collected, 0);
  const rec = reconcile(state.selectedProjectId);
  const projectName = project(state.selectedProjectId)?.name || "Selected project";
  return `<div class="toolbar"><div><span class="page-eyebrow">${escapeHtml(access.label)}</span><h2>Finance</h2><p>Company financial totals, project economics, billing, collection, and reconciliation.</p></div>${access.readOnly ? chip("View only", "active") : chip("Finance workspace", "good")}</div><div class="finance-scope-strip"><b>${escapeHtml(access.label)}</b><span>${access.readOnly ? "Executive review access" : "Full finance operating access"}</span></div><div class="grid cols-4">${metric("Approved Revenue", fmt(approved), "Signed project value", "Finance")}${metric("Billed", fmt(billed), "Client invoices", "Finance")}${metric("Collected", fmt(collected), "Recorded receipts", "Finance")}${metric("Outstanding AR", fmt(summary.ar), "Still for collection", "Finance")}</div><section class="section finance-project-focus"><div class="client-section-title"><div><span>Selected Project</span><h3>${escapeHtml(projectName)}</h3></div><small>CE to actual cost reconciliation</small></div><div class="grid cols-4">${metric("Approved Budget", fmt(rec.approved), "Current CE baseline", "Project 360")}${metric("Requested", fmt(rec.requested), "CRP submitted", "Project 360")}${metric("Released", fmt(rec.released), "Cash deployed", "Project 360")}${metric("Actual Cost", fmt(rec.actual), "Validated liquidation cost", "Project 360")}</div></section><div class="section split"><div class="card"><h3>CE → CRP → Liquidation</h3>${reconciliationTable()}</div><div class="card"><h3>Accounts Receivable Aging</h3>${invoiceTable()}</div></div>`;
}
const postAuditCategories = [
  { key:"accounts", label:"Accounts & Client Servicing", context:"Briefing, expectation setting, communication, and client approvals" },
  { key:"creative", label:"Creative Development", context:"Concept, copy, design quality, revisions, and readiness" },
  { key:"production", label:"Production Execution", context:"Planning, sourcing, logistics, ingress, event proper, and egress" },
  { key:"suppliers", label:"Suppliers", context:"Quality, timeliness, documentation, and commercial reliability" },
  { key:"manpower", label:"Manpower", context:"Attendance, supervision, productivity, conduct, and deployment" },
  { key:"finance", label:"Finance & Compliance", context:"Budget control, releases, substantiation, liquidation, and billing" },
  { key:"overall", label:"Overall Project Delivery", context:"Combined client, operational, creative, and financial outcome" }
];

function postAuditCanEdit() {
  return /CEO|COO|FINANCE|OPERATIONS LEAD|DIRECTOR FOR IMPLEMENTATION|PRODUCTION HEAD/.test(state.role);
}

function postAuditRatingLabel(score) {
  if (score >= 4.5) return ["Excellent", "good"];
  if (score >= 3.5) return ["Strong", "active"];
  if (score >= 2.5) return ["Fair", "warn"];
  return ["Needs Improvement", "risk"];
}

function postAuditDashboard(p) {
  const record = postAuditScorecards[p.id] || null;
  const values = postAuditCategories.map(category => Number(record?.ratings?.[category.key] || 0));
  const rated = values.filter(Boolean);
  const average = rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : 0;
  const [label, tone] = postAuditRatingLabel(average);
  const invoices = db.invoices.filter(invoice => invoice.projectId === p.id);
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0) - Number(invoice.collected || 0)), 0);
  return `<section class="post-audit-dashboard"><div class="post-audit-head"><div><span>Internal Performance Review</span><h2>Post-Audit Scorecard</h2><p>Rate the project teams and execution areas inside Spotlight OS. The photo- and video-heavy client presentation remains outside the ERP.</p></div>${postAuditCanEdit() ? `<button class="btn primary" type="button" data-post-audit-open>${record ? "Edit" : "Complete"}</button>` : ""}</div><div class="post-audit-status"><div><span>Review Status</span><b>${record ? "Completed" : "Not yet completed"}</b><small>${record ? `${escapeHtml(record.completedBy)} · ${new Date(record.completedAt).toLocaleString("en-PH")}` : "Internal scorecard pending"}</small></div><div class="is-score"><span>Overall Rating</span><b>${average ? `${average.toFixed(1)} / 5` : "Not rated"}</b>${average ? chip(label, tone) : ""}</div><div class="${outstanding ? "is-open" : "is-complete"}"><span>Collection Gate</span><b>${outstanding ? `${fmtDetailed(outstanding)} outstanding` : invoices.length ? "Fully collected" : "No billing yet"}</b><small>${outstanding || !invoices.length ? "Project remains open" : "Ready for completion review"}</small></div></div><div class="post-audit-ratings">${postAuditCategories.map(category => { const score = Number(record?.ratings?.[category.key] || 0); const [ratingLabel, ratingTone] = postAuditRatingLabel(score); return `<article class="post-audit-rating-card ${score ? `is-${ratingTone}` : "is-empty"}"><div><span>${escapeHtml(category.label)}</span><b>${score ? `${score} / 5` : "Not rated"}</b></div><p>${escapeHtml(category.context)}</p><div class="post-audit-meter"><i style="width:${score ? score / 5 * 100 : 0}%"></i></div>${score ? `<small>${escapeHtml(ratingLabel)}</small>` : ""}</article>`; }).join("")}</div><div class="post-audit-learnings"><div><span>What Worked</span><p>${escapeHtml(record?.worked || "No observation recorded yet.")}</p></div><div><span>What Needs Improvement</span><p>${escapeHtml(record?.improve || "No observation recorded yet.")}</p></div><div><span>Key Learning for the Next Project</span><p>${escapeHtml(record?.lesson || "No learning recorded yet.")}</p></div></div></section>`;
}

function postAuditFormModal() {
  if (!state.postAuditFormOpen || !postAuditCanEdit()) return "";
  const p = project(state.selectedProjectId);
  const record = postAuditScorecards[p.id] || {};
  return `<div class="review-backdrop" role="presentation" data-post-audit-close><section class="review-modal post-audit-modal" role="dialog" aria-modal="true" aria-label="Post-audit scorecard"><button class="modal-close" type="button" data-post-audit-close aria-label="Close scorecard">×</button><div class="modal-kicker">Internal Performance Review</div><h2>${escapeHtml(p.name)} Scorecard</h2><p>Use 1 for poor performance and 5 for excellent performance. Rate observed project delivery, not individual popularity.</p><form id="postAuditForm"><section class="post-audit-form-ratings">${postAuditCategories.map(category => { const value = Number(record.ratings?.[category.key] || 3); return `<label><div><span>${escapeHtml(category.label)}</span><small>${escapeHtml(category.context)}</small></div><input name="rating_${category.key}" type="range" min="1" max="5" step="1" value="${value}" data-post-audit-range /><output>${value} / 5</output></label>`; }).join("")}</section><section class="post-audit-form-notes"><label><span>What Worked</span><textarea name="worked" rows="4" placeholder="Practices, decisions, or teams worth repeating" required>${escapeHtml(record.worked || "")}</textarea></label><label><span>What Needs Improvement</span><textarea name="improve" rows="4" placeholder="Specific process or execution gaps to address" required>${escapeHtml(record.improve || "")}</textarea></label><label class="is-wide"><span>Key Learning for the Next Project</span><textarea name="lesson" rows="4" placeholder="One clear change Spotlight should carry forward" required>${escapeHtml(record.lesson || "")}</textarea></label></section><div class="modal-actions"><button class="btn primary" type="submit">Submit</button><button class="btn" type="button" data-post-audit-close>Cancel</button></div></form></section></div>`;
}

function postAuditSave(formElement) {
  const form = new FormData(formElement);
  const ratings = Object.fromEntries(postAuditCategories.map(category => [category.key, Number(form.get(`rating_${category.key}`) || 0)]));
  const record = { projectId:state.selectedProjectId, ratings, worked:normalizeCell(form.get("worked")), improve:normalizeCell(form.get("improve")), lesson:normalizeCell(form.get("lesson")), completedAt:new Date().toISOString(), completedBy:currentUser() };
  postAuditScorecards[state.selectedProjectId] = record;
  localStorage.setItem(postAuditScoreStorageKey, JSON.stringify(postAuditScorecards));
  db.activity.push({ projectId:state.selectedProjectId, at:new Date().toISOString().slice(0, 16).replace("T", " "), user:currentUser(), action:"Post-audit scorecard completed", from:"PENDING", to:"COMPLETED", comment:`Overall project rating ${ratings.overall}/5.` });
  state.postAuditFormOpen = false;
  render();
}
function closureView(projectId) {
  const c = db.closure.find(x => x.projectId === projectId);
  if (!c) return `<div class="card"><h3>Closure</h3><div class="empty">Closure checklist not started.</div></div>`;
  return `<div class="card"><h3>Closure Checklist</h3>${simpleTable(c.items.map(([item,status]) => ({ requirement:item, status:chip(status) })), ["requirement","status"])}<p class="notice">Project cannot normally reach CLOSED until open required items are completed or management override is recorded with reason.</p></div>`;
}
function simpleTable(rows, keys) {
  if (!rows.length) return `<div class="empty">No records</div>`;
  return `<table><thead><tr>${keys.map(k=>`<th>${k.replace(/([A-Z])/g," $1")}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${keys.map(k=>`<td>${r[k] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function permissionMatrix() {
  const columns = ["Dashboard","Approve","Finance","Budget","Liquidation","Settings"];
  return `<div class="perm"><div class="head">Role</div>${columns.map(c=>`<div class="head">${c}</div>`).join("")}${Object.entries(roles).map(([role, perms]) => `<div><b>${role}</b></div>${columns.map(c => `<div>${perms.some(p=>p.toLowerCase().includes(c.toLowerCase())) || role.includes("CEO") ? "Yes" : "Limited"}</div>`).join("")}`).join("")}</div>`;
}
function stateMachine(label, items) { return `<p><b>${label}:</b> ${items.join(" → ")}</p>`; }
function settingsPanel() {
  return `<h3>System Settings</h3>${mini("Target gross margin", `${settings.targetGrossMargin * 100}%`)}${mini("Metro liquidation deadline", `${settings.liquidationDeadlineMetroDays} days`)}${mini("Provincial liquidation deadline", `${settings.liquidationDeadlineProvincialDays} days`)}${mini("Project code format", settings.projectCodeFormat)}${mini("Cash advance block", settings.cashAdvanceBlockOverdue ? "Enabled" : "Disabled")}`;
}
function roleDashboardMatrix() {
  const rows = Object.entries(dashboardProfiles).map(([role, profile]) => ({
    role,
    primaryQuestion: profile.question,
    topWidgets: profile.primary.join(", "),
    secondaryWidgets: profile.secondary.join(", "),
    criticalAlerts: "Overdue, blocked, due soon, waiting on, approval, variance",
    allowedActions: (roles[role] || []).join(", "),
    restrictedInformation: profile.restricted
  }));
  return simpleTable(rows, ["role","primaryQuestion","topWidgets","secondaryWidgets","criticalAlerts","allowedActions","restrictedInformation"]);
}
function widgetContracts() {
  const rows = Object.entries(widgetRegistry).map(([id, widget]) => ({
    widget: id,
    purpose: widget.purpose,
    dataSource: "Project-linked relational records and seeded MVP work queues",
    endpointQuery: `/dashboard/widgets/${id}?role=${encodeURIComponent(state.role)}&user=${encodeURIComponent(currentUser())}`,
    permissions: "Server filters by role permissions and assignment scope",
    sort: "Critical risk, overdue, due today, due soon, normal",
    emptyState: "Collapsed or compact empty state",
    actions: "Open record, approve, reject, return, follow up where permitted",
    drillDown: "Project 360, Approvals, Finance, Liquidations, Suppliers, or filtered queue"
  }));
  return simpleTable(rows, ["widget","purpose","dataSource","endpointQuery","permissions","sort","emptyState","actions","drillDown"]);
}
function roleInformationMatrix() {
  const cols = ["Company Financials","Project Financials","Projects","Clients","Pipeline","Tasks","Team Workload","Creative JOs","Production Readiness","Procurement","Budget Requests","Liquidations","Billing","Collections","Approvals","Alerts","Calendar","Supplier Information","Compliance"];
  const rows = [
    ["CEO","FULL","FULL","SUMMARY","SUMMARY","FULL","SUMMARY","SUMMARY","NONE","SUMMARY","SUMMARY","FULL","SUMMARY","FULL","FULL","FULL","FULL","SUMMARY","SUMMARY","SUMMARY"],
    ["COO","SUMMARY","LIMITED","FULL","LIMITED","SUMMARY","FULL","FULL","LIMITED","FULL","LIMITED","LIMITED","LIMITED","NONE","NONE","LIMITED","FULL","FULL","LIMITED","LIMITED"],
    ["Accounts Lead","SUMMARY","LIMITED","FULL","FULL","FULL","FULL","FULL","LIMITED","LIMITED","NONE","LIMITED","NONE","LIMITED","LIMITED","LIMITED","FULL","FULL","LIMITED","NONE"],
    ["Accounts Manager/Executive","NONE","LIMITED","LIMITED","LIMITED","LIMITED","FULL","NONE","NONE","LIMITED","NONE","LIMITED","NONE","LIMITED","LIMITED","LIMITED","FULL","LIMITED","NONE","NONE"],
    ["Creative Director","NONE","NONE","LIMITED","LIMITED","NONE","FULL","FULL","FULL","LIMITED","NONE","NONE","NONE","NONE","NONE","LIMITED","FULL","LIMITED","NONE","NONE"],
    ["Art Director","NONE","NONE","LIMITED","LIMITED","NONE","FULL","LIMITED","FULL","LIMITED","NONE","NONE","NONE","NONE","NONE","LIMITED","FULL","LIMITED","NONE","NONE"],
    ["Production Head","SUMMARY","LIMITED","FULL","LIMITED","NONE","FULL","FULL","LIMITED","FULL","LIMITED","LIMITED","LIMITED","NONE","NONE","LIMITED","FULL","FULL","FULL","LIMITED"],
    ["Event Manager/Officer","NONE","LIMITED","LIMITED","LIMITED","NONE","FULL","NONE","LIMITED","FULL","LIMITED","LIMITED","LIMITED","NONE","NONE","NONE","FULL","FULL","LIMITED","LIMITED"],
    ["Procurement Officer","NONE","LIMITED","LIMITED","NONE","NONE","FULL","NONE","NONE","LIMITED","FULL","FULL","LIMITED","NONE","NONE","LIMITED","FULL","FULL","FULL","LIMITED"],
    ["Finance Officer","FULL","FULL","LIMITED","LIMITED","SUMMARY","LIMITED","NONE","NONE","NONE","SUMMARY","FULL","FULL","FULL","FULL","LIMITED","FULL","LIMITED","LIMITED","FULL"],
    ["Finance & Compliance Assistant","SUMMARY","LIMITED","LIMITED","NONE","NONE","FULL","NONE","NONE","NONE","LIMITED","FULL","FULL","LIMITED","LIMITED","NONE","FULL","LIMITED","LIMITED","FULL"]
  ].map(r => Object.fromEntries(["role", ...cols].map((c, i) => [c.replace(/\s+/g, ""), r[i]])));
  return simpleTable(rows, ["role", ...cols.map(c => c.replace(/\s+/g, ""))]);
}
function homepageLayouts() {
  const rows = [
    { role:"CEO", topRow:"Executive health, executive alerts, approval KPIs", secondRow:"Needs My Approval, escalated project portfolio", thirdRow:"Client portfolio, organization workload", bottom:"Pipeline, forecast, secondary analytics" },
    { role:"COO", topRow:"Operational risk board, 72-hour event risks", secondRow:"Portfolio operations view, pending decisions", thirdRow:"Resource capacity, deployment calendar", bottom:"Escalations and trend analytics" },
    { role:"Accounts Lead", topRow:"Client attention required, pipeline health", secondRow:"Accounts workload, opportunity pipeline", thirdRow:"Client health and follow-up queues", bottom:"Pitch performance and forecast" },
    { role:"Accounts Manager/Executive", topRow:"My Action Center, what I owe the client today", secondRow:"My clients, my projects", thirdRow:"Today/this week, waiting for client/Spotlight", bottom:"Client commitments" },
    { role:"Creative Director", topRow:"Creative risks and review queue", secondRow:"Creative project queue, team capacity", thirdRow:"Revision tracker, production-ready alerts", bottom:"7/14/30-day creative forecast" },
    { role:"Art Director", topRow:"Artwork due/review/release queue", secondRow:"Designer workload, review queue", thirdRow:"Deadlines, asset approval status", bottom:"Production dependency alerts" },
    { role:"Production Head", topRow:"Execution readiness and critical production alerts", secondRow:"Production portfolio, team capacity", thirdRow:"Budget monitoring, supplier status", bottom:"Deployment calendar" },
    { role:"Event Manager/Officer", topRow:"Event countdown, today's critical tasks", secondRow:"My projects, readiness checklist", thirdRow:"Budget tracker, supplier status", bottom:"Liquidations and turnover" },
    { role:"Procurement Officer", topRow:"Procurement request queue, sourcing queue", secondRow:"Workflow, quote comparison", thirdRow:"Delivery tracker, supplier alerts", bottom:"Procurement budget" },
    { role:"Finance Officer", topRow:"Cash position, finance alerts", secondRow:"Budget requests, project financial health", thirdRow:"AR/AP, cash forecast", bottom:"Exception analytics" },
    { role:"Finance & Compliance Assistant", topRow:"Liquidation tracker, audit queue", secondRow:"Budget release processing, CE audit", thirdRow:"Compliance tracker, no-liquidation/no-release", bottom:"Closure support" }
  ];
  return simpleTable(rows, ["role","topRow","secondRow","thirdRow","bottom"]);
}
function searchResults(q) {
  if (!q) return [];
  const rows = [];
  const projects = accessibleProjects();
  const projectIds = new Set(projects.map(item => item.id));
  projects.forEach(p => { const c = client(p.clientId); if ([p.code,p.name,c.company,c.brand,p.owner,p.implementationOwner,p.projectCoordinator].join(" ").toLowerCase().includes(q)) rows.push({ type:"Project", name:`${p.code} · ${p.name}`, context:`${c.company} · ${p.stage}`, projectId:p.id }); });
  if (clientAccessProfile().scope !== "none") {
    const clientIds = new Set(projects.map(item => item.clientId));
    db.clients.filter(item => clientAccessProfile().scope === "all" || clientIds.has(item.id)).forEach(item => {
      if ([item.company,item.brand,item.code,item.owner].join(" ").toLowerCase().includes(q)) rows.push({ type:"Client", name:item.company, context:`${item.brand} · ${item.owner}`, view:"Clients" });
    });
  }
  if (supplierAccessProfile().scope !== "none") db.suppliers.forEach(s => { if ([s.name,s.category,s.contact].join(" ").toLowerCase().includes(q)) rows.push({ type:"Supplier", name:s.name, context:`${s.category} · ${s.status}`, view:"Suppliers" }); });
  if (canViewFinance()) db.invoices.filter(item => projectIds.has(item.projectId) || financeAccessProfile().scope !== "accounts").forEach(i => { if ([i.invoiceNo,project(i.projectId).code].join(" ").toLowerCase().includes(q)) rows.push({ type:"Invoice", name:i.invoiceNo, context:`${fmt(i.amount)} · ${i.status}`, projectId:i.projectId }); });
  if (!roleMatches(/CREATIVE|ART LEAD|COPYWRITER|GRAPHIC ARTIST|3D ARTIST|ADMIN & HR/)) db.ceVersions.filter(item => projectIds.has(item.projectId)).forEach(c => { if ([c.id,c.version,c.status,project(c.projectId).code].join(" ").toLowerCase().includes(q)) rows.push({ type:"CE", name:`${project(c.projectId).code} ${c.version}`, context:`${fmt(c.revenue)} · ${c.status}`, projectId:c.projectId }); });
  db.users.forEach(user => { if ([user.name,user.role].join(" ").toLowerCase().includes(q)) rows.push({ type:"Employee", name:user.name, context:user.role, view:"Liquidations" }); });
  return rows;
}

async function uploadCeFile(file, isAddendum = false) {
  if (!file) return;
  const p = project(state.selectedProjectId);
  const versions = db.ceVersions.filter(ce => ce.projectId === p.id);
  const addendumCount = versions.filter(ce => ce.addendum).length;
  const baseGross = isAddendum ? roundCent((p.value || currentCe(p.id)?.revenue || 0) * 0.08) : (p.value || currentCe(p.id)?.revenue || 0);
  const scan = await scanCeWorkbook(file, baseGross, p).catch(error => fallbackCeScan(file, p, baseGross, error));
  const computed = scan.computed;
  const id = `ce-upload-${Date.now()}`;
  const version = isAddendum ? `Addendum CE ${String.fromCharCode(65 + addendumCount)}` : `CE V${versions.filter(ce => !ce.addendum).length + 1}`;
  const objectUrl = URL.createObjectURL(file);
  await rememberUploadedCeFile(id, file, objectUrl);
  const runs = scan.runs.map(run => ({
    ...run,
    sections: run.sections.map(section => ({
      ...section,
      lines: section.lines.map(line => ({ ...line, ceId:id, category:section.title }))
    }))
  }));
  const flatLines = runs.flatMap(run => run.sections.flatMap(section => section.lines));
  db.ceVersions.push({
    id,
    projectId: p.id,
    version,
    status: "for checking",
    revenue: computed.grandTotal,
    projectCost: computed.projectCost,
    subTotal: computed.subTotal,
    asf: computed.asf,
    vat: computed.vat,
    directCost: computed.projectCost,
    file: ceStandardFileName({ projectId:p.id, version }),
    uploadedAt: new Date().toISOString(),
    uploadedBy: currentUser(),
    fileSize: file.size,
    runs,
    fileGross: scan.fileGross,
    scanVariance: scan.variance,
    scanStatus: scan.scanStatus,
    scanError: scan.scanError || "",
    issueCount: scan.issueCount || 0,
    approved: false,
    addendum: isAddendum
  });
  db.ceLines.push(...flatLines);
  persistSavedCeUploads();
  state.reviewSnapshot = `cefile:${id}`;
  render();
}

async function uploadCrpFile(file) {
  if (!file) return;
  const p = project(state.selectedProjectId);
  const uploads = db.crpUploads.filter(upload => upload.projectId === p.id);
  const scan = await scanCrpWorkbook(file, p).catch(error => fallbackCrpScan(file, p, error));
  const id = `crp-upload-${Date.now()}`;
  const version = `CRP V${uploads.length + 1}`;
  const objectUrl = URL.createObjectURL(file);
  await rememberUploadedCrpFile(id, file, objectUrl);
  const runs = crpRunsWithUploadContext(scan.runs || [], id, file.name);
  const requests = scan.requests.map((request, index) => ({
    ...request,
    id: `br-upload-${Date.now()}-${index + 1}`,
    projectId: p.id,
    status: "REQUESTED",
    exception: false,
    sourceUploadId: id,
    sourceVersion: version,
    sourceFile: file.name
  }));
  db.budgetRequests.push(...requests);
  db.crpUploads.push({
    id,
    projectId: p.id,
    version,
    status: "for checking",
    file: file.name,
    uploadedAt: new Date().toISOString(),
    uploadedBy: currentUser(),
    requestIds: requests.map(request => request.id),
    scanStatus: scan.scanStatus,
    scanError: scan.scanError || "",
    issueCount: scan.issueCount || 0,
    totalAmount: scan.totalAmount,
    thresholdMarks: scan.thresholdMarks || 0,
    actualizedSummary: scan.actualizedSummary || null,
    runs,
    requests
  });
  persistSavedCrpUploads();
  state.reviewSnapshot = `crpfile:${id}`;
  render();
}

function bind() {
  bindMoneyInputs();
  bindRequiredFieldPrompts();
  bindCreativeDeliverables();
  enhanceDashboardTableLegends();
  enhanceDashboardReviewRows();
  enhanceReviewableLineItems();
  document.querySelectorAll("[data-sidebar-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      state.sidebarHidden = !state.sidebarHidden;
      persistUiState();
      render();
    });
  });
  document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => {
    state.view = b.dataset.view;
    if (state.view === "Liquidations") {
      state.liquidationPageProjectId = "";
      state.liquidationPageRecordId = "";
      state.liquidationReturnView = "";
    }
    render();
  }));
  document.querySelectorAll(".finance-term-help").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    button.focus();
  }));
  document.querySelectorAll("[data-project-nav-root]").forEach(button => button.addEventListener("click", () => {
    const onProjectMaster = state.view === "Projects";
    state.projectsNavOpen = onProjectMaster ? !state.projectsNavOpen : true;
    state.view = "Projects";
    render();
  }));
  document.querySelectorAll("[data-back-projects]").forEach(b => b.addEventListener("click", () => { state.view = "Projects"; state.tab = "Overview"; render(); }));
  document.querySelectorAll("[data-liquidation-project]").forEach(element => {
    const openLiquidation = event => {
      event.preventDefault();
      event.stopPropagation();
      state.liquidationReturnView = state.view === "Liquidations" ? state.liquidationReturnView : state.view;
      state.liquidationPageProjectId = element.dataset.liquidationProject || "";
      state.liquidationPageRecordId = element.dataset.liquidationRecord || "";
      state.view = "Liquidations";
      render();
    };
    element.addEventListener("click", openLiquidation);
    if (element.tagName !== "BUTTON") element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") openLiquidation(event);
    });
  });
  document.querySelectorAll("[data-liquidation-show-all]").forEach(button => button.addEventListener("click", () => {
    state.liquidationPageProjectId = "";
    state.liquidationPageRecordId = "";
    render();
  }));
  document.querySelectorAll("[data-liquidation-return]").forEach(button => button.addEventListener("click", () => {
    state.view = state.liquidationReturnView || "Finance";
    state.liquidationReturnView = "";
    state.liquidationPageProjectId = "";
    state.liquidationPageRecordId = "";
    render();
  }));
  document.querySelectorAll("[data-liquidation-open-record]").forEach(button => button.addEventListener("click", () => {
    const item = db.liquidations.find(record => record.id === button.dataset.liquidationOpenRecord);
    if (!item || !liquidationRoleAccess({ name:item.employee }).canViewDetails) return;
    const groupedRecord = db.liquidations.find(record => record.projectId === item.projectId && keyCell(record.employee) === keyCell(item.employee)) || item;
    state.selectedProjectId = item.projectId;
    state.view = "Project 360";
    state.tab = "Liquidations";
    state.liquidationScenarioPreview = false;
    state.liquidationReviewId = groupedRecord.id;
    state.liquidationReviewHistory = [];
    state.liquidationFocusId = groupedRecord.id;
    render();
  }));
  document.querySelectorAll("[data-project]").forEach(b => {
    const openProject = e => {
      e.stopPropagation();
      state.selectedProjectId = b.dataset.project;
      state.view = "Project 360";
      state.tab = b.dataset.projectTab || "Overview";
      render();
    };
    b.addEventListener("click", openProject);
    b.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") openProject(e);
    });
  });
  document.querySelectorAll("[data-project-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.projectToggle;
      if (expandedProjectCards.has(id)) expandedProjectCards.delete(id);
      else expandedProjectCards.add(id);
      localStorage.setItem("spotlightExpandedProjects", JSON.stringify([...expandedProjectCards]));
      render();
    });
  });
  document.querySelectorAll("[data-approval-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.approvalToggle;
      if (expandedApprovalItems.has(id)) expandedApprovalItems.delete(id);
      else expandedApprovalItems.add(id);
      localStorage.setItem("spotlightExpandedApprovals", JSON.stringify([...expandedApprovalItems]));
      render();
    });
  });
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => { state.tab = b.dataset.tab; state.supplierSourceReturn = false; render(); }));
  document.querySelectorAll("[data-account-logout]").forEach(button => button.addEventListener("click", logoutAccount));
  document.querySelectorAll("[data-account-log-download]").forEach(button => button.addEventListener("click", downloadAccountActivityLog));
  const accountCreateForm = document.getElementById("accountCreateForm");
  if (accountCreateForm) {
    const roleField = accountCreateForm.querySelector("[data-account-role]");
    const preview = document.querySelector("[data-account-access-preview]");
    const updateAccessPreview = () => {
      if (!roleField || !preview) return;
      const role = roleField.value;
      const scope = accountCreateForm.querySelector('input[name="scope"]:checked')?.value || "ASSIGNED";
      preview.innerHTML = `<span>Effective Access</span><h3>${escapeHtml(role)}</h3><p>${escapeHtml(accountDepartmentForRole(role))} · ${escapeHtml(accessScopeLabel(scope))} records</p><div>${accountAccessPages(role).map(page => `<i>${escapeHtml(page)}</i>`).join("")}</div><small>${escapeHtml(accountScopeDescription(scope))}</small>`;
    };
    roleField?.addEventListener("change", updateAccessPreview);
    accountCreateForm.querySelectorAll('input[name="scope"]').forEach(field => field.addEventListener("change", updateAccessPreview));
    accountCreateForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!isSuperAdminMode()) return;
      const formData = new FormData(accountCreateForm);
      const name = normalizeCell(formData.get("name"));
      const emailField = accountCreateForm.querySelector('input[name="email"]');
      const email = normalizeCell(formData.get("email")).toLowerCase();
      const role = normalizeCell(formData.get("role"));
      const scope = normalizeCell(formData.get("scope")) || "ASSIGNED";
      if (!name || !email || !availableRoles.includes(role)) return;
      const duplicate = userAccounts.some(account => keyCell(account.email) === keyCell(email));
      if (duplicate) {
        emailField?.setCustomValidity("An account already uses this email address.");
        emailField?.reportValidity();
        return;
      }
      emailField?.setCustomValidity("");
      const password = generateTemporaryPassword();
      const id = `account-${Date.now()}`;
      userAccounts.push({
        id,
        name,
        email,
        department:accountDepartmentForRole(role),
        role,
        scope,
        status:"ACTIVE",
        switchable:false,
        passwordHash:await digestPassword(password),
        mustChangePassword:true,
        createdAt:new Date().toISOString().slice(0, 10)
      });
      recordAccountActivity("Account created", `${name} · ${role} · ${accessScopeLabel(scope)}`, id);
      state.generatedAccountCredentials = { name, email, password, reason:"Account created" };
      render();
    });
  }
  document.querySelectorAll("[data-account-status]").forEach(button => button.addEventListener("click", () => {
    if (!isSuperAdminMode()) return;
    const account = userAccounts.find(item => item.id === button.dataset.accountStatus);
    if (!account || account.switchable) return;
    account.status = account.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    recordAccountActivity(account.status === "ACTIVE" ? "Account activated" : "Account suspended", `${account.name} · ${account.role}`, account.id);
    render();
  }));
  document.querySelectorAll("[data-account-edit]").forEach(button => button.addEventListener("click", () => {
    if (!isSuperAdminMode()) return;
    state.accountEditId = button.dataset.accountEdit;
    render();
  }));
  document.querySelectorAll("[data-account-edit-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.accountEditId = null;
    render();
  }));
  const accountEditForm = document.getElementById("accountEditForm");
  accountEditForm?.addEventListener("submit", event => {
    event.preventDefault();
    if (!isSuperAdminMode()) return;
    const account = userAccounts.find(item => item.id === state.accountEditId);
    if (!account) return;
    const formData = new FormData(accountEditForm);
    const name = normalizeCell(formData.get("name"));
    const email = normalizeCell(formData.get("email")).toLowerCase();
    const role = normalizeCell(formData.get("role"));
    const scope = normalizeCell(formData.get("scope")) || "ASSIGNED";
    const duplicate = userAccounts.some(item => item.id !== account.id && keyCell(item.email) === keyCell(email));
    if (!name || !email || !availableRoles.includes(role) || duplicate) {
      const emailField = accountEditForm.querySelector('input[name="email"]');
      if (duplicate) {
        emailField?.setCustomValidity("An account already uses this email address.");
        emailField?.reportValidity();
      }
      return;
    }
    const previous = `${account.name} · ${account.email} · ${account.role} · ${accessScopeLabel(account.scope)}`;
    Object.assign(account, { name, email, role, scope, department:accountDepartmentForRole(role) });
    state.accountEditId = null;
    recordAccountActivity("Account updated", `${previous} → ${name} · ${email} · ${role} · ${accessScopeLabel(scope)}`, account.id);
    render();
  });
  document.querySelectorAll("[data-account-reset]").forEach(button => button.addEventListener("click", async () => {
    if (!isSuperAdminMode()) return;
    const account = userAccounts.find(item => item.id === button.dataset.accountReset);
    if (!account) return;
    const password = generateTemporaryPassword();
    account.passwordHash = await digestPassword(password);
    delete account.temporaryPassword;
    account.mustChangePassword = true;
    recordAccountActivity("Password reset", `${account.name} · ${account.email}`, account.id);
    state.generatedAccountCredentials = { name:account.name, email:account.email, password, reason:"Password reset" };
    render();
  }));
  document.querySelectorAll("[data-account-credentials-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.generatedAccountCredentials = null;
    render();
  }));
  document.querySelectorAll("[data-account-password-copy]").forEach(button => button.addEventListener("click", async () => {
    const credentials = state.generatedAccountCredentials;
    if (!credentials) return;
    await navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`);
    button.textContent = "Copied";
  }));
  document.querySelectorAll("[data-billing-create]").forEach(button => button.addEventListener("click", () => {
    if (!billingCanManage()) return;
    state.billingFormOpen = true;
    render();
  }));
  document.querySelectorAll("[data-billing-form-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.billingFormOpen = false;
    render();
  }));
  document.querySelectorAll("[data-billing-view]").forEach(button => button.addEventListener("click", () => {
    state.billingPreviewId = button.dataset.billingView;
    render();
  }));
  document.querySelectorAll("[data-billing-archive]").forEach(button => button.addEventListener("click", () => {
    if (!billingCanManage()) return;
    state.billingArchiveId = button.dataset.billingArchive;
    render();
  }));
  document.querySelectorAll("[data-billing-archive-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.billingArchiveId = null;
    render();
  }));
  document.querySelectorAll("[data-billing-restore]").forEach(button => button.addEventListener("click", () => {
    if (!billingCanManage()) return;
    billingRestoreInvoice(button.dataset.billingRestore);
  }));
  document.querySelectorAll("[data-billing-archived-toggle]").forEach(button => button.addEventListener("click", () => {
    state.billingArchivedOpen = !state.billingArchivedOpen;
    render();
  }));
  document.querySelectorAll("[data-billing-preview-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.billingPreviewId = null;
    render();
  }));
  document.querySelectorAll("[data-billing-download]").forEach(button => button.addEventListener("click", () => {
    const invoice = db.invoices.find(item => item.id === state.billingPreviewId) || billingArchivedInvoices.find(item => item.id === state.billingPreviewId);
    if (invoice) billingDownloadDocument(invoice);
  }));
  const billingArchiveForm = document.getElementById("billingArchiveForm");
  if (billingArchiveForm) billingArchiveForm.addEventListener("submit", event => {
    event.preventDefault();
    billingArchiveInvoice(state.billingArchiveId, new FormData(billingArchiveForm).get("reason"));
  });
  const billingInvoiceForm = document.getElementById("billingInvoiceForm");
  if (billingInvoiceForm) {
    const issuedInput = billingInvoiceForm.querySelector("[data-billing-issued]");
    const termsInput = billingInvoiceForm.querySelector("[data-billing-terms]");
    const syncBillingDueDate = () => {
      const dueInput = billingInvoiceForm.querySelector("[data-billing-due]");
      if (issuedInput?.value && dueInput) dueInput.value = billingAddDays(issuedInput.value, Number(termsInput?.value || 30));
    };
    issuedInput?.addEventListener("change", syncBillingDueDate);
    termsInput?.addEventListener("change", syncBillingDueDate);
    const fileInput = billingInvoiceForm.querySelector("[data-billing-file]");
    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      const label = billingInvoiceForm.querySelector("[data-billing-file-name]");
      if (label) label.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "No file uploaded";
      if (file) clearFieldPrompt(fileInput);
    });
    billingInvoiceForm.addEventListener("submit", async event => {
      event.preventDefault();
      await billingSaveInvoice(billingInvoiceForm);
    });
  }
  document.querySelectorAll("[data-billing-collect]").forEach(button => button.addEventListener("click", () => {
    if (!billingCanManage()) return;
    state.billingCollectionInvoiceId = button.dataset.billingCollect;
    render();
  }));
  document.querySelectorAll("[data-billing-collection-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.billingCollectionInvoiceId = null;
    render();
  }));
  document.querySelectorAll("[data-billing-collection-view]").forEach(button => button.addEventListener("click", () => {
    state.billingCollectionPreviewId = button.dataset.billingCollectionView;
    render();
  }));
  document.querySelectorAll("[data-billing-collection-proof-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.billingCollectionPreviewId = null;
    render();
  }));
  document.querySelectorAll("[data-billing-collection-download]").forEach(button => button.addEventListener("click", () => {
    billingDownloadCollectionProof(db.collections.find(collection => collection.id === state.billingCollectionPreviewId));
  }));
  const billingCollectionForm = document.getElementById("billingCollectionForm");
  if (billingCollectionForm) {
    const fileInput = billingCollectionForm.querySelector("[data-billing-collection-file]");
    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      const label = billingCollectionForm.querySelector("[data-billing-collection-file-name]");
      if (label) label.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "No file uploaded";
      if (file) clearFieldPrompt(fileInput);
    });
    billingCollectionForm.addEventListener("submit", async event => {
      event.preventDefault();
      await billingSaveCollection(billingCollectionForm);
    });
  }
  document.querySelectorAll("[data-post-audit-open]").forEach(button => button.addEventListener("click", () => {
    if (!postAuditCanEdit()) return;
    state.postAuditFormOpen = true;
    render();
  }));
  document.querySelectorAll("[data-post-audit-close]").forEach(button => button.addEventListener("click", event => {
    if (button.classList.contains("review-backdrop") && event.target !== button) return;
    state.postAuditFormOpen = false;
    render();
  }));
  const postAuditForm = document.getElementById("postAuditForm");
  if (postAuditForm) {
    postAuditForm.querySelectorAll("[data-post-audit-range]").forEach(input => input.addEventListener("input", () => {
      const output = input.closest("label")?.querySelector("output");
      if (output) output.value = `${input.value} / 5`;
    }));
    postAuditForm.addEventListener("submit", event => {
      event.preventDefault();
      postAuditSave(postAuditForm);
    });
  }
  const globalSearch = document.getElementById("globalSearch");
  const globalSearchResults = document.getElementById("globalSearchResults");
  const openSearchResult = button => {
    if (!button) return;
    if (button.dataset.searchProject) {
      state.selectedProjectId = button.dataset.searchProject;
      state.view = "Project 360";
      state.tab = "Overview";
    } else if (button.dataset.searchView) {
      state.view = button.dataset.searchView;
    }
    state.search = "";
    render();
  };
  globalSearch?.addEventListener("input", event => {
    state.search = event.target.value;
    if (!globalSearchResults) return;
    globalSearchResults.innerHTML = globalSearchResultsMarkup(state.search);
    globalSearchResults.hidden = !state.search.trim();
  });
  globalSearch?.addEventListener("focus", () => {
    if (globalSearchResults && state.search.trim()) globalSearchResults.hidden = false;
  });
  globalSearch?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      openSearchResult(globalSearchResults?.querySelector("[data-search-project], [data-search-view]"));
    }
    if (event.key === "Escape" && globalSearchResults) globalSearchResults.hidden = true;
  });
  globalSearchResults?.addEventListener("click", event => openSearchResult(event.target.closest("[data-search-project], [data-search-view]")));
  const executiveProjectSearch = document.querySelector("[data-executive-project-search]");
  executiveProjectSearch?.addEventListener("input", event => {
    const query = keyCell(event.target.value);
    const rows = [...document.querySelectorAll("[data-executive-project-row]")];
    rows.forEach(row => { row.hidden = Boolean(query) && !keyCell(row.textContent).includes(query); });
    const empty = document.querySelector("[data-executive-project-empty]");
    if (empty) empty.hidden = rows.some(row => !row.hidden);
  });
  document.querySelectorAll("[data-ceo-card]").forEach(select => {
    select.addEventListener("change", e => {
      ceoCardConfig[Number(e.target.dataset.ceoCard)] = e.target.value;
      localStorage.setItem("spotlightCeoCards", JSON.stringify(ceoCardConfig));
      render();
    });
  });
  document.querySelectorAll("[data-widget-size]").forEach(select => {
    select.addEventListener("change", e => {
      roleLayout()[e.target.dataset.widgetSize] = e.target.value;
      delete roleHeights()[e.target.dataset.widgetSize];
      localStorage.setItem("spotlightWidgetLayout", JSON.stringify(widgetLayoutConfig));
      localStorage.setItem("spotlightWidgetHeights", JSON.stringify(widgetHeightConfig));
      render();
    });
  });
  document.querySelectorAll("[data-revenue-year]").forEach(button => {
    button.addEventListener("click", () => {
      selectedRevenueYear = button.dataset.revenueYear;
      localStorage.setItem("spotlightRevenueYear", JSON.stringify(selectedRevenueYear));
      render();
    });
  });
  document.querySelectorAll("[data-review]").forEach(button => {
    button.addEventListener("click", () => {
      state.reviewSnapshot = button.dataset.review;
      render();
    });
  });
  document.querySelectorAll("[data-crp-decision], [data-crp-trail-action]").forEach(button => {
    button.addEventListener("pointerdown", event => event.stopPropagation());
    button.addEventListener("mousedown", event => event.stopPropagation());
    button.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") event.stopPropagation();
    });
  });
  document.querySelectorAll("[data-crp-decision]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const value = button.dataset.crpDecisionValue;
      if (!value) return;
      const key = crpDecodeDecisionKey(button.dataset.crpDecision || "");
      if (!key) return;
      if (value !== "approved") {
        crpOpenDecisionModal(key, "reject");
        return;
      }
      captureCrpOpenDetails();
      if (crpDecisionRecord(key).status === "approved") {
        crpOpenDecisionModal(key, "unapprove");
        return;
      }
      crpApproveLine(key);
      renderPreservingViewport();
    });
  });
  document.querySelectorAll("[data-crp-trail-action]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const key = crpDecodeDecisionKey(button.dataset.crpTrailKey || "");
      if (!key) return;
      crpOpenDecisionModal(key, button.dataset.crpTrailAction || "reply");
    });
  });
  document.querySelectorAll("[data-crp-decision-modal-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      crpCloseDecisionModal();
    });
  });
  const crpDecisionForm = document.getElementById("crpDecisionForm");
  if (crpDecisionForm) crpDecisionForm.addEventListener("submit", event => {
    event.preventDefault();
    handleCrpDecisionFormSubmit(crpDecisionForm);
  });
  document.querySelectorAll("[data-crp-counterparty]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      captureCrpOpenDetails();
      state.crpCounterpartyKey = crpDecodeDecisionKey(button.dataset.crpCounterparty);
      render();
    });
  });
  document.querySelectorAll("[data-crp-counterparty-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.crpCounterpartyKey = null;
      render();
    });
  });
  const crpCounterpartyForm = document.getElementById("crpCounterpartyForm");
  if (crpCounterpartyForm) crpCounterpartyForm.addEventListener("submit", event => {
    event.preventDefault();
    const key = crpDecodeDecisionKey(crpCounterpartyForm.dataset.crpCounterpartyForm);
    const form = new FormData(crpCounterpartyForm);
    const provider = normalizeCell(form.get("provider"));
    const type = String(form.get("type") || "unclassified");
    if (type !== "unclassified" && !provider) {
      showFieldPrompt(crpCounterpartyForm.querySelector('[name="provider"]'), "Enter the final provider's name.");
      return;
    }
    saveCrpCounterparty(key, { custodian:form.get("custodian"), provider, type });
    state.crpCounterpartyKey = null;
    render();
  });
  document.querySelectorAll("[data-fund-note], [data-fund-receipt-button], .fund-release-actions [data-review]").forEach(button => {
    button.addEventListener("pointerdown", event => event.stopPropagation());
    button.addEventListener("mousedown", event => event.stopPropagation());
    button.addEventListener("click", event => event.stopPropagation());
    button.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") event.stopPropagation();
    });
  });
  document.querySelectorAll("[data-fund-note]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const key = crpDecodeDecisionKey(button.dataset.fundNote || "");
      if (key) fundReleaseOpenNoteModal(key);
    });
  });
  document.querySelectorAll("[data-fund-receipt-button]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const input = document.querySelector(`[data-fund-receipt-input="${button.dataset.fundReceiptButton}"]`);
      input?.click();
    });
  });
  document.querySelectorAll("[data-fund-receipt-input]").forEach(input => {
    input.addEventListener("change", () => {
      uploadFundReleaseReceiptFile(input.files?.[0], input.dataset.fundReceiptInput || "");
      input.value = "";
    });
  });
  document.querySelectorAll("[data-fund-scenario-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      state.fundReleaseScenarioPreview = !state.fundReleaseScenarioPreview;
      persistUiState();
      render();
    });
  });
  document.querySelectorAll("[data-liq-scenario-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      state.liquidationScenarioPreview = !state.liquidationScenarioPreview;
      state.liquidationFocusId = null;
      persistUiState();
      render();
    });
  });
  document.querySelectorAll("[data-liq-submit-open]").forEach(button => {
    button.addEventListener("click", () => {
      state.liquidationFinancePreview = false;
      state.liquidationSubmitOpen = true;
      state.liquidationFormCompact = false;
      render();
    });
  });
  document.querySelectorAll("[data-liq-finance-preview-open]").forEach(button => {
    button.addEventListener("click", () => {
      if (!liquidationRoleAccess().isCeo || !state.liquidationScenarioPreview) return;
      state.liquidationFinancePreview = true;
      state.liquidationSubmitOpen = true;
      state.liquidationFormCompact = false;
      render();
    });
  });
  document.querySelectorAll("[data-liq-window-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      state.liquidationFormCompact = !state.liquidationFormCompact;
      button.closest(".liquidation-submit-modal")?.classList.toggle("is-compact", state.liquidationFormCompact);
      button.textContent = state.liquidationFormCompact ? "Maximize" : "Minimize";
      button.title = state.liquidationFormCompact ? "Maximize liquidation form" : "Minimize liquidation form";
      button.setAttribute("aria-pressed", String(state.liquidationFormCompact));
    });
  });
  document.querySelectorAll("[data-liq-submit-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.liquidationSubmitOpen = false;
      state.liquidationFinancePreview = false;
      state.liquidationFormCompact = false;
      render();
    });
  });
  const liquidationSubmitForm = document.getElementById("liquidationSubmitForm");
  if (liquidationSubmitForm) {
    const updateTotals = () => {
      syncLiquidationOptionalRows(liquidationSubmitForm);
      syncLiquidationTransferRecipients(liquidationSubmitForm);
      syncLiquidationPayeeTypes(liquidationSubmitForm);
      const amountInputs = type => [...liquidationSubmitForm.querySelectorAll(`[data-liq-total="${type}"]`)];
      const total = type => amountInputs(type).reduce((sum, input) => sum + parseMoney(input.value), 0);
      const released = total("released");
      const transferred = total("transfer");
      const liquidated = total("receipt") + total("noReceipt");
      const variance = released - transferred - liquidated;
      const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = fmtDetailed(Math.abs(value)); };
      set("liqTotalReleased", released); set("liqTotalTransferred", transferred); set("liqTotalLiquidated", liquidated); set("liqVariance", variance); set("liqChequeTotal", total("cheque"));
      ["released", "transfer", "receipt", "noReceipt", "cheque"].forEach(type => {
        const counter = liquidationSubmitForm.querySelector(`[data-liq-section-counter="${type}"]`);
        const count = amountInputs(type).filter(input => parseMoney(input.value) > 0).length;
        if (counter) counter.textContent = `${count} ${count === 1 ? "entry" : "entries"} · ${fmtDetailed(total(type))}`;
      });
      const label = document.getElementById("liqVarianceLabel");
      const card = document.getElementById("liqVarianceCard");
      const returnPanel = document.getElementById("liquidationReturnPanel");
      const returnAmount = document.getElementById("liqReturnAmount");
      const reimbursementPanel = document.getElementById("liquidationReimbursementPanel");
      const reimbursementAmount = document.getElementById("liqReimbursementAmount");
      const submissionNote = document.getElementById("liquidationSubmissionNote");
      const returnInput = liquidationSubmitForm.querySelector('[name="cashReturnConfirmation"]');
      const submitButton = liquidationSubmitForm.querySelector('button[type="submit"]');
      if (label) label.textContent = variance < 0 ? "For Reimbursement" : "For Return";
      if (card) card.className = variance < 0 ? "is-risk" : variance > 0 ? "is-good" : "is-zero";
      if (returnPanel) returnPanel.hidden = !(variance > 0);
      if (returnAmount) returnAmount.textContent = fmtDetailed(Math.max(0, variance));
      if (reimbursementPanel) reimbursementPanel.hidden = !(variance < 0);
      if (reimbursementAmount) reimbursementAmount.textContent = fmtDetailed(Math.max(0, -variance));
      if (submissionNote) {
        const reimbursementNote = submissionNote.querySelector("textarea");
        const reimbursementRequired = variance < 0;
        submissionNote.hidden = !reimbursementRequired;
        if (reimbursementNote) reimbursementNote.required = reimbursementRequired;
        if (!reimbursementRequired && reimbursementNote) clearFieldPrompt(reimbursementNote);
      }
      if (returnInput) {
        returnInput.required = variance > 0;
        returnInput.setCustomValidity("");
      }
      if (submitButton) {
        const waitingForReturn = variance > 0 && !(returnInput?.files?.length);
        submitButton.disabled = state.liquidationFinancePreview || waitingForReturn;
        submitButton.title = state.liquidationFinancePreview ? "CEO preview cannot submit as the Finance Officer." : waitingForReturn ? "Upload the cash return confirmation before submitting." : "";
      }
    };
    liquidationSubmitForm.addEventListener("input", updateTotals);
    liquidationSubmitForm.addEventListener("change", event => {
      const input = event.target.closest(".liquidation-file-input");
      if (input) {
        const control = input.closest(".liquidation-file-control");
        const upload = control?.querySelector("[data-liq-file-trigger]");
        const view = control?.querySelector("[data-liq-file-view]");
        const file = input.files?.[0];
        if (file && view) {
          if (view.dataset.liqFileUrl) URL.revokeObjectURL(view.dataset.liqFileUrl);
          view.dataset.liqFileUrl = URL.createObjectURL(file);
          view.dataset.liqFileType = file.type || "application/octet-stream";
          view.hidden = false;
          if (upload) upload.hidden = true;
        } else {
          if (view) view.hidden = true;
          if (upload) upload.hidden = false;
        }
      }
      updateTotals();
    });
    liquidationSubmitForm.querySelectorAll("[data-liq-add-row]").forEach(button => button.addEventListener("click", () => {
      const type = button.dataset.liqAddRow;
      const count = Math.max(1, Math.min(5, Number(button.dataset.liqAddCount) || 1));
      liquidationSubmitForm.querySelector(`[data-liq-entry-list="${type}"]`)?.insertAdjacentHTML("beforeend", Array.from({ length:count }, () => liquidationEntryRow(type)).join(""));
      bindMoneyInputs(liquidationSubmitForm);
      updateTotals();
    }));
    liquidationSubmitForm.addEventListener("click", event => {
      const upload = event.target.closest("[data-liq-file-trigger]");
      if (upload) {
        upload.closest(".liquidation-file-control")?.querySelector(".liquidation-file-input")?.click();
        return;
      }
      const view = event.target.closest("[data-liq-file-view]");
      if (view) {
        const preview = document.getElementById("liquidationFilePreview");
        const media = preview?.querySelector("[data-liq-file-media]");
        const url = view.dataset.liqFileUrl;
        const type = view.dataset.liqFileType || "";
        if (preview && media && url) {
          media.innerHTML = type.startsWith("image/") ? `<img src="${url}" alt="Uploaded receipt preview" />` : `<iframe src="${url}" title="Uploaded receipt preview"></iframe>`;
          preview.hidden = false;
        }
        return;
      }
      const remove = event.target.closest("[data-liq-remove-row]");
      if (!remove) return;
      const list = remove.closest("[data-liq-entry-list]");
      if (list) remove.closest(".liquidation-entry-row")?.remove();
      updateTotals();
    });
    liquidationSubmitForm.addEventListener("submit", async event => {
      event.preventDefault();
      await handleLiquidationSubmit(liquidationSubmitForm);
    });
    updateTotals();
  }
  document.querySelectorAll("[data-liq-file-close]").forEach(button => button.addEventListener("click", () => {
    const preview = document.getElementById("liquidationFilePreview");
    if (preview) preview.hidden = true;
  }));
  document.querySelectorAll("[data-liq-review], [data-liq-note], [data-liq-action]").forEach(button => {
    button.addEventListener("pointerdown", event => event.stopPropagation());
    button.addEventListener("mousedown", event => event.stopPropagation());
    button.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") event.stopPropagation();
    });
  });
  document.querySelectorAll("[data-liq-review]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.liquidationReviewId = button.dataset.liqReview;
      state.liquidationReviewHistory = [];
      state.liquidationFocusId = button.dataset.liqReview;
      state.supplierSourceReturn = false;
      render();
    });
  });
  document.querySelectorAll("[data-supplier-source]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.supplierSourceId;
      const isCash = button.dataset.supplierSource === "cash";
      const record = isCash ? liquidationEmployeeLookup(id) : liquidationSupplierLookup(id);
      if (!record || (isCash && !liquidationRoleAccess(record).canViewDetails) || (!isCash && !liquidationRoleAccess().canViewAll)) return;
      state.supplierSourceReturn = true;
      state.tab = "Liquidations";
      state.liquidationReviewHistory = [];
      state.liquidationReviewId = isCash ? id : null;
      state.liquidationSupplierReviewId = isCash ? null : id;
      render();
    });
  });
  document.querySelectorAll("[data-supplier-return]").forEach(button => {
    button.addEventListener("click", () => {
      state.liquidationReviewId = null;
      state.liquidationSupplierReviewId = null;
      state.liquidationReviewHistory = [];
      state.supplierSourceReturn = false;
      state.tab = "Suppliers";
      render();
    });
  });
  document.querySelectorAll("[data-liq-pie-slice]").forEach(slice => {
    const chart = slice.closest(".liquidation-pie-chart");
    const popup = chart?.querySelector(`[data-liq-pie-popup="${slice.dataset.liqPieSlice}"]`);
    if (!popup) return;
    slice.addEventListener("pointerenter", () => { popup.hidden = false; });
    slice.addEventListener("pointerleave", () => { if (popup.dataset.pinned !== "true") popup.hidden = true; });
    slice.addEventListener("click", () => {
      const shouldOpen = popup.dataset.pinned !== "true";
      chart.querySelectorAll("[data-liq-pie-popup]").forEach(item => { item.hidden = true; delete item.dataset.pinned; });
      popup.hidden = !shouldOpen;
      if (shouldOpen) popup.dataset.pinned = "true";
    });
  });
  document.querySelectorAll("[data-liq-supplier-review]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.liquidationSupplierReviewId = button.dataset.liqSupplierReview;
      state.supplierSourceReturn = false;
      render();
    });
  });
  document.querySelectorAll("[data-liq-supplier-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.liquidationSupplierReviewId = null;
      if (state.supplierSourceReturn) state.tab = "Suppliers";
      state.supplierSourceReturn = false;
      render();
    });
  });
  document.querySelectorAll('[data-liq-supplier-batch-open]').forEach(button => button.addEventListener('click', () => {
    state.liquidationSupplierBatchOpen = true;
    render();
  }));
  document.querySelectorAll('[data-supplier-payable-open]').forEach(button => button.addEventListener('click', () => {
    state.supplierPayableCreateOpen = true;
    render();
  }));
  document.querySelectorAll('[data-supplier-payable-close]').forEach(button => button.addEventListener('click', event => {
    if (event.target !== button && button.classList.contains('review-backdrop')) return;
    state.supplierPayableCreateOpen = false;
    render();
  }));
  const supplierPayableForm = document.getElementById('supplierPayableCreateForm');
  if (supplierPayableForm) {
    bindMoneyInputs(supplierPayableForm);
    supplierPayableForm.addEventListener('click', event => {
      event.target.closest('[data-liq-supplier-file-trigger]')?.closest('.liquidation-file-control')?.querySelector('input[type="file"]')?.click();
    });
    supplierPayableForm.addEventListener('submit', async event => {
      event.preventDefault();
      await handleSupplierPayableCreate(supplierPayableForm);
    });
  }
  document.querySelectorAll('[data-liq-batch-close]').forEach(button => button.addEventListener('click', event => {
    if (event.target !== button && button.classList.contains('review-backdrop')) return;
    state.liquidationSupplierBatchOpen = false;
    render();
  }));
  const batchForm = document.getElementById('liquidationSupplierBatchForm');
  if (batchForm) {
    bindMoneyInputs(batchForm);
    batchForm.addEventListener('click', event => {
      const trigger = event.target.closest('[data-liq-batch-file-trigger]');
      trigger?.closest('.liquidation-file-control')?.querySelector('input[type="file"]')?.click();
    });
    const markDirty = event => {
      const row = event.target.closest('.liquidation-batch-row');
      if (row) row.classList.add('is-dirty');
      if (event.target.type === 'file') {
        const trigger = event.target.closest('label')?.querySelector('[data-liq-batch-file-trigger]');
        if (trigger && event.target.files?.length) trigger.textContent = 'Replace';
      }
    };
    batchForm.addEventListener('input', markDirty);
    batchForm.addEventListener('change', markDirty);
    batchForm.addEventListener('submit', async event => {
      event.preventDefault();
      await handleLiquidationSupplierBatchSubmit(batchForm);
    });
  }
  const liquidationSupplierForm = document.getElementById("liquidationSupplierForm");
  if (liquidationSupplierForm) {
    bindMoneyInputs(liquidationSupplierForm);
    liquidationSupplierForm.querySelectorAll("[data-liq-supplier-file-trigger]").forEach(button => button.addEventListener("click", () => {
      button.closest(".liquidation-file-control")?.querySelector(".liquidation-file-input")?.click();
    }));
    liquidationSupplierForm.querySelectorAll(".liquidation-file-input").forEach(input => input.addEventListener("change", () => {
      const control = input.closest(".liquidation-file-control");
      const file = input.files?.[0];
      const name = control?.querySelector("[data-liq-supplier-file-name]");
      const trigger = control?.querySelector("[data-liq-supplier-file-trigger]");
      if (name) name.textContent = file?.name || "No new file selected";
      if (trigger) trigger.textContent = file ? "Replace" : "Upload";
    }));
    liquidationSupplierForm.addEventListener("submit", async event => {
      event.preventDefault();
      await handleLiquidationSupplierSubmit(liquidationSupplierForm);
    });
  }
  document.querySelectorAll("[data-liq-transfer-target]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const targetId = button.dataset.liqTransferTarget;
      if (!targetId || !state.liquidationReviewId) return;
      state.liquidationReviewHistory = [...state.liquidationReviewHistory, state.liquidationReviewId];
      state.liquidationReviewId = targetId;
      state.liquidationFocusId = targetId;
      render();
    });
  });
  document.querySelectorAll("[data-liq-review-back]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const history = [...state.liquidationReviewHistory];
      const previousId = history.pop();
      if (!previousId) return;
      state.liquidationReviewHistory = history;
      state.liquidationReviewId = previousId;
      state.liquidationFocusId = previousId;
      render();
    });
  });
  document.querySelectorAll("[data-liq-note]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.liquidationNoteId = button.dataset.liqNote;
      state.liquidationPendingAction = null;
      state.liquidationReviewId = null;
      state.liquidationFocusId = button.dataset.liqNote;
      render();
    });
  });
  document.querySelectorAll("[data-liq-action]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      handleLiquidationReviewAction(button.dataset.liqId, button.dataset.liqAction);
    });
  });
  document.querySelectorAll("[data-liq-review-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.liquidationReviewId = null;
      state.liquidationReviewHistory = [];
      if (state.supplierSourceReturn) state.tab = "Suppliers";
      state.supplierSourceReturn = false;
      render();
    });
  });
  document.querySelectorAll("[data-liq-note-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.liquidationNoteId = null;
      state.liquidationPendingAction = null;
      render();
    });
  });
  const liquidationNoteForm = document.getElementById("liquidationNoteForm");
  if (liquidationNoteForm) liquidationNoteForm.addEventListener("submit", event => {
    event.preventDefault();
    const id = liquidationNoteForm.dataset.liqNoteForm;
    const message = String(new FormData(liquidationNoteForm).get("message") || "").trim();
    if (!id || !message) return;
    if (state.liquidationPendingAction) liquidationRejectWithReason(id, state.liquidationPendingAction, message);
    else liquidationUpdateEmployee(id, {}, message);
    state.liquidationPendingAction = null;
    state.liquidationNoteId = null;
    state.liquidationReviewId = id;
    render();
  });
  document.querySelectorAll("[data-liq-attachment]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.liquidationAttachment = { employeeId:button.dataset.liqAttachment, index:Number(button.dataset.liqAttachmentIndex) || 0 };
      render();
    });
  });
  document.querySelectorAll("[data-liq-supplier-document]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.liquidationAttachment = { supplierId:button.dataset.liqSupplierDocument, documentType:button.dataset.liqSupplierDocumentType };
      render();
    });
  });
  document.querySelectorAll("[data-liq-attachment-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.liquidationAttachment = null;
      render();
    });
  });
  document.querySelectorAll("[data-liq-payee-review]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.liquidationPayeeReview = { employeeId:button.dataset.liqPayeeReview, expenseId:button.dataset.liqPayeeExpense };
      render();
    });
  });
  document.querySelectorAll("[data-liq-payee-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.liquidationPayeeReview = null;
      render();
    });
  });
  const liquidationPayeeForm = document.getElementById("liquidationPayeeForm");
  if (liquidationPayeeForm) {
    const payeeSelect = liquidationPayeeForm.querySelector('[name="payeeKind"]');
    const otherLabel = liquidationPayeeForm.querySelector('[data-liq-other-review]');
    const syncOther = () => {
      otherLabel.hidden = payeeSelect.value !== 'other';
      otherLabel.querySelector('input').required = !otherLabel.hidden;
    };
    payeeSelect.addEventListener('change', syncOther);
    liquidationPayeeForm.addEventListener("submit", event => {
    event.preventDefault();
    const employeeId = liquidationPayeeForm.dataset.liqPayeeEmployee;
    const expenseId = liquidationPayeeForm.dataset.liqPayeeExpense;
    const employee = liquidationEmployeeLookup(employeeId);
    const expense = employee && liquidationExpenseDetails(employee).find(item => item.id === expenseId);
    if (!expense) return;
    const form = new FormData(liquidationPayeeForm);
    const vendor = normalizeCell(form.get("vendor"));
    const payeeKind = String(form.get("payeeKind") || "unclassified");
    if (!vendor || !counterpartyTypes[payeeKind]) return;
    const payeeClassification = payeeKind === 'other' ? normalizeCell(form.get('payeeClassification')) : '';
    if (payeeKind === 'other' && !payeeClassification) return;
    liquidationPayeeClassifications[`${state.selectedProjectId}::${employeeId}::${expenseId}`] = { vendor, payeeKind, payeeClassification };
    localStorage.setItem(liquidationPayeeStorageKey, JSON.stringify(liquidationPayeeClassifications));
    if (vendor !== expense.vendor || payeeKind !== expense.payeeKind) liquidationUpdateEmployee(employeeId, {}, `Payee classification: ${vendor} · ${counterpartyTypeLabel(payeeKind)} (previously ${counterpartyTypeLabel(expense.payeeKind)}).`);
    state.liquidationPayeeReview = null;
    render();
    });
  }
  document.querySelectorAll("[data-fund-override-open]").forEach(button => {
    button.addEventListener("click", fundReleaseOpenOverrideModal);
  });
  document.querySelectorAll("[data-fund-override-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      fundReleaseCloseOverrideModal();
    });
  });
  const fundReleaseOverrideForm = document.getElementById("fundReleaseOverrideForm");
  if (fundReleaseOverrideForm) fundReleaseOverrideForm.addEventListener("submit", event => {
    event.preventDefault();
    handleFundReleaseOverrideFormSubmit(fundReleaseOverrideForm);
  });
  document.querySelectorAll("[data-fund-note-modal-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      fundReleaseCloseNoteModal();
    });
  });
  const fundReleaseNoteForm = document.getElementById("fundReleaseNoteForm");
  if (fundReleaseNoteForm) fundReleaseNoteForm.addEventListener("submit", event => {
    event.preventDefault();
    handleFundReleaseNoteFormSubmit(fundReleaseNoteForm);
  });
  document.querySelectorAll("[data-delete-ce]").forEach(button => {
    button.addEventListener("click", () => {
      deleteCeVersion(button.dataset.deleteCe);
    });
  });
  document.querySelectorAll("[data-review-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      state.reviewSnapshot = null;
      render();
    });
  });
  document.querySelectorAll("[data-review-open]").forEach(button => {
    button.addEventListener("click", () => {
      const [projectId, tab] = button.dataset.reviewOpen.split(":");
      state.selectedProjectId = projectId;
      state.tab = tab;
      state.view = "Project 360";
      state.reviewSnapshot = null;
      render();
    });
  });
  document.querySelectorAll("[data-ce-upload-button]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.querySelector(`[data-ce-upload-input="${button.dataset.ceUploadButton}"]`);
      input?.click();
    });
  });
  document.querySelectorAll("[data-ce-upload-input]").forEach(input => {
    input.addEventListener("change", () => {
      uploadCeFile(input.files?.[0], input.dataset.ceUploadInput === "addendum");
      input.value = "";
    });
  });
  document.querySelectorAll("[data-crp-upload-button]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector("[data-crp-upload-input]")?.click();
    });
  });
  document.querySelectorAll("[data-crp-upload-input]").forEach(input => {
    input.addEventListener("change", () => {
      uploadCrpFile(input.files?.[0]);
      input.value = "";
    });
  });
  document.querySelectorAll("[data-layout-reset]").forEach(button => {
    button.addEventListener("click", () => {
      delete widgetLayoutConfig[state.role];
      delete widgetHeightConfig[state.role];
      localStorage.setItem("spotlightWidgetLayout", JSON.stringify(widgetLayoutConfig));
      localStorage.setItem("spotlightWidgetHeights", JSON.stringify(widgetHeightConfig));
      render();
    });
  });
  document.querySelectorAll("[data-widget-resize]").forEach(handle => {
    handle.addEventListener("pointerdown", startWidgetResize);
  });
  bindCalendarScrollSync();
  fitTextToBox();
  syncAdaptiveWidgets();
  bindCrpBufferTooltip();
  bindCrpDisclosureState();
  const newProject = document.getElementById("newProject");
  if (newProject) newProject.addEventListener("click", () => {
    Object.keys(projectDraftMedia).forEach(key => delete projectDraftMedia[key]);
    state.projectDraftOpen = true;
    render();
  });
  document.querySelectorAll("[data-project-draft-close]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.target !== button && button.classList.contains("review-backdrop")) return;
      Object.keys(projectDraftMedia).forEach(key => delete projectDraftMedia[key]);
      state.projectDraftOpen = false;
      render();
    });
  });
  document.querySelectorAll("[data-project-media-input]").forEach(input => {
    input.addEventListener("change", () => updateProjectDraftMedia(input.dataset.projectMediaInput, input.files));
  });
  document.querySelectorAll("[data-project-paste-target]").forEach(button => {
    button.addEventListener("click", async () => {
      const pasted = await pasteProjectDraftImage(button.dataset.projectPasteTarget);
      if (pasted) return;
      button.focus();
      const field = button.closest("[data-project-media-field]");
      const status = field?.querySelector("[data-project-media-name]");
      if (status) status.textContent = "Press Cmd+V to paste";
    });
    button.addEventListener("paste", event => {
      const imageItem = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith("image/"));
      if (!imageItem) return;
      event.preventDefault();
      const source = imageItem.getAsFile();
      applyProjectDraftPastedImage(button.dataset.projectPasteTarget, source);
    });
  });
  const projectDraftForm = document.getElementById("projectDraftForm");
  if (projectDraftForm) {
    const companyInput = projectDraftForm.querySelector("[data-project-company-brand]");
    const contactInput = projectDraftForm.querySelector("[data-project-client-contact]");
    const designationInput = projectDraftForm.querySelector("[data-project-client-designation]");
    const clientIdInput = projectDraftForm.querySelector("[data-project-client-id]");
    const status = projectDraftForm.querySelector("[data-project-client-status]");
    const syncClientSuggestion = source => {
      const selectedContact = source === "contact" ? matchingClientContact(contactInput?.value) : null;
      const selectedClient = selectedContact ? client(selectedContact.clientId) : matchingProjectClient(companyInput?.value);
      if (selectedClient) {
        if (source === "contact" && companyInput) companyInput.value = selectedClient.company;
        if (clientIdInput) clientIdInput.value = selectedClient.id;
        if (status) status.textContent = `Known company · ${selectedClient.company} details will be reused`;
        const currentContact = matchingClientContact(contactInput?.value, selectedClient.id);
        const suggestedContact = currentContact || (source === "company" ? db.contacts.find(item => item.clientId === selectedClient.id) : null);
        if (source === "company" && suggestedContact && contactInput) contactInput.value = suggestedContact.name;
        if (suggestedContact && designationInput) designationInput.value = suggestedContact.type || "";
      } else {
        if (clientIdInput) clientIdInput.value = "";
        if (status) status.textContent = "New company · a client record will be created with this project";
        if (source === "company" && contactInput) contactInput.value = "";
        if (designationInput) designationInput.value = "";
      }
      const code = document.querySelector("[data-project-draft-code]");
      const codePart = selectedClient?.code || projectClientCode(companyInput?.value);
      if (code) code.textContent = `${currentClientYear()}-${codePart}-${String(db.projects.length + 1).padStart(4, "0")}`;
      const owner = projectDraftForm.querySelector('[name="owner"]');
      if (owner && selectedClient?.owner && [...owner.options].some(option => option.value === selectedClient.owner)) owner.value = selectedClient.owner;
    };
    companyInput?.addEventListener("input", () => syncClientSuggestion("company"));
    companyInput?.addEventListener("change", () => syncClientSuggestion("company"));
    contactInput?.addEventListener("input", () => syncClientSuggestion("contact"));
    contactInput?.addEventListener("change", () => syncClientSuggestion("contact"));
  }
  if (projectDraftForm) projectDraftForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(projectDraftForm);
    const next = String(db.projects.length + 1).padStart(4, "0");
    const year = currentClientYear();
    const today = new Date().toISOString().slice(0, 10);
    const companyBrandName = normalizeCell(form.get("companyBrand"));
    const contactName = normalizeCell(form.get("clientContact"));
    const designation = normalizeCell(form.get("designation"));
    let clientId = form.get("clientId") || "";
    let selectedClient = client(clientId) || matchingProjectClient(companyBrandName);
    if (!selectedClient) {
      selectedClient = {
        id:`c${Date.now()}`,
        code:projectClientCode(companyBrandName),
        company:companyBrandName,
        unit:"To be completed",
        brand:companyBrandName,
        industry:"To be completed",
        status:"Active",
        owner:form.get("owner") || currentUser(),
        paymentTerms:30,
        firstWorked:today,
        lastWorked:today
      };
      db.clients.unshift(selectedClient);
      clientId = selectedClient.id;
    }
    let selectedContact = matchingClientContact(contactName, clientId);
    if (contactName && !selectedContact) {
      selectedContact = { id:`ct${Date.now()}`, clientId, name:contactName, type:designation || "Client contact", email:"", mobile:"", birthday:"" };
      db.contacts.push(selectedContact);
    } else if (selectedContact && designation) {
      selectedContact.type = designation;
    }
    const value = parseMoney(form.get("value"));
    const newRecord = {
      id: `p${Date.now()}`,
      code: `${year}-${selectedClient.code}-${next}`,
      name: form.get("name") || "New Spotlight Opportunity",
      clientId,
      clientContact:contactName,
      clientDesignation:designation,
      owner: form.get("owner") || currentUser(),
      implementationOwner: form.get("implementationOwner") || "Unassigned",
      projectCoordinator: form.get("projectCoordinator") || "Unassigned",
      creativeOwner: form.get("creativeOwner") || "Unassigned",
      copywriter: form.get("copywriter") || "Unassigned",
      graphicArtist: form.get("graphicArtist") || "Unassigned",
      service: form.get("service") || "Other",
      opportunity: "Pitch",
      competingAgencies: 0,
      stage: "LEAD",
      status: "Active",
      value,
      approvedCe: 0,
      expectedRevenue: value,
      estimatedCost: 0,
      actualRevenue: 0,
      actualCost: 0,
      liveDate: form.get("liveDate") || "2026-09-30",
      pitchDate: "",
      awardedDate: "",
      venue: form.get("venue") || "Venue TBD",
      totalBudget: value,
      asf: 0,
      savings: 0,
      location: "Metro Manila",
      provincial: false,
      created: today,
      brief: form.get("projectLine") || "New project brief pending.",
      projectBrief: {
        overallBudget: form.get("overallBudget") || fmt(value),
        checkpoint1: form.get("checkpoint1") ? formatShortDate(form.get("checkpoint1")) : "TBD",
        checkpoint2: form.get("checkpoint2") ? formatShortDate(form.get("checkpoint2")) : "TBD",
        checkpoint3: form.get("checkpoint3") ? formatShortDate(form.get("checkpoint3")) : "TBD",
        presentationDate: form.get("presentationDate") ? formatShortDate(form.get("presentationDate")) : "TBD",
        projectLine: form.get("projectLine") || "New project brief pending.",
        tagline: form.get("tagline") || "Campaign tagline pending",
        overview: form.get("overview") || "Brief background, context, and problem to solve.",
        objectives: form.get("objectives") || "Define what success looks like and the measurable outcomes for the project.",
        services: form.getAll("services"),
        generalRequirements: form.getAll("generalRequirements"),
        nonNegotiables: form.get("nonNegotiables") || "Client approval cadence, event-date readiness, budget guardrails, and documented change requests.",
        attachments: [
          { label:"Brand Logos", value:fileNamesFromForm(form, "brandLogos", projectDraftMedia.brandLogos?.name), note:"Logo lockups for brief decks and layouts", preview:projectDraftMedia.brandLogos?.dataUrl || "" },
          { label:"Font Guide", value:fileNamesFromForm(form, "fontGuide", projectDraftMedia.fontGuide?.name), note:"Typography files or brand font rules", preview:projectDraftMedia.fontGuide?.dataUrl || "" },
          { label:"Color Palette", value:fileNamesFromForm(form, "colorPalette", projectDraftMedia.colorPalette?.name), note:"Color swatches, brand guide, or palette image", preview:projectDraftMedia.colorPalette?.dataUrl || "" },
          { label:"References / Pegs", value:fileNamesFromForm(form, "references", projectDraftMedia.references?.name), note:"Previous executions and visual references", preview:projectDraftMedia.references?.dataUrl || "" }
        ]
      }
    };
    db.projects.unshift(newRecord);
    selectedClient.lastWorked = today;
    db.activity.unshift({ projectId: newRecord.id, at: `${today} 20:15`, user: currentUser(), action: "Project created", from: "", to: "LEAD", comment: "Project created with manpower assignments." });
    state.projectDraftOpen = false;
    Object.keys(projectDraftMedia).forEach(key => delete projectDraftMedia[key]);
    state.selectedProjectId = newRecord.id;
    state.view = "Project 360";
    state.tab = "Overview";
    render();
  });
}

hydrateSavedCeUploads();
hydrateSavedCrpUploads();
render();
rescanStoredCrpUploads();
