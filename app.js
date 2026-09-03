const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

const settings = {
  targetGrossMargin: 0.30,
  liquidationDeadlineMetroDays: 7,
  liquidationDeadlineProvincialDays: 14,
  incidentalPerDayThreshold: 5000,
  incidentalPerProjectThreshold: 20000,
  cashAdvanceBlockOverdue: true,
  projectCodeFormat: "YEAR-CLIENTCODE-SEQ",
  vatDefault: 0.12,
  asfDefault: 0.12
};

const dashboardToday = "2026-09-03";

const ceoCardOptions = [
  "Calendar",
  "Tasks",
  "Revenue YTD",
  "Accounts Receivables",
  "Accounts Payable",
  "Total Unliquidated Amount"
];

const ceoCardConfig = JSON.parse(localStorage.getItem("spotlightCeoCards") || "null") || [
  "Calendar",
  "Tasks",
  "Revenue YTD",
  "Accounts Receivables"
];

const widgetSizeOptions = ["Compact", "Default", "Wide", "Tall", "Full"];
const widgetLayoutConfig = JSON.parse(localStorage.getItem("spotlightWidgetLayout") || "{}");
const widgetHeightConfig = JSON.parse(localStorage.getItem("spotlightWidgetHeights") || "{}");
const expandedProjectCards = new Set(JSON.parse(localStorage.getItem("spotlightExpandedProjects") || "[]"));
const expandedApprovalItems = new Set(JSON.parse(localStorage.getItem("spotlightExpandedApprovals") || "[]"));

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

const stages = ["LEAD", "QUALIFICATION", "BRIEFED", "COSTING", "PITCHING", "NEGOTIATION", "AWARDED", "ONBOARDING", "PRE-PRODUCTION", "LIVE / IMPLEMENTATION", "POST-PRODUCTION", "FOR BILLING", "BILLED", "COLLECTION", "CLOSURE", "CLOSED"];

const db = {
  users: [
    { id: "u1", name: "Mia Santos", role: "SUPER ADMIN / CEO" },
    { id: "u2", name: "Paolo Reyes", role: "ACCOUNTS" },
    { id: "u3", name: "Lara Cruz", role: "IMPLEMENTATION / PRODUCTION" },
    { id: "u4", name: "June Ramos", role: "FINANCE CONTROL" }
  ],
  clients: [
    { id: "c1", code: "UNILAB", company: "Unilab", unit: "Consumer Health", brand: "Example Brand", industry: "Healthcare", status: "Active", owner: "Paolo Reyes", paymentTerms: 45, firstWorked: "2022-03-14", lastWorked: "2026-08-21" },
    { id: "c2", code: "AYALA", company: "Ayala Land", unit: "Commercial", brand: "Mall Activations", industry: "Real Estate", status: "Active", owner: "Paolo Reyes", paymentTerms: 60, firstWorked: "2024-05-02", lastWorked: "2026-07-28" },
    { id: "c3", code: "JFC", company: "Jollibee Foods", unit: "Brand Experience", brand: "Campus Roadshow", industry: "Food", status: "Active", owner: "Nina Lim", paymentTerms: 30, firstWorked: "2025-01-19", lastWorked: "2026-08-10" }
  ],
  contacts: [
    { id: "ct1", clientId: "c1", name: "Angela Tan", type: "Marketing", email: "angela.tan@example.com", mobile: "+63 917 000 1021", birthday: "May 18" },
    { id: "ct2", clientId: "c1", name: "Rico Mercado", type: "Finance", email: "rico.m@example.com", mobile: "+63 917 000 1099", birthday: "November 7" },
    { id: "ct3", clientId: "c2", name: "Bea Lacson", type: "Procurement", email: "bea.l@example.com", mobile: "+63 918 000 2320", birthday: "March 22" }
  ],
  projects: [
    { id: "p1", code: "2026-UNILAB-0001", name: "2026 Annual Brand Summit", clientId: "c1", owner: "Paolo Reyes", implementationOwner: "Lara Cruz", creativeOwner: "Andrea Valdez", service: "PR / Big Event", opportunity: "Pitch", competingAgencies: 3, stage: "CLOSURE", status: "Awaiting closure", value: 2250000, approvedCe: 2250000, expectedRevenue: 2250000, estimatedCost: 1485000, actualRevenue: 2250000, actualCost: 1552500, liveDate: "2026-08-18", pitchDate: "2026-06-22", awardedDate: "2026-07-12", venue: "BGC Convention Hall", totalBudget: 2250000, asf: 260000, savings: 697500, location: "Metro Manila", provincial: false, created: "2026-06-04", brief: "Annual brand summit covering stage design, technical production, registration flow, live documentation, post-event report, and executive client hosting." },
    { id: "p2", code: "2026-AYALA-0002", name: "Holiday Mall Spectacular", clientId: "c2", owner: "Paolo Reyes", implementationOwner: "Lara Cruz", creativeOwner: "Andrea Valdez", service: "Brand Activation", opportunity: "Competitive Bidding", competingAgencies: 4, stage: "PITCHING", status: "Active", value: 4800000, approvedCe: 0, expectedRevenue: 2400000, estimatedCost: 1700000, actualRevenue: 0, actualCost: 0, liveDate: "2026-09-08", pitchDate: "2026-09-04", awardedDate: "", venue: "Ayala Center Activity Area", totalBudget: 4800000, asf: 520000, savings: 1420000, location: "Metro Manila", provincial: false, created: "2026-08-15", brief: "Competitive pitch for a holiday mall activation with hero installation, shopper engagement zones, supplier-heavy fabrication, and full creative presentation." },
    { id: "p3", code: "2026-JFC-0003", name: "Campus Launch Caravan", clientId: "c3", owner: "Nina Lim", implementationOwner: "Marco Dela Paz", creativeOwner: "Andrea Valdez", service: "Trade Marketing", opportunity: "Direct Award", competingAgencies: 0, stage: "PRE-PRODUCTION", status: "Active", value: 1850000, approvedCe: 1850000, expectedRevenue: 1850000, estimatedCost: 1184000, actualRevenue: 0, actualCost: 310000, liveDate: "2026-09-05", pitchDate: "2026-08-05", awardedDate: "2026-08-09", venue: "Cebu University Circuit", totalBudget: 1850000, asf: 210000, savings: 666000, location: "Cebu", provincial: true, created: "2026-08-01", brief: "Multi-run campus caravan requiring provincial logistics, manpower deployment, booth setup, sampling flow, and per-run liquidation discipline." },
    { id: "p4", code: "2026-UNILAB-0004", name: "RiteMed Retail Visibility Sprint", clientId: "c1", owner: "Paolo Reyes", implementationOwner: "Gia Flores", creativeOwner: "Andrea Valdez", service: "Fabrication", opportunity: "Existing Program / Renewal", competingAgencies: 1, stage: "COLLECTION", status: "Active", value: 980000, approvedCe: 980000, expectedRevenue: 980000, estimatedCost: 660000, actualRevenue: 980000, actualCost: 720000, liveDate: "2026-07-10", pitchDate: "2026-05-26", awardedDate: "2026-06-02", venue: "Metro Manila Retail Network", totalBudget: 980000, asf: 95000, savings: 260000, location: "Metro Manila", provincial: false, created: "2026-05-20", brief: "Retail visibility sprint across selected stores, focused on fabrication, installation, documentation, and collection closeout." },
    { id: "p5", code: "2026-AYALA-0005", name: "Tenant Content Capsules", clientId: "c2", owner: "Nina Lim", implementationOwner: "Creative Studio", creativeOwner: "Creative Studio", service: "Content / Video", opportunity: "Pitch", competingAgencies: 2, stage: "LOST", status: "Lost", value: 650000, approvedCe: 0, expectedRevenue: 0, estimatedCost: 0, actualRevenue: 0, actualCost: 0, liveDate: "2026-08-30", pitchDate: "2026-08-12", awardedDate: "", venue: "Ayala Malls", totalBudget: 650000, asf: 78000, savings: 0, location: "Metro Manila", provincial: false, created: "2026-07-21", brief: "Content capsule pitch for tenant social content and mall-led digital features." }
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
    { ceId: "ce2", category: "Fabrication", description: "Stage build and scenic elements", qty: 1, unitCost: 500000, selling: 760000, supplier: "BuildRight Fabrication" },
    { ceId: "ce2", category: "Technical", description: "Lights, sound, LED wall", qty: 1, unitCost: 410000, selling: 620000, supplier: "ProAV Manila" },
    { ceId: "ce2", category: "Manpower", description: "Event manpower and field ops", qty: 40, unitCost: 4500, selling: 280000, supplier: "FieldForce PH" },
    { ceId: "ce2", category: "Agency Service Fee", description: "Project management and account service", qty: 1, unitCost: 0, selling: 260000, supplier: "" },
    { ceId: "ce4", category: "Logistics", description: "Provincial transport and accommodation", qty: 1, unitCost: 360000, selling: 510000, supplier: "Island Movers" }
  ],
  approvals: [
    { id: "a1", projectId: "p1", type: "Finance Validation", status: "Approved", approver: "June Ramos", at: "2026-07-03 10:11", comments: "VAT, ASF, and totals checked." },
    { id: "a2", projectId: "p1", type: "Implementation Validation", status: "Approved", approver: "Lara Cruz", at: "2026-07-03 16:34", comments: "Supplier costs realistic; added ingress buffer." },
    { id: "a3", projectId: "p1", type: "Management Approval", status: "Approved", approver: "Mia Santos", at: "2026-07-04 09:22", comments: "Margin acceptable." },
    { id: "a4", projectId: "p2", type: "Management Approval", status: "Pending", approver: "Mia Santos", at: "", comments: "Below benchmark pending strategic approval." }
  ],
  budgetRequests: [
    { id: "br1", projectId: "p1", holder: "PRODUCTION / IMPLEMENTATION", requestor: "Lara Cruz", category: "Fabrication", amount: 100000, status: "RELEASED", dateRequired: "2026-08-10", exception: false },
    { id: "br2", projectId: "p1", holder: "PROCUREMENT", requestor: "Mia Santos", category: "Supplier Downpayment", amount: 200000, status: "RELEASED", dateRequired: "2026-08-11", exception: false },
    { id: "br3", projectId: "p1", holder: "FIELD CASHIER", requestor: "Marco Dela Paz", category: "Manpower", amount: 50000, status: "RELEASED", dateRequired: "2026-08-17", exception: false },
    { id: "br4", projectId: "p3", holder: "FIELD CASHIER", requestor: "Marco Dela Paz", category: "Manpower", amount: 90000, status: "UNDER REVIEW", dateRequired: "2026-09-04", exception: true, reason: "Requester has one overdue liquidation; needs management release exception." },
    { id: "br5", projectId: "p2", holder: "PRODUCTION / IMPLEMENTATION", requestor: "Lara Cruz", category: "Creative", amount: 180000, status: "REQUESTED", dateRequired: "2026-09-02", exception: true, reason: "Major creative work before qualification sign-off." }
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

const dashboardSeed = {
  monthlyRevenue: {
    2024: [480000, 620000, 710000, 540000, 860000, 930000, 780000, 990000, 1120000, 980000, 1260000, 1440000],
    2025: [690000, 740000, 820000, 760000, 1040000, 1160000, 980000, 1210000, 1320000, 1490000, 1560000, 1810000],
    2026: [820000, 910000, 970000, 860000, 1180000, 1320000, 1090000, 1260000, 0, 0, 0, 0]
  },
  calendarItems: [
    { date: "2026-09-02", item: "Review Holiday Mall Spectacular CE", source: "Spotlight OS", status: "Review" },
    { date: "2026-09-03", item: "Campus Launch 72-hour readiness check", source: "Google Calendar ready", status: "Critical" },
    { date: "2026-09-04", item: "Annual Brand Summit closure review", source: "Fantastical-ready feed", status: "Attention" }
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

const state = { view: "Dashboard", role: "SUPER ADMIN / CEO", selectedProjectId: "p1", tab: "Overview", search: "" };

function client(id) { return db.clients.find(c => c.id === id); }
function project(id) { return db.projects.find(p => p.id === id); }
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
  if (/APPROVED|CLEARED|PAID|GREEN|HEALTHY|Done|CLIENT APPROVED/i.test(value)) return "good";
  if (/RISK|OVERDUE|BLOCKED|FINDINGS|LOST|RED|Critical|Missing/i.test(value)) return "risk";
  if (/PENDING|REVIEW|DUE|ATTENTION|YELLOW|PARTIALLY|Open|FOR|REQUESTED|VERBAL|revision/i.test(value)) return "warn";
  if (/CLOSED|REVISED|DOCUMENTED|signed|COMPLETED/i.test(value)) return "done";
  return "active";
}
function chip(value, forced) { return `<span class="status ${forced || statusClass(value)}">${value}</span>`; }
function fmt(n) { return peso.format(n || 0); }
function projectCost(p) { return db.liquidations.filter(l => l.projectId === p.id).reduce((s, l) => s + l.liquidated - l.returned, 0) || p.actualCost; }
function stageIndex(p) { return Math.max(0, stages.indexOf(p.stage)); }

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

function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="shell">
      <aside class="side">
        <div class="brand"><div class="mark">S</div><div><strong>Spotlight OS</strong><span>Project-first operating layer</span></div></div>
        <div class="rolebox">
          <label>Current role</label>
          <select id="roleSelect">${Object.keys(roles).map(r => `<option ${r === state.role ? "selected" : ""}>${r}</option>`).join("")}</select>
        </div>
        <nav class="nav">${["Dashboard","Approvals","Projects","Clients","Finance","Liquidations","Suppliers","Search","Architect"].map(v => `<button class="${state.view === v ? "active" : ""}" data-view="${v}">${icon(v)} ${v}</button>`).join("")}</nav>
        <div class="sidefooter">Every client has history. Every project has an identity. Every peso has an owner and purpose.</div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="search"><input id="globalSearch" value="${state.search}" placeholder="Search project, client, brand, supplier, invoice, CE, employee, then press Enter" /></div>
          <div class="userpill"><div class="avatar">${state.role[0]}</div><div><strong>${currentUser()}</strong><br><small>${state.role}</small></div></div>
        </div>
        ${state.view === "Dashboard" ? `<section class="hero"><div><h1>${dashboardTitle()}</h1><p>${dashboardProfile().question}</p></div></section>` : ""}
        <div class="content">${views[state.view]()}</div>
      </main>
    </div>`;
  bind();
}

function icon(v) {
  return { Dashboard:"▦", Projects:"▤", "Project 360":"◎", Clients:"◫", Finance:"₱", Liquidations:"✓", Suppliers:"◇", Approvals:"●", Search:"⌕", Architect:"▧" }[v] || "•";
}
function currentUser() {
  if (state.role.includes("CEO")) return "Mia Santos";
  if (state.role.includes("CLIENT") || state.role.includes("ACCOUNTS")) return "Paolo Reyes";
  if (state.role.includes("GRAPHIC")) return "Andrea Valdez";
  if (state.role.includes("COPYWRITER")) return "Isa Garcia";
  if (state.role.includes("3D")) return "Ramon Uy";
  if (state.role.includes("EVENT") || state.role.includes("IMPLEMENTATION") || state.role.includes("COO") || state.role.includes("OPERATIONS")) return "Lara Cruz";
  if (state.role.includes("PROCUREMENT")) return "Bea Lacson";
  if (state.role.includes("FIELD")) return "Marco Dela Paz";
  if (state.role.includes("WAREHOUSE")) return "Robbie Tan";
  if (state.role.includes("SOCIAL")) return "Tessa Chua";
  if (state.role.includes("HR")) return "Ana Villanueva";
  if (state.role.includes("FINANCE")) return "June Ramos";
  return "Lara Cruz";
}

function dashboardTitle() {
  const clean = state.role.replace("SUPER ADMIN / ", "").replace(" / MULTIMEDIA ARTIST", "");
  return `${clean} Dashboard`;
}

function dashboardProfile(role = state.role) {
  return dashboardProfiles[role] || dashboardProfiles["SUPER ADMIN / CEO"];
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

const widgetRegistry = {
  my_action_center: {
    title: "My Action Center",
    purpose: "The five things this person should deal with today.",
    render: () => queueTable(actionCenterRows(), ["Project", "Item", "Owner", "Due", "Status", "Next Action"])
  },
  executive_company_health: {
    title: "Executive Company Health",
    purpose: "Revenue, profit, cash, pipeline, forecast, and operating cash in one executive view.",
    render: () => {
      const m = metrics();
      const target = 9200000;
      const cash = 3650000;
      const committed = 1280000;
      const available = cash - committed;
      const forecastRevenue = m.pipelineValue * 0.48 + m.awarded.reduce((s,p)=>s+p.expectedRevenue,0);
      return `<div class="grid cols-4">${mini("Total YTD revenue", fmt(m.actRevenue))}${mini("Revenue vs target", `${Math.round(m.actRevenue / target * 100)}%`)}${mini("Gross profit", fmt(m.actRevenue - m.actCost))}${mini("Gross margin", `${Math.round(margin(m.actRevenue,m.actCost)*100)}%`)}${mini("Net profit", fmt(m.actRevenue - m.actCost - 760000))}${mini("Current cash position", fmt(cash))}${mini("Available operating cash", fmt(available))}${mini("Accounts receivable", fmt(m.ar))}${mini("Accounts payable", fmt(820000))}${mini("Revenue pipeline", fmt(m.pipelineValue))}${mini("Forecast revenue", fmt(forecastRevenue))}${mini("Forecast profit", fmt(forecastRevenue * settings.targetGrossMargin))}${mini("Projected cash position", fmt(available + m.ar - 820000))}</div>`;
    }
  },
  year_on_year_revenue: {
    title: "Year-on-Year Revenue",
    purpose: "Input monthly revenue per year and compare growth across years.",
    render: () => yearOnYearRevenue()
  },
  executive_alerts: {
    title: "Executive Alerts",
    purpose: "Only exceptions that threaten event execution, client relationship, financial exposure, compliance, or major deadline.",
    render: () => simpleTable(financialAlertRows().concat(escalationRows()).map(a => ({ alert:a.alert, project:a.project, impact:a.impact, priority:chip(a.priority, a.priority === "CRITICAL" ? "risk" : "warn"), action:a.action })), ["alert","project","impact","priority","action"])
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
      return `<div class="grid cols-3">${mini("Total active projects", active.length)}${mini("Projects at risk", active.filter(p=>health(p)[0]==="AT RISK").length)}${mini("Below target margin", active.filter(p=>margin(p.actualRevenue || p.expectedRevenue, p.actualCost || p.estimatedCost) < settings.targetGrossMargin).length)}</div>${barChart("Projects by Stage", Object.entries(groupCount(active, "stage")).map(([label,value]) => ({ label, value, color:"active" })), "projects")}${projectTable(active.filter(p => health(p)[0] !== "HEALTHY" || daysUntil(p.liveDate) <= 7))}`;
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
    render: () => simpleTable(db.projects.filter(p => !["LOST","CLOSED"].includes(p.stage)).map(p => ({ project:`<button class="linkbtn" data-project="${p.id}">${p.code}</button>`, client:client(p.clientId).company, accountsOwner:p.owner, productionOwner:p.implementationOwner, creativeOwner:creativeOwnerFor(p.id), stage:chip(p.stage), eventDate:p.liveDate, completion:`${Math.round((stageIndex(p)+1)/stages.length*100)}%`, health:chip(health(p)[0], health(p)[1]), blocker:blockerFor(p.id), nextMilestone:nextMilestoneFor(p) })), ["project","client","accountsOwner","productionOwner","creativeOwner","stage","eventDate","completion","health","blocker","nextMilestone"])
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
    render: () => simpleTable(db.projects.filter(p => ["LEAD","QUALIFICATION","BRIEFED","COSTING","PITCHING","NEGOTIATION","AWARDED","LOST"].includes(p.stage)).map(p => ({ project:`<button class="linkbtn" data-project="${p.id}">${p.code}</button>`, client:client(p.clientId).company, stage:chip(p.stage), value:fmt(p.value), probability:`${p.stage==="AWARDED" ? 100 : p.stage==="LOST" ? 0 : p.opportunity === "Direct Award" ? 80 : 45}%`, expectedAward:p.liveDate, competition:p.competingAgencies, lastContact:"2026-09-01" })), ["project","client","stage","value","probability","expectedAward","competition","lastContact"])
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
    purpose: "Creative requirements by project, presentation date, event date, priority, and status.",
    render: () => creativeTable(dashboardSeed.creativeJobs)
  },
  revision_tracker: {
    title: "Revision Tracker",
    purpose: "Revision rounds and excessive cycles that need direction.",
    render: () => widgetRegistry.revision_queue.render()
  },
  creative_risks: {
    title: "Creative Risks",
    purpose: "Incomplete briefs, unrealistic deadlines, missing assets, client approval delays, and overload.",
    render: () => simpleTable(dashboardSeed.creativeJobs.filter(j => ["Overdue","Waiting","For revision"].includes(j.status) || j.round > 2).map(j => ({ project:project(j.projectId).code, risk:j.waitingOn, deliverable:j.deliverable, due:j.due, priority:chip(j.priority), action:j.nextAction })), ["project","risk","deliverable","due","priority","action"])
  },
  creative_forecast: {
    title: "Upcoming Creative Requirements",
    purpose: "7-day, 14-day, and 30-day creative load forecast.",
    render: () => barChart("Creative Forecast", [{ label:"7 days", value:dashboardSeed.creativeJobs.filter(j=>daysUntil(j.due)<=7).length, color:"risk" }, { label:"14 days", value:dashboardSeed.creativeJobs.filter(j=>daysUntil(j.due)<=14).length, color:"warn" }, { label:"30 days", value:dashboardSeed.creativeJobs.length, color:"active" }], "jobs")
  },
  art_job_queue: { title: "Job Order Queue", purpose: "Artwork JOs by requester, designer, priority, due date, and release status.", render: () => widgetRegistry.creative_job_queue.render() },
  art_review_queue: { title: "My Review Queue", purpose: "Artwork requiring Art Director review.", render: () => widgetRegistry.creative_review_queue.render() },
  designer_workload: { title: "Designer Workload", purpose: "Active JOs per designer.", render: () => widgetRegistry.creative_workload.render() },
  art_deadlines: { title: "Upcoming Deadlines", purpose: "Event, printing, fabrication, presentation, and standard deliverables.", render: () => widgetRegistry.upcoming_presentations.render() },
  asset_approval_status: {
    title: "Asset / Approval Status",
    purpose: "Brand guidelines, logo assets, dimensions, copy, artwork approval, and production files.",
    render: () => simpleTable(dashboardSeed.creativeJobs.map(j => ({ project:project(j.projectId).code, brandGuidelines:chip("Received","good"), logoAssets:chip("Received","good"), dimensions:j.waitingOn === "Dimensions" ? chip("Missing","risk") : chip("Confirmed","good"), copy:j.waitingOn === "Copy" ? chip("Pending","warn") : chip("Final","good"), artwork:j.status === "For revision" ? chip("Revision","warn") : chip(j.status) })), ["project","brandGuidelines","logoAssets","dimensions","copy","artwork"])
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
    render: () => simpleTable(myProjects().map(p => ({ project:`<button class="linkbtn" data-project="${p.id}">${p.code}</button>`, eventDate:p.liveDate, countdown:countdownLabel(p.liveDate), priority:chip(countdownPriority(p.liveDate), countdownPriority(p.liveDate)==="CRITICAL" ? "risk" : countdownPriority(p.liveDate)==="HIGH PRIORITY" ? "warn" : "active"), unresolved:blockerFor(p.id) })), ["project","eventDate","countdown","priority","unresolved"])
  },
  event_today_tasks: {
    title: "Today's Tasks",
    purpose: "Tactical execution sorted critical, high, normal.",
    render: () => simpleTable(dashboardSeed.operationsTasks.map(t => ({ project:project(t.projectId).code, task:t.type, priority:chip(/Blocked|risk/i.test(t.status) ? "CRITICAL" : "HIGH", /Blocked|risk/i.test(t.status) ? "risk" : "warn"), due:t.due, status:chip(t.status), nextAction:t.nextAction })), ["project","task","priority","due","status","nextAction"])
  },
  event_budget_tracker: {
    title: "Budget Tracker",
    purpose: "Managed-project budget allocated, requested, released, actual expenses, remaining, and liquidation balance.",
    render: () => reconciliationTable()
  },
  event_supplier_status: {
    title: "Supplier Status",
    purpose: "Supplier requirement, quotation, awarded status, downpayment, delivery, contact, and status.",
    render: () => simpleTable(dashboardSeed.procurementItems.map(i => ({ project:project(i.projectId).code, supplier:i.requirement, quotation:i.status.includes("Quotation") ? chip("Pending","warn") : chip("Needed","risk"), awarded:i.status === "No supplier yet" ? chip("No","risk") : chip("Partial","warn"), downpayment:chip("Pending","warn"), delivery:i.needBy, contact:"See supplier master", status:chip(i.status) })), ["project","supplier","quotation","awarded","downpayment","delivery","contact","status"])
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
    render: () => simpleTable(dashboardSeed.procurementItems.map(i => ({ item:i.requirement, supplier:i.status === "No supplier yet" ? "TBD" : i.requirement, expectedDelivery:i.needBy, location:project(i.projectId).location, responsible:i.requestedBy, status:chip(i.status) })), ["item","supplier","expectedDelivery","location","responsible","status"])
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
    title: "No Liquidation / No Release Rule",
    purpose: "Flags users requesting new cash while overdue liquidations remain uncleared.",
    render: () => simpleTable(db.budgetRequests.filter(b => b.exception && /overdue liquidation/i.test(b.reason || "")).map(b => ({ employee:b.requestor, project:project(b.projectId).code, request:fmt(b.amount), policy:chip("Blocked unless overridden","risk"), reason:b.reason })), ["employee","project","request","policy","reason"])
  },
  approval_queue: {
    title: "Requires My Approval",
    purpose: "CEs, CRPs, margin exceptions, and policy overrides waiting for decision.",
    render: () => {
      const approvals = db.approvals.filter(a => a.status === "Pending").map(a => ({ projectId: a.projectId, item: a.type, owner: a.approver, due: "Now", status: "Pending", next: "Review CE" }));
      const exceptions = db.budgetRequests.filter(b => b.exception).map(b => ({ projectId: b.projectId, item: `${b.category} ${fmt(b.amount)}`, owner: b.requestor, due: b.dateRequired, status: b.status, next: "Approve, reject, or return" }));
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
  creative_review_queue: { title: "Creative Review Queue", purpose: "Concept, KV, layout, 3D, and FA reviews requiring lead attention.", render: () => creativeTable(dashboardSeed.creativeJobs.filter(j => ["For review","For revision","Due today"].includes(j.status))) },
  creative_workload: { title: "Creative Project Load", purpose: "Designer and writer workload by active assignment count.", render: () => barChart("Creative Jobs by Person", creativeLoadRows(), "jobs") },
  creative_job_queue: { title: "My Job Order List", purpose: "Design work in priority order with blockers and next action.", render: () => creativeTable(dashboardSeed.creativeJobs.filter(j => roleIsManagement() || j.owner === currentUser() || state.role === "CREATIVE")) },
  today_queue: { title: "Today", purpose: "Items due today or already overdue.", render: () => creativeTable(dashboardSeed.creativeJobs.filter(j => ["Due today","Overdue"].includes(j.status) && (j.owner === currentUser() || state.role.includes("LEAD") || state.role === "CREATIVE"))) },
  revision_queue: { title: "Revision Queue", purpose: "Returned client or internal changes that need action.", render: () => creativeTable(dashboardSeed.creativeJobs.filter(j => j.status === "For revision" || j.round > 1)) },
  waiting_queue: { title: "Waiting On", purpose: "Blocked work grouped by dependency owner.", render: () => simpleTable(dashboardSeed.creativeJobs.filter(j => j.waitingOn && j.waitingOn !== "None").map(j => ({ project:project(j.projectId).code, deliverable:j.deliverable, waitingOn:j.waitingOn, nextAction:j.nextAction, due:j.due })), ["project","deliverable","waitingOn","nextAction","due"]) },
  creative_status_graph: { title: "Creative Queue Graph", purpose: "Fast view of due, blocked, revision, and upcoming creative load.", render: () => barChart("Creative Status", Object.entries(groupCount(dashboardSeed.creativeJobs.filter(j => j.owner === currentUser()), "status")).map(([label,value]) => ({ label, value, color: label === "Overdue" ? "risk" : label === "Waiting" ? "warn" : "active" })), "jobs") },
  copy_queue: { title: "Copy Queue", purpose: "Copy jobs needing writing, review, revision, or approval.", render: () => creativeTable(dashboardSeed.creativeJobs.filter(j => j.role.includes("Copy") || j.waitingOn === "Copy" || j.waitingOn === "Copy Lead")) },
  three_d_queue: { title: "3D Queue", purpose: "Visualization jobs and missing technical inputs.", render: () => creativeTable(dashboardSeed.creativeJobs.filter(j => j.role.includes("3D") || j.waitingOn === "3D")) },
  production_ready_status: { title: "Production-ready Status", purpose: "Projects approaching fabrication or event that still need final creative assets.", render: () => simpleTable(dashboardSeed.creativeJobs.filter(j => ["Waiting","For revision","Overdue"].includes(j.status)).map(j => ({ project:project(j.projectId).code, deliverable:j.deliverable, blocker:j.waitingOn, due:j.due, status:chip(j.status) })), ["project","deliverable","blocker","due","status"]) },
  upcoming_presentations: { title: "Upcoming Presentations", purpose: "Creative readiness for near-term client meetings.", render: () => simpleTable(dashboardSeed.creativeJobs.filter(j => daysUntil(j.due) >= 0 && daysUntil(j.due) <= 7).map(j => ({ project:project(j.projectId).code, deliverable:j.deliverable, owner:j.owner, due:j.due, status:chip(j.status) })), ["project","deliverable","owner","due","status"]) },
  implementation_risks: { title: "Critical Operations Issues", purpose: "Operational blockers before event day.", render: () => queueTable(dashboardSeed.operationsTasks.map(t => ({ projectId:t.projectId, item:t.type, owner:t.owner, due:t.due, status:t.status, next:t.nextAction })), ["Project","Item","Owner","Due","Status","Next Action"]) },
  operations_calendar: { title: "Upcoming Execution Calendar", purpose: "Deadlines, events, liquidations, and readiness items in the next 14 days.", render: () => simpleTable(upcomingRows(), ["date","project","type","owner","status"]) },
  production_budget_health: { title: "Production Budget Health", purpose: "Approved, requested, released, actual, and variance for production categories.", render: () => reconciliationTable() },
  my_events: { title: "My Events", purpose: "Events ordered by live date with readiness and blocker signals.", render: () => projectTable(db.projects.filter(p => p.implementationOwner === currentUser() || state.role.includes("EVENT") || state.role.includes("IMPLEMENTATION")).sort((a,b)=>daysUntil(a.liveDate)-daysUntil(b.liveDate))) },
  event_readiness: {
    title: "Pre-production Readiness",
    purpose: "Tomorrow and this-week readiness checklist.",
    render: () => {
      const tasks = dashboardSeed.operationsTasks.filter(t => t.projectId === "p3");
      const graph = barChart("Readiness Signals", Object.entries(groupCount(tasks, "status")).map(([label, value]) => ({ label, value, color: /Blocked|risk|Incomplete/i.test(label) ? "risk" : /Confirmed|Approved/i.test(label) ? "good" : "warn" })), "items");
      const table = simpleTable(tasks.map(t => ({ requirement:t.type, waitingOn:t.waitingOn, due:t.due, status:chip(t.status), nextAction:t.nextAction })), ["requirement","waitingOn","due","status","nextAction"]);
      return graph + table;
    }
  },
  my_budget_requests: { title: "My Budget Requests", purpose: "Requested, approved, released, rejected, and correction status.", render: () => budgetTable() },
  my_liquidations: { title: "My Outstanding Liquidations", purpose: "Cash advances the user must clear.", render: () => liquidationTable() },
  event_tasks: { title: "Assigned Execution Tasks", purpose: "Operational tasks assigned to onsite teams.", render: () => widgetRegistry.implementation_risks.render() },
  supplier_followups: { title: "Supplier Follow-ups", purpose: "Supplier quotation, payment, and delivery tasks.", render: () => widgetRegistry.procurement_queue.render() },
  procurement_queue: { title: "Procurement Request Queue", purpose: "What must be sourced, purchased, followed up, and documented.", render: () => simpleTable(dashboardSeed.procurementItems.map(i => ({ project:project(i.projectId).code, requirement:i.requirement, category:i.category, requestedBy:i.requestedBy, needBy:i.needBy, status:chip(i.status) })), ["project","requirement","category","requestedBy","needBy","status"]) },
  supplier_alerts: { title: "Supplier Alerts", purpose: "Late, unresponsive, quality, or reliability concerns.", render: () => simpleTable(db.suppliers.filter(s => s.status !== "Preferred" || s.reliability < 4).map(s => ({ supplier:s.name, category:s.category, reliability:s.reliability, issue:s.notes, status:chip(s.status) })), ["supplier","category","reliability","issue","status"]) },
  supplier_payments: { title: "Supplier Payments", purpose: "Downpayments, balances, and missing supplier documents.", render: () => widgetRegistry.procurement_queue.render() },
  procurement_budget: { title: "Procurement Budget", purpose: "Approved, committed, released, actual, and remaining for procurement categories.", render: () => reconciliationTable() },
  my_incidentals: { title: "Incidentals", purpose: "Meals and transport against configurable thresholds.", render: () => `${mini("Per-day threshold", fmt(settings.incidentalPerDayThreshold))}${mini("Per-project threshold", fmt(settings.incidentalPerProjectThreshold))}${barChart("Used vs Threshold", [{ label:"Today", value:2200, color:"good" }, { label:"Project", value:12400, color:"warn" }], "PHP")}` },
  manpower_fund_tracker: { title: "Manpower Fund Assignments", purpose: "Cash accountability by project for field manpower.", render: () => simpleTable(db.releases.filter(r => r.category === "Manpower").map(r => ({ project:project(r.projectId).code, released:fmt(r.amount), distributed:fmt(50000), remaining:fmt(Math.max(0,r.amount-50000)), status:chip(r.status), due:db.liquidations.find(l=>l.releaseId===r.id)?.due || "" })), ["project","released","distributed","remaining","status","due"]) },
  cash_on_hand: { title: "Cash On Hand", purpose: "Company cash currently under employee accountability.", render: () => `<div class="cash-callout">Company cash currently under your accountability: <strong>${fmt(70000)}</strong></div>` },
  liquidation_deadlines: { title: "Liquidation Deadlines", purpose: "Due today, upcoming, overdue.", render: () => widgetRegistry.liquidation_tracker.render() },
  event_manpower: { title: "Event Manpower", purpose: "Workers and payment readiness by event.", render: () => simpleTable([{ project:"2026-JFC-0003", eventDate:"2026-09-05", workers:36, paymentStatus:chip("Partially ready","warn") }, { project:"2026-UNILAB-0001", eventDate:"2026-08-18", workers:40, paymentStatus:chip("Cleared","good") }], ["project","eventDate","workers","paymentStatus"]) },
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
  const widgets = [...profile.primary, ...profile.secondary].filter(id => widgetRegistry[id]);
  const critical = profile.primary.map(renderWidget).join("");
  const secondary = profile.secondary.filter(id => widgetRegistry[id]).map(renderWidget).join("");
  return `
    <div class="commandbar">
      <div>
        <div class="eyebrow">Spotlight OS Command Center</div>
        <h2>${dashboardTitle()}</h2>
        <p>${profile.question}</p>
      </div>
      <div class="actions"><button class="btn primary" data-view="Projects">Open Project Master</button><button class="btn" data-view="Architect">Dashboard matrix</button></div>
    </div>
    ${dashboardPulse()}
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
  return `<div class="layout-config">
    <div class="layout-config-head"><span>Customize dashboard layout</span><button class="btn" data-layout-reset="true">Reset layout</button></div>
    <div class="layout-controls">${widgets.map(id => `<label><span>${widgetRegistry[id].title}</span><select data-widget-size="${id}">${widgetSizeOptions.map(option => `<option ${option === widgetSize(id) ? "selected" : ""}>${option}</option>`).join("")}</select></label>`).join("")}</div>
  </div>`;
}

function dashboardPulse() {
  if (state.role === "SUPER ADMIN / CEO") return ceoConfigurableCards();
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
  const controls = `<div class="card-config"><span>Customize CEO cards</span>${ceoCardConfig.map((selected, index) => `<select data-ceo-card="${index}">${ceoCardOptions.map(option => `<option ${option === selected ? "selected" : ""}>${option}</option>`).join("")}</select>`).join("")}</div>`;
  return ceoRevenueProgress() + controls + pulseCards(ceoCardConfig.map(ceoCardData));
}

function ceoRevenueProgress() {
  const m = metrics();
  const target = 9200000;
  const percent = Math.min(100, Math.round(m.actRevenue / target * 100));
  const remaining = Math.max(0, target - m.actRevenue);
  return `<section class="revenue-progress" aria-label="Revenue progress">
    <div class="progress-copy">
      <span>Revenue vs Target</span>
      <strong>${percent}% complete</strong>
      <small>${fmt(remaining)} remaining to target</small>
    </div>
    <div class="game-progress">
      <div class="game-progress-track"><i style="width:${percent}%"></i></div>
      <div class="game-progress-labels"><span>YTD ${fmt(m.actRevenue)}</span><b>Target ${fmt(target)}</b></div>
    </div>
  </section>`;
}

function ceoCardData(label) {
  const m = metrics();
  const underAudit = db.liquidations.filter(l => /Under Audit|For Cash Return|For Reimbursement/i.test(l.status)).reduce((s,l)=>s + Math.max(0, l.released - l.returned), 0);
  const map = {
    "Calendar": { label, view:"Dashboard", tone:"event", content: ceoCalendarCard() },
    "Tasks": { label, view:"Approvals", tone:"urgent", content: ceoTasksCard() },
    "Revenue YTD": { label, value: fmt(m.actRevenue), hint:"Collected revenue booked to projects", view:"Finance" },
    "Accounts Receivables": { label, view:"Finance", tone:"risk", content: ceoMoneyCard("Accounts Receivables", m.ar, "Billed but not collected", arDetailRows()) },
    "Accounts Payable": { label, view:"Finance", tone:"risk", content: ceoMoneyCard("Accounts Payable", 820000, "Supplier obligations due", apDetailRows()) },
    "Total Unliquidated Amount": { label, value: fmt(underAudit), hint:"Released cash under employee accountability", view:"Liquidations", tone:"urgent" }
  };
  return map[label];
}

function ceoCalendarCard() {
  const cells = [
    { label: "30", date: "2026-08-30", outside: true },
    { label: "31", date: "2026-08-31", outside: true },
    ...Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      return { label: String(day), date: `2026-09-${String(day).padStart(2, "0")}`, outside: false };
    }),
    { label: "1", date: "2026-10-01", outside: true },
    { label: "2", date: "2026-10-02", outside: true },
    { label: "3", date: "2026-10-03", outside: true }
  ];
  const eventDates = new Set(dashboardSeed.calendarItems.map(i => i.date));
  const agenda = dashboardSeed.calendarItems
    .slice()
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  return `<div class="calendar-card">
    <div class="calendar-head"><span>Calendar</span><strong>September 2026</strong></div>
    <div class="mini-calendar">
      ${["S","M","T","W","T","F","S"].map(d => `<b>${d}</b>`).join("")}
      ${cells.map(cell => `<span class="${cell.outside ? "outside " : ""}${cell.date === dashboardToday ? "today" : ""}">${cell.label}${eventDates.has(cell.date) ? "<i></i>" : ""}</span>`).join("")}
    </div>
    <div class="agenda-list">${agenda.map(item => `<div><time>${shortDate(item.date)}</time><p>${item.item}</p></div>`).join("")}</div>
  </div>`;
}

function arDetailRows() {
  return db.invoices
    .map(i => {
      const p = project(i.projectId);
      return { name: client(p.clientId).company, context: `${p.code} · due ${shortDate(i.due)}`, amount: i.amount - i.collected };
    })
    .filter(row => row.amount > 0)
    .sort((a,b) => b.amount - a.amount);
}

function apDetailRows() {
  return [
    { name: "BuildRight Fabrication", context: "Fabrication balance", amount: 320000 },
    { name: "ProAV Manila", context: "Technical supplier", amount: 290000 },
    { name: "Island Movers", context: "Logistics payable", amount: 210000 }
  ];
}

function ceoMoneyCard(label, value, hint, rows) {
  return `<div class="money-card">
    <span>${label}</span>
    <strong>${fmt(value)}</strong>
    <em>${hint}</em>
    <div class="money-detail-list">${rows.slice(0, 3).map(row => `<div><p>${row.name}<small>${row.context}</small></p><b>${fmt(row.amount)}</b></div>`).join("")}</div>
  </div>`;
}

function ceoTasksCard() {
  const tasks = actionCenterRows().slice(0, 4);
  return `<div class="task-card">
    <div class="rich-head"><span>Tasks</span><strong>${tasks.length} to review</strong></div>
    <div class="task-list">${tasks.map(task => `<div>
      <i class="${priorityRank(task.status) === 0 ? "hot" : ""}"></i>
      <p>${task.item}<small>${project(task.projectId).code} · ${task.due}</small></p>
    </div>`).join("")}</div>
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
  return map[id] ? `<button class="btn" data-view="${map[id]}">Open</button>` : "";
}

function roleIsManagement() {
  return /CEO|MANAGEMENT|COO|DIRECTOR|HEAD|FINANCE OFFICER|CONTROL/.test(state.role);
}

function myProjects() {
  const name = currentUser();
  if (roleIsManagement()) return db.projects.filter(p => !["LOST", "CLOSED"].includes(p.stage));
  if (state.role.includes("CLIENT") || state.role === "ACCOUNTS") return db.projects.filter(p => p.owner === name || p.owner === "Paolo Reyes");
  if (state.role.includes("EVENT") || state.role.includes("IMPLEMENTATION") || state.role.includes("OPERATIONS")) return db.projects.filter(p => p.implementationOwner === name || p.implementationOwner === "Lara Cruz");
  if (state.role.includes("CREATIVE") || state.role.includes("GRAPHIC") || state.role.includes("COPY") || state.role.includes("3D")) {
    const ids = dashboardSeed.creativeJobs.filter(j => j.owner === name || state.role.includes("LEAD") || state.role === "CREATIVE").map(j => j.projectId);
    return db.projects.filter(p => ids.includes(p.id));
  }
  if (state.role.includes("FIELD")) return db.projects.filter(p => db.releases.some(r => r.projectId === p.id && r.employee === "Marco Dela Paz"));
  return db.projects.filter(p => !["LOST", "CLOSED"].includes(p.stage)).slice(0, 3);
}

function relevantActivity() {
  const ids = myProjects().map(p => p.id);
  return db.activity.filter(a => roleIsManagement() || ids.includes(a.projectId)).slice().reverse();
}

function actionCenterRows() {
  const rows = [];
  db.approvals.filter(a => a.status === "Pending" && roleIsManagement()).forEach(a => rows.push({ projectId:a.projectId, item:a.type, owner:currentUser(), due:"Today", status:"Approval", next:"Approve, reject, or return" }));
  db.budgetRequests.filter(b => b.exception && (roleIsManagement() || b.requestor === currentUser())).forEach(b => rows.push({ projectId:b.projectId, item:`${b.category} request ${fmt(b.amount)}`, owner:b.requestor, due:b.dateRequired, status:b.status, next:"Resolve policy exception" }));
  dashboardSeed.creativeJobs.filter(j => j.owner === currentUser() && ["Overdue","Due today","For revision","Waiting"].includes(j.status)).forEach(j => rows.push({ projectId:j.projectId, item:j.deliverable, owner:j.owner, due:j.due, status:j.status, next:j.nextAction }));
  dashboardSeed.operationsTasks.filter(t => t.owner === currentUser() || state.role.includes("EVENT") || state.role.includes("COO")).forEach(t => rows.push({ projectId:t.projectId, item:t.type, owner:t.owner, due:t.due, status:t.status, next:t.nextAction }));
  dashboardSeed.clientActions.filter(a => a.owner === currentUser() || state.role.includes("ACCOUNTS")).forEach(a => rows.push({ projectId:a.projectId, item:a.action, owner:a.owner, due:a.due, status:a.status, next:a.nextAction }));
  db.liquidations.filter(l => (l.employee === currentUser() || state.role.includes("FINANCE")) && !/Cleared/i.test(l.status)).forEach(l => rows.push({ projectId:l.projectId, item:"Clear liquidation", owner:l.employee, due:l.due, status:l.status, next:l.findings ? "Resolve audit finding" : "Submit liquidation" }));
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
    if (m < settings.targetGrossMargin && (p.actualRevenue || p.expectedRevenue)) alerts.push({ alert:"Margin below company target", project:p.code, impact:`${Math.round(m*100)}% margin`, priority:"CRITICAL", action:"Review scope, cost, or commercial override", owner:p.owner });
    if (p.actualCost > p.estimatedCost && p.estimatedCost) alerts.push({ alert:"Project over budget", project:p.code, impact:fmt(p.actualCost - p.estimatedCost), priority:"AT RISK", action:"Review variance and CE impact", owner:p.implementationOwner });
  });
  db.liquidations.filter(l => /Under Audit|For Cash Return|For Reimbursement|Overdue/i.test(l.status) && agingDays(l.due) > 5).forEach(l => alerts.push({ alert:"Liquidation severely overdue", project:project(l.projectId).code, impact:fmt(l.released), priority:"CRITICAL", action:"Block new release or approve exception", owner:l.employee }));
  db.invoices.filter(i => arAging(i) !== "Current" && arAging(i) !== "Paid").forEach(i => alerts.push({ alert:"Collection overdue", project:project(i.projectId).code, impact:fmt(i.amount - i.collected), priority:"AT RISK", action:"Escalate collection support", owner:project(i.projectId).owner }));
  return alerts;
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
  if (["FOR BILLING", "BILLED", "COLLECTION", "CLOSURE", "CLOSED"].includes(p.stage)) return "For Closure/Collection";
  return "For Pitch/Bidding";
}

function breakDate(p) {
  return p.pitchDate || p.liveDate || p.created;
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

function yearOnYearRevenue() {
  const years = Object.keys(dashboardSeed.monthlyRevenue);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const rows = years.map(year => ({
    year,
    total: fmt(dashboardSeed.monthlyRevenue[year].reduce((s,n)=>s+n,0)),
    monthlyInput: dashboardSeed.monthlyRevenue[year].map(n => n ? Math.round(n / 1000) : 0).join(", ")
  }));
  const latestYear = years[years.length - 1];
  const previousYear = years[years.length - 2];
  const latestTotal = dashboardSeed.monthlyRevenue[latestYear].reduce((s,n)=>s+n,0);
  const previousTotal = dashboardSeed.monthlyRevenue[previousYear].reduce((s,n)=>s+n,0);
  const growth = previousTotal ? Math.round(((latestTotal - previousTotal) / previousTotal) * 100) : 0;
  return `<div class="revenue-compare">
    <div class="revenue-side">
      ${mini("Latest year", latestYear)}
      ${mini("YTD / full-year total", fmt(latestTotal))}
      ${mini("Growth vs previous year", `${growth}%`)}
      <div class="upload-panel"><p>Monthly input is shown in thousands. Production version can make these editable per month and per year.</p></div>
      ${simpleTable(rows, ["year","total","monthlyInput"])}
    </div>
    <div class="revenue-chart">${lineChart("Revenue per Month by Year", years.map((year, index) => ({ label:year, values:dashboardSeed.monthlyRevenue[year], color:["#6bb7ff","#65d590","#ffc85a"][index] })), months)}</div>
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
  return Object.entries(groupCount(dashboardSeed.creativeJobs, "owner")).map(([label, value]) => ({ label, value, color: value >= 5 ? "risk" : value >= 3 ? "warn" : "good" }));
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
  const events = db.projects.filter(p => daysUntil(p.liveDate) >= 0 && daysUntil(p.liveDate) <= 14).map(p => ({ date:p.liveDate, project:p.code, type:"Live date", owner:p.implementationOwner, status:chip(health(p)[0], health(p)[1]) }));
  const ops = dashboardSeed.operationsTasks.filter(t => daysUntil(t.due) <= 14).map(t => ({ date:t.due, project:project(t.projectId).code, type:t.type, owner:t.owner, status:chip(t.status) }));
  const liqs = db.liquidations.filter(l => !/Cleared/i.test(l.status)).map(l => ({ date:l.due, project:project(l.projectId).code, type:"Liquidation due", owner:l.employee, status:chip(l.status) }));
  return events.concat(ops, liqs).sort((a,b) => a.date.localeCompare(b.date));
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
    .filter(b => b.exception)
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
      <button class="btn" data-view="Approvals">Open approvals</button>
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
      <button class="btn primary" data-project="${row.projectId}">Review in 360</button>
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

function creativeTable(rows) {
  const mapped = rows.map(j => ({
    project: `<button class="linkbtn" data-project="${j.projectId}">${project(j.projectId).code}</button>`,
    deliverable: j.deliverable,
    owner: j.owner,
    priority: chip(j.priority, j.priority === "Critical" ? "risk" : j.priority === "High" ? "warn" : "active"),
    deadline: j.due,
    status: chip(j.status),
    revisionRound: j.round,
    waitingOn: j.waitingOn,
    nextAction: j.nextAction
  }));
  return simpleTable(mapped, ["project","deliverable","owner","priority","deadline","status","revisionRound","waitingOn","nextAction"]);
}

const views = {
  Dashboard() {
    return renderRoleDashboard();
  },
  Projects() {
    const lanes = [
      { label: "For Pitch/Bidding", key: "pitch", projects: db.projects.filter(p => projectBucket(p) === "For Pitch/Bidding") },
      { label: "On-Going", key: "ongoing", projects: db.projects.filter(p => projectBucket(p) === "On-Going") },
      { label: "For Closure/Collection", key: "closure", projects: db.projects.filter(p => projectBucket(p) === "For Closure/Collection") }
    ];
    return `
      <div class="toolbar"><div><h2>Project Master</h2><p>Every legitimate opportunity receives a permanent Project ID.</p></div><button class="btn primary" id="newProject">＋ New project</button></div>
      <div class="kanban project-buckets">${lanes.map(l => `<div class="lane"><h4>${l.label}</h4>${mini("Projects", l.projects.length)}${mini("Total value", fmt(l.projects.reduce((s,p)=>s+p.value,0)))}<div class="project-stack">${l.projects.sort((a,b) => breakDate(a).localeCompare(breakDate(b))).map(projectDisclosureCard).join("") || `<div class="empty">No projects</div>`}</div></div>`).join("")}</div>
      <div class="section card"><h3>For Pitch/Bidding</h3>${projectTable(db.projects.filter(p => projectBucket(p) === "For Pitch/Bidding").sort((a,b)=>breakDate(a).localeCompare(breakDate(b))))}</div>
      <div class="section card"><h3>On-Going</h3>${projectTable(db.projects.filter(p => projectBucket(p) === "On-Going").sort((a,b)=>breakDate(a).localeCompare(breakDate(b))))}</div>
      <div class="section card"><h3>For Closure/Collection</h3>${projectTable(db.projects.filter(p => projectBucket(p) === "For Closure/Collection").sort((a,b)=>breakDate(a).localeCompare(breakDate(b))))}</div>`;
  },
  "Project 360"() {
    const p = project(state.selectedProjectId);
    const c = client(p.clientId);
    const h = health(p);
    const tabButtons = ["Overview","Brief","CE","Budget Requests","Fund Releases","Liquidations","Suppliers","Billing","Post-Audit","Closure"].concat(state.role === "SUPER ADMIN / CEO" ? ["Activity"] : []);
    return `
      <div class="detail-head">
        <div><h2>${p.code} · ${p.name}</h2><div class="meta"><span>${c.company}</span><span>${c.brand}</span><span>${p.owner}</span><span>${p.service}</span><span>Live: ${p.liveDate}</span></div></div>
        <div>${chip(p.stage, statusClass(p.stage))} ${chip(h[0], h[1])}</div>
        <div class="kpis" style="grid-column:1/-1">
          ${mini("Pitch Presentation Date", p.pitchDate || "TBD")}
          ${mini("Date Awarded", p.awardedDate || "Not yet awarded")}
          ${mini("Event Date", p.liveDate)}
          ${mini("Event Venue", p.venue)}
        </div>
      </div>
      <div class="tabs">${tabButtons.map(t => `<button class="${state.tab === t ? "active" : ""}" data-tab="${t}">${t}</button>`).join("")}</div>
      ${projectTab(p)}
    `;
  },
  Clients() {
    return `<div class="toolbar"><div><h2>Client Master Database</h2><p>Canonical company records with business unit, brand, contacts, projects, and AR.</p></div></div>
      <div class="grid cols-3">${db.clients.map(c => {
        const ps = db.projects.filter(p => p.clientId === c.id);
        const ar = db.invoices.filter(i => ps.some(p => p.id === i.projectId)).reduce((s,i) => s + i.amount - i.collected, 0);
        return `<div class="card"><h3>${c.company}</h3>${chip(c.status, "good")}<p>${c.unit} · ${c.brand}</p>${mini("Relationship owner", c.owner)}${mini("Total projects", ps.length)}${mini("Historical awarded value", fmt(ps.reduce((s,p)=>s+p.approvedCe,0)))}${mini("Outstanding AR", fmt(ar))}<h4>Contacts</h4>${db.contacts.filter(x => x.clientId === c.id).map(x => `<p><b>${x.name}</b><br><small>${x.type} · ${x.mobile}<br>${x.email}<br>Birthday: ${x.birthday || "TBD"}</small></p>`).join("")}</div>`;
      }).join("")}</div>`;
  },
  Finance() {
    const rec = reconcile(state.selectedProjectId);
    return `<div class="toolbar"><div><h2>Project Economics</h2><p>Revenue, billing, collection, released cash, liquidated cost, and AR stay separate.</p></div></div>
      <div class="grid cols-4">${metric("Approved Budget", fmt(rec.approved), "Current CE baseline", "Project 360")}${metric("Requested", fmt(rec.requested), "CRP submitted", "Project 360")}${metric("Released", fmt(rec.released), "Cash deployed", "Project 360")}${metric("Actual Cost", fmt(rec.actual), "Validated liquidation cost", "Project 360")}</div>
      <div class="section split"><div class="card"><h3>CE → CRP → Liquidation Reconciliation</h3>${reconciliationTable()}</div><div class="card"><h3>Accounts Receivable Aging</h3>${invoiceTable()}</div></div>`;
  },
  Liquidations() {
    const open = db.liquidations.filter(l => !/Cleared/i.test(l.status));
    const underAudit = db.liquidations.filter(l => /Under Audit/i.test(l.status)).reduce((s,l)=>s+l.liquidated,0);
    const forReturn = db.liquidations.filter(l => /For Cash Return/i.test(l.status)).reduce((s,l)=>s+l.returned,0);
    const forReimbursement = db.liquidations.filter(l => /For Reimbursement/i.test(l.status)).reduce((s,l)=>s+l.reimbursable,0);
    return `<div class="toolbar"><div><h2>Liquidation Control</h2><p>No liquidation, no new release is a configurable policy with management override.</p></div></div>
      <div class="grid cols-4">${metric("Overdue Liquidations", open.filter(l=>agingDays(l.due)>0).length, "Blocks new cash advances", "Liquidations")}${metric("Amount Under Audit", fmt(underAudit), "Corrections pending", "Liquidations")}${metric("Amount for Return", fmt(forReturn), "Cash to be returned", "Liquidations")}${metric("Amount for Reimbursement", fmt(forReimbursement), "Pay after audit clearance", "Liquidations")}</div>
      <div class="section card"><h3>Employee Cash Advances</h3>${liquidationTable()}</div>`;
  },
  Suppliers() {
    return `<div class="toolbar"><div><h2>Supplier Intelligence</h2><p>Reusable supplier records prioritize history, reliability, quality, spend, and project context.</p></div></div>
      <div class="grid cols-3">${db.suppliers.map(s => `<div class="card"><h3>${s.name}</h3>${chip(s.status, s.status === "Preferred" ? "good" : "warn")}<p>${s.category} · ${s.contact}</p>${mini("Amount spent", fmt(s.spent))}${mini("Quality", `${s.quality}/5`)}${mini("Reliability", `${s.reliability}/5`)}<p>${s.notes}</p></div>`).join("")}</div>`;
  },
  Approvals() {
    const overrides = [
      ...db.budgetRequests.filter(b=>b.exception).map(b => ({ type:"CRP Override", projectId:b.projectId, owner:b.requestor, amount:b.amount, reason:b.reason, status:b.status })),
      ...db.liquidations.filter(l=>/For Cash Return|For Reimbursement/i.test(l.status)).map(l => ({ type:"Liquidation Override", projectId:l.projectId, owner:l.employee, amount:l.released, reason:l.findings || l.status, status:l.status }))
    ];
    return `<div class="toolbar"><div><h2>Approval Queues</h2><p>Segregated review for finance validation, implementation validation, management approval, and policy overrides.</p></div></div>
      <div class="split"><div class="card"><h3>CE Approvals</h3>${approvalTable()}</div><div class="card"><h3>CRP Override / Liquidation Override</h3>${overrides.map(o => `<div class="notice" style="margin-bottom:10px">${chip(o.type)} ${chip(o.status)}<p><b>${project(o.projectId).code}</b><br>${o.owner} · ${fmt(o.amount)}<br>${o.reason}</p><button class="btn primary">Approve override</button></div>`).join("")}</div></div>`;
  },
  Search() {
    const q = state.search.toLowerCase();
    const results = searchResults(q);
    return `<div class="toolbar"><div><h2>Global Search</h2><p>Search across project codes, project names, clients, brands, suppliers, invoices, CEs, and employees.</p></div></div>
      <div class="card">${results.length ? `<table><thead><tr><th>Type</th><th>Record</th><th>Context</th><th></th></tr></thead><tbody>${results.map(r => `<tr><td>${r.type}</td><td><b>${r.name}</b></td><td>${r.context}</td><td>${r.projectId ? `<button class="btn" data-project="${r.projectId}">Open</button>` : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Type in the search bar to find records.</div>`}</div>`;
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
      ${mini("Breakdate", breakDate(p))}
      ${mini("Account Manager", p.owner)}
      ${mini("Production Owner", p.implementationOwner)}
      ${mini("Creative Owner", p.creativeOwner)}
      ${mini("Event Date", p.liveDate)}
      <button class="btn" data-project="${p.id}">Open 360</button>
    </div>` : ""}
  </article>`;
}
function projectTable(projects) {
  return `<table><thead><tr><th>Project</th><th>Client</th><th>Owner</th><th>Stage</th><th>Value</th><th>Health</th></tr></thead><tbody>${projects.map(p => `<tr class="clickable" data-project="${p.id}"><td><b>${p.code}</b><br>${p.name}</td><td>${client(p.clientId).company}<br><small>${client(p.clientId).brand}</small></td><td>${p.owner}</td><td>${chip(p.stage)}</td><td class="money">${fmt(p.value)}</td><td>${chip(health(p)[0], health(p)[1])}</td></tr>`).join("")}</tbody></table>`;
}
function activityItem(a) { return `<div class="event"><time>${a.at}</time><div><b>${a.action}</b><br><span>${a.user}: ${a.comment}</span></div></div>`; }
function projectTab(p) {
  const c = client(p.clientId);
  const tab = state.tab;
  if (tab === "Overview") return `<div class="split"><div class="card"><h3>Essential Details</h3><div class="grid cols-3">${mini("Pitch Presentation Date", p.pitchDate || "TBD")}${mini("Date Awarded", p.awardedDate || "Not yet awarded")}${mini("Event Date", p.liveDate)}${mini("Event Venue", p.venue)}${mini("Total Project Budget", fmt(p.totalBudget))}${sensitiveProjectFinancials(p)}</div><h3>What is happening</h3><p>${p.brief}</p><div class="progress"><span style="width:${Math.round((stageIndex(p)+1)/stages.length*100)}%"></span></div><p>${stageIndex(p)+1} of ${stages.length} lifecycle steps complete.</p></div><div class="card"><h3>Client Context</h3>${mini("Company", c.company)}${mini("Business Unit", c.unit)}${mini("Brand", c.brand)}${mini("Payment Terms", `${c.paymentTerms} days`)}</div></div>`;
  if (tab === "Brief") return `<div class="card"><h3>Brief</h3><p>${p.brief}</p></div>`;
  if (tab === "CE") return `<div class="card"><h3>Cost Estimate Uploads</h3><div class="upload-panel"><button class="btn primary">Upload CE .xlsx</button><button class="btn">Upload Addendum CE</button><p>Each uploaded workbook is stored as a new version. Approved versions remain downloadable and cannot be overwritten.</p></div>${ceTable(p.id)}</div>`;
  if (tab === "Budget Requests") return `<div class="card"><h3>CRP Uploads and Parsed Line Items</h3><div class="upload-panel"><button class="btn primary">Upload CRP .xlsx</button><p>System reads uploaded CRP workbooks and identifies request lines by person, category, amount, and project.</p></div>${budgetTable(p.id)}</div>`;
  if (tab === "Fund Releases") return `<div class="card"><h3>Fund Releases</h3><div class="notice"><b>Control note:</b> Manual entry should require workflow approval and audit trail. Bank SOA uploads can be reconciled to approved releases using amount, date, recipient, and reference number so unrelated bank lines do not get mixed into the project ledger.</div>${releaseTable(p.id)}</div>`;
  if (tab === "Liquidations") return `<div class="card"><h3>Liquidations</h3>${liquidationTable(p.id)}</div>`;
  if (tab === "Suppliers") return `<div class="card"><h3>Project Suppliers</h3>${projectSupplierTable(p.id)}</div>`;
  if (tab === "Billing") return `<div class="card"><h3>Billing & Collection</h3><div class="upload-panel"><button class="btn primary">Generate Billing</button><p>Billing can be generated from the signed CE, PO details, client payment terms, and project billing rules.</p></div>${invoiceTable(p.id)}</div>`;
  if (tab === "Post-Audit") return `<div class="card"><h3>Post-Audit Report</h3><div class="upload-panel"><button class="btn primary">Upload Post-Audit Report</button><p>For MVP, the report file is stored against the project and summarized for management review.</p></div>${postAudit(p.id)}</div>`;
  if (tab === "Closure") return closureView(p.id);
  if (tab === "Activity") return `<div class="card"><h3>Audit Trail</h3><div class="timeline">${db.activity.filter(a=>a.projectId===p.id).map(activityItem).join("")}</div></div>`;
}
function ceTable(projectId) {
  const rows = db.ceVersions.filter(c => c.projectId === projectId);
  return simpleTable(rows.map(c => ({ version:c.version, file:`<button class="linkbtn">${c.file}</button>`, type:c.addendum ? chip("Addendum CE","warn") : chip("Base CE","active"), grossAmount:fmt(c.revenue), subTotal:fmt(c.subTotal), asf:fmt(c.asf), status:chip(c.status) })), ["version","file","type","grossAmount","subTotal","asf","status"]);
}
function ceLinesTable(projectId) {
  const ceIds = db.ceVersions.filter(c => c.projectId === projectId).map(c => c.id);
  return simpleTable(db.ceLines.filter(l => ceIds.includes(l.ceId)).map(l => ({ category:l.category, description:l.description, supplier:l.supplier || "TBD", supplierCost:fmt(l.unitCost), sellingPrice:fmt(l.selling) })), ["category","description","supplier","supplierCost","sellingPrice"]);
}
function budgetTable(projectId) {
  return simpleTable(db.budgetRequests.filter(b => !projectId || b.projectId === projectId).map(b => ({ project:project(b.projectId).code, holder:b.holder, requestor:b.requestor, category:b.category, amount:fmt(b.amount), status:chip(b.status), exception:b.exception ? chip("Exception") : "No" })), projectId ? ["holder","requestor","category","amount","status","exception"] : ["project","holder","requestor","category","amount","status","exception"]);
}
function releaseTable(projectId) {
  return simpleTable(db.releases.filter(r => r.projectId === projectId).map(r => ({ id:r.id, employee:r.employee, payee:r.payee, amount:fmt(r.amount), date:r.date, mode:r.mode, status:chip(r.status) })), ["id","employee","payee","amount","date","mode","status"]);
}
function liquidationTable(projectId) {
  const rows = db.liquidations.filter(l => !projectId || l.projectId === projectId).sort((a,b) => agingDays(b.due) - agingDays(a.due)).map(l => ({ project:project(l.projectId).code, employee:l.employee, released:fmt(l.released), liquidated:fmt(l.liquidated), returned:fmt(l.returned), reimbursable:fmt(l.reimbursable), due:l.due, aging:`${agingDays(l.due)} days`, balance:fmt(Math.max(0,l.released-l.liquidated-l.returned)), status:chip(l.status), findings:l.findings || "None" }));
  return simpleTable(rows, ["project","employee","released","liquidated","returned","reimbursable","due","aging","balance","status","findings"]);
}
function invoiceTable(projectId) {
  const rows = db.invoices.filter(i => !projectId || i.projectId === projectId).map(i => ({ project:project(i.projectId).code, invoice:i.invoiceNo, amount:fmt(i.amount), collected:fmt(i.collected), outstanding:fmt(i.amount-i.collected), due:i.due, aging:chip(arAging(i)), status:chip(i.status) }));
  return simpleTable(rows, ["project","invoice","amount","collected","outstanding","due","aging","status"]);
}
function approvalTable() {
  return simpleTable(db.approvals.map(a => ({ project:project(a.projectId).code, type:a.type, approver:a.approver, status:chip(a.status), timestamp:a.at || "Waiting", comments:a.comments })), ["project","type","approver","status","timestamp","comments"]);
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
  return {
    approved: p.approvedCe || p.estimatedCost,
    requested: db.budgetRequests.filter(b=>b.projectId===projectId).reduce((s,b)=>s+b.amount,0),
    released: db.releases.filter(r=>r.projectId===projectId).reduce((s,r)=>s+r.amount,0),
    actual: projectCost(p)
  };
}
function postAudit(projectId) {
  const a = db.postAudits.find(x => x.projectId === projectId);
  if (!a) return `<div class="empty">No post-audit submitted yet.</div>`;
  return `${mini("Uploaded report", "2026-UNILAB-0001_Post-Audit.pdf")}${mini("Primary causes of variance", a.varianceCause)}${mini("What worked", a.worked)}${mini("What failed", a.failed)}${mini("Repeat", a.repeat)}${mini("Never again", a.never)}`;
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
  db.projects.forEach(p => { const c = client(p.clientId); if ([p.code,p.name,c.company,c.brand,p.owner,p.implementationOwner].join(" ").toLowerCase().includes(q)) rows.push({ type:"Project", name:`${p.code} · ${p.name}`, context:`${c.company} · ${p.stage}`, projectId:p.id }); });
  db.suppliers.forEach(s => { if ([s.name,s.category,s.contact].join(" ").toLowerCase().includes(q)) rows.push({ type:"Supplier", name:s.name, context:`${s.category} · ${s.status}` }); });
  db.invoices.forEach(i => { if ([i.invoiceNo,project(i.projectId).code].join(" ").toLowerCase().includes(q)) rows.push({ type:"Invoice", name:i.invoiceNo, context:`${fmt(i.amount)} · ${i.status}`, projectId:i.projectId }); });
  db.ceVersions.forEach(c => { if ([c.id,c.version,c.status,project(c.projectId).code].join(" ").toLowerCase().includes(q)) rows.push({ type:"CE", name:`${project(c.projectId).code} ${c.version}`, context:`${fmt(c.revenue)} · ${c.status}`, projectId:c.projectId }); });
  return rows;
}
function bind() {
  document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => { state.view = b.dataset.view; render(); }));
  document.querySelectorAll("[data-project]").forEach(b => b.addEventListener("click", () => { state.selectedProjectId = b.dataset.project; state.view = "Project 360"; state.tab = "Overview"; render(); }));
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
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => { state.tab = b.dataset.tab; render(); }));
  document.getElementById("roleSelect").addEventListener("change", e => { state.role = e.target.value; render(); });
  document.getElementById("globalSearch").addEventListener("input", e => { state.search = e.target.value; });
  document.getElementById("globalSearch").addEventListener("keydown", e => {
    if (e.key === "Enter" && state.search.trim().length > 1) {
      state.view = "Search";
      render();
    }
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
  const newProject = document.getElementById("newProject");
  if (newProject) newProject.addEventListener("click", () => {
    const next = String(db.projects.length + 1).padStart(4, "0");
    db.projects.unshift({ id: `p${Date.now()}`, code: `2026-DEMO-${next}`, name: "New Spotlight Opportunity", clientId: "c1", owner: currentUser(), implementationOwner: "Unassigned", service: "Other", opportunity: "Pitch", competingAgencies: 0, stage: "LEAD", status: "Active", value: 0, approvedCe: 0, expectedRevenue: 0, estimatedCost: 0, actualRevenue: 0, actualCost: 0, liveDate: "2026-09-30", location: "Metro Manila", provincial: false, created: "2026-09-01" });
    db.activity.unshift({ projectId: db.projects[0].id, at: "2026-09-01 23:05", user: currentUser(), action: "Project created", from: "", to: "LEAD", comment: "Project code generated from configurable pattern." });
    state.selectedProjectId = db.projects[0].id; state.view = "Project 360"; render();
  });
}

render();
